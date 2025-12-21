from rest_framework import viewsets, permissions, generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from django.db import transaction, IntegrityError
from django.db.models import Sum, Count
from django.utils import timezone
from decimal import Decimal
from django.conf import settings
from django.core.mail import send_mail

# --- PDF (REPORTLAB) ---
from django.http import HttpResponse
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch

# Auth & Google
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    Producto, Categoria, Inventario, Sucursal, Pedido, DetallePedido, 
    Usuario, Direccion, CarritoItem, Recomendacion, Cliente
)
from .serializers import (
    ProductoSerializer, CategoriaSerializer, InventarioSerializer,
    PedidoSerializer, AdminPedidoSerializer, GestionUsuarioSerializer,
    DireccionSerializer, HistoricalInventarioSerializer, CarritoItemSerializer,
    RecomendacionSerializer, SucursalSerializer, ClienteSerializer,
    RegistroUsuarioSerializer, ChangePasswordSerializer, UserDetailSerializer
)
from .permissions import IsAdminOrReadOnly

# ==========================
# 1. AUTENTICACIÓN & USUARIOS
# ==========================

class RegistroView(generics.CreateAPIView):
    serializer_class = RegistroUsuarioSerializer
    permission_classes = [permissions.AllowAny]

class GoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        token = request.data.get('token')
        if not token: return Response({'error': 'Falta token'}, status=400)
        try:
            id_info = id_token.verify_oauth2_token(token, google_requests.Request())
            email = id_info['email']
            user, created = Usuario.objects.get_or_create(username=email, defaults={
                'email': email, 'first_name': id_info.get('given_name',''), 
                'rol': 'VENDEDOR', 'is_active': True 
            })
            if created: user.set_unusable_password(); user.save()
            refresh = RefreshToken.for_user(user)
            refresh['username'] = user.username; refresh['rol'] = user.rol
            return Response({'refresh': str(refresh), 'access': str(refresh.access_token), 'user': {'username': user.username, 'rol': user.rol}})
        except ValueError: return Response({'error': 'Token inválido'}, status=400)

class UserMeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_object(self): return self.request.user

class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()
            return Response({"message": "Contraseña actualizada."}, status=200)
        return Response(serializer.errors, status=400)

class ActivateAccountView(APIView):
    permission_classes = [permissions.AllowAny]
    def get(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = Usuario.objects.get(pk=uid)
        except: user = None
        if user and default_token_generator.check_token(user, token):
            user.is_active = True; user.save()
            return Response({"message": "Cuenta activada."}, status=200)
        return Response({"error": "Token inválido."}, status=400)

# ==========================
# 2. CORE (CRUDs)
# ==========================

class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all().order_by('nombre')
    serializer_class = ClienteSerializer
    permission_classes = [permissions.IsAuthenticated]

class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all().order_by('-date_joined')
    serializer_class = GestionUsuarioSerializer
    permission_classes = [permissions.IsAdminUser]

class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.select_related('categoria').all().order_by('nombre')
    serializer_class = ProductoSerializer
    permission_classes = [IsAdminOrReadOnly]

class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [IsAdminOrReadOnly]

class SucursalViewSet(viewsets.ModelViewSet):
    queryset = Sucursal.objects.all()
    serializer_class = SucursalSerializer

class InventarioViewSet(viewsets.ModelViewSet):
    queryset = Inventario.objects.select_related('producto', 'sucursal').all()
    serializer_class = InventarioSerializer
    permission_classes = [permissions.IsAdminUser]

class DireccionViewSet(viewsets.ModelViewSet):
    serializer_class = DireccionSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self): 
        return Direccion.objects.all()

# ==========================
# 3. PEDIDOS Y VENTAS
# ==========================

class AdminPedidoViewSet(viewsets.ModelViewSet):
    queryset = Pedido.objects.select_related('cliente', 'vendedor', 'sucursal').prefetch_related('detalles__producto').all().order_by('-fecha_pedido')
    serializer_class = AdminPedidoSerializer
    permission_classes = [permissions.IsAdminUser]
    
    def perform_update(self, serializer):
        serializer.save()

class VentaMostradorView(APIView):
    permission_classes = [permissions.IsAdminUser]
    def post(self, request):
        try:
            sucursal = request.user.sucursal or Sucursal.objects.first()
            if not sucursal: return Response({'error': 'Sin sucursal asignada'}, 400)

            metodo = request.data.get('metodo_pago', 'EFECTIVO')
            
            # --- CORRECCIÓN CRÍTICA DE CRÉDITO ---
            # Si es crédito, el monto recibido DEBE ser 0 para que se genere deuda.
            if metodo == 'CREDITO':
                recibido = 0
            else:
                # Si es efectivo o tarjeta, asumimos pago completo o lo que mande el frontend
                recibido = request.data.get('monto_recibido', 0)

            cliente_id = request.data.get('cliente_id')
            
            # Buscar Cliente Real o Usar Genérico
            if cliente_id:
                cliente = Cliente.objects.get(id=cliente_id)
            else:
                cliente, _ = Cliente.objects.get_or_create(nombre='Cliente Mostrador', defaults={'ruc':'0000'})

            with transaction.atomic():
                pedido = Pedido.objects.create(
                    cliente=cliente, sucursal=sucursal, estado='ENTREGADO', 
                    total=0, vendedor=request.user, metodo_pago=metodo, monto_recibido=recibido
                )
                
                items = request.data.get('items', [])
                subtotal = 0; detalles = []
                
                for i in items:
                    inv = Inventario.objects.select_for_update().get(producto_id=i['id'], sucursal_id=sucursal.id)
                    cant = int(i['cantidad'])
                    if inv.cantidad < cant: raise IntegrityError(f"Sin stock: {inv.producto.nombre}")
                    
                    inv.cantidad -= cant; inv.save()
                    detalles.append(DetallePedido(pedido=pedido, producto=inv.producto, cantidad=cant, precio_unitario=inv.producto.precio))
                    subtotal += (inv.producto.precio * cant)
                
                total = subtotal * Decimal('1.15') # IVA 15%
                DetallePedido.objects.bulk_create(detalles)
                pedido.total = total
                
                # REGLA DE NEGOCIO:
                # Si es CREDITO, el estado nace como PENDIENTE para que cuente como deuda.
                if metodo == 'CREDITO':
                    pedido.estado = 'PENDIENTE'
                
                pedido.save()
                
                return Response({'pedido_id': pedido.id}, 201)
        except Exception as e: return Response({'error': str(e)}, 400)

class CheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request):
        return Response({"message": "Funcionalidad Web en mantenimiento por reestructuración"}, 200)

# ==========================
# 4. REPORTES Y DASHBOARD
# ==========================

@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def reporte_ventas(request):
    hoy = timezone.now().date()
    total = Pedido.objects.filter(estado='PAGADO').aggregate(Sum('total'))['total__sum'] or 0
    conteo = Pedido.objects.filter(estado='PAGADO').count()
    vencidas = Pedido.objects.filter(estado='PENDIENTE', fecha_vencimiento__lt=hoy).count()
    return Response({'total_ventas': total, 'pedidos_procesados': conteo, 'facturas_vencidas': vencidas})

class ReporteVendedoresView(APIView):
    permission_classes = [permissions.IsAdminUser]
    def get(self, request):
        rep = Pedido.objects.filter(estado__in=['PAGADO', 'ENTREGADO']).values('vendedor__username').annotate(total=Sum('total'), pedidos=Count('id')).order_by('-total')
        return Response(rep)

class CorteCajaView(APIView):
    permission_classes = [permissions.IsAdminUser]
    def get(self, request):
        hoy = timezone.now()
        vtas = Pedido.objects.filter(
            vendedor=request.user, 
            fecha_pedido__date=hoy.date(), 
            estado__in=['ENTREGADO', 'PAGADO']
        )
        res = vtas.aggregate(total=Sum('total'), count=Count('id'))
        detalles = vtas.values('id', 'fecha_pedido', 'total', 'metodo_pago').order_by('-fecha_pedido')
        return Response({
            "vendedor": request.user.username,
            "fecha": hoy.strftime("%d/%m/%Y"),
            "total_vendido": res['total'] or 0.00,
            "transacciones": res['count'] or 0,
            "detalles": list(detalles)
        })

class MonitorPedidosView(APIView):
    permission_classes = [permissions.IsAdminUser]
    def get(self, request):
        last = Pedido.objects.last()
        pend = Pedido.objects.filter(estado='PENDIENTE').count()
        return Response({"ultimo_id": last.id if last else 0, "pendientes": pend})

class AlertasStockBajoView(generics.ListAPIView):
    serializer_class = InventarioSerializer
    permission_classes = [permissions.IsAdminUser]
    def get_queryset(self): return Inventario.objects.filter(cantidad__lte=10).order_by('cantidad')

class HistorialInventarioView(generics.ListAPIView):
    serializer_class = HistoricalInventarioSerializer
    permission_classes = [permissions.IsAdminUser]
    def get_queryset(self):
        return Inventario.history.select_related('history_user', 'producto', 'sucursal').defer('producto__descripcion').all().order_by('-history_date')[:50]

# ==========================
# 5. PDF Y EXTRAS
# ==========================

class FacturaPDFView(APIView):
    """
    Genera un PDF usando ReportLab
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pedido_id):
        try:
            pedido = Pedido.objects.get(pk=pedido_id)
            detalles = DetallePedido.objects.filter(pedido=pedido)
        except Pedido.DoesNotExist:
            return HttpResponse("Pedido no encontrado", status=404)

        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        # Encabezado
        p.setFont("Helvetica-Bold", 18)
        p.drawString(1 * inch, height - 1 * inch, "FERRETERÍA EL SHADAY")
        
        p.setFont("Helvetica", 10)
        p.drawString(1 * inch, height - 1.25 * inch, f"Sucursal: {pedido.sucursal.nombre}")
        p.drawString(1 * inch, height - 1.4 * inch, f"Dirección: {pedido.sucursal.direccion}")
        p.drawString(1 * inch, height - 1.55 * inch, "RUC: J031000000000")

        # Datos Factura
        p.setFont("Helvetica-Bold", 12)
        p.drawRightString(7.5 * inch, height - 1 * inch, f"FACTURA N° {pedido.id}")
        p.setFont("Helvetica", 10)
        p.drawRightString(7.5 * inch, height - 1.2 * inch, f"Fecha: {pedido.fecha_pedido.strftime('%d/%m/%Y %H:%M')}")
        p.drawRightString(7.5 * inch, height - 1.35 * inch, f"Vendedor: {pedido.vendedor.username if pedido.vendedor else 'Sistema'}")

        # Cliente
        p.line(1 * inch, height - 1.7 * inch, 7.5 * inch, height - 1.7 * inch)
        p.setFont("Helvetica-Bold", 10)
        p.drawString(1 * inch, height - 1.9 * inch, "CLIENTE:")
        
        p.setFont("Helvetica", 10)
        cliente_nom = pedido.cliente.nombre if pedido.cliente else "Cliente General"
        cliente_ruc = pedido.cliente.ruc if pedido.cliente and pedido.cliente.ruc else "N/A"
        
        p.drawString(1.8 * inch, height - 1.9 * inch, cliente_nom)
        p.drawString(5 * inch, height - 1.9 * inch, f"RUC/Cédula: {cliente_ruc}")
        
        # Tabla
        y = height - 2.3 * inch
        p.setFillColorRGB(0.9, 0.9, 0.9)
        p.rect(1 * inch, y - 5, 6.5 * inch, 15, fill=1, stroke=0)
        p.setFillColorRGB(0, 0, 0)
        
        p.setFont("Helvetica-Bold", 9)
        p.drawString(1.1 * inch, y, "CANT")
        p.drawString(1.8 * inch, y, "DESCRIPCIÓN")
        p.drawString(5.0 * inch, y, "PRECIO UNIT")
        p.drawString(6.5 * inch, y, "SUBTOTAL")
        
        y -= 20
        p.setFont("Helvetica", 9)

        for item in detalles:
            nombre = item.producto.nombre[:45]
            sub = item.cantidad * item.precio_unitario
            
            p.drawString(1.2 * inch, y, str(item.cantidad))
            p.drawString(1.8 * inch, y, nombre)
            p.drawString(5.0 * inch, y, f"C$ {item.precio_unitario:.2f}")
            p.drawString(6.5 * inch, y, f"C$ {sub:.2f}")
            y -= 15
            
            if y < 1 * inch:
                p.showPage()
                y = height - 1 * inch

        # Totales
        p.line(1 * inch, y - 5, 7.5 * inch, y - 5)
        y -= 25
        
        total_final = pedido.total
        subtotal_calc = total_final / Decimal('1.15')
        iva_calc = total_final - subtotal_calc

        p.setFont("Helvetica-Bold", 10)
        p.drawRightString(6.0 * inch, y, "SUBTOTAL:")
        p.drawRightString(7.5 * inch, y, f"C$ {subtotal_calc:.2f}")
        y -= 15
        p.drawRightString(6.0 * inch, y, "IVA (15%):")
        p.drawRightString(7.5 * inch, y, f"C$ {iva_calc:.2f}")
        y -= 15
        p.setFont("Helvetica-Bold", 12)
        p.drawRightString(6.0 * inch, y, "TOTAL:")
        p.drawRightString(7.5 * inch, y, f"C$ {total_final:.2f}")

        y -= 40
        p.setFont("Helvetica-Oblique", 9)
        p.drawString(1 * inch, y, f"Método de Pago: {pedido.metodo_pago}")
        
        p.setFont("Helvetica", 8)
        p.drawCentredString(width / 2, 0.5 * inch, "Gracias por su compra en Ferretería El Shaday - ¡Dios le bendiga!")

        p.showPage()
        p.save()

        buffer.seek(0)
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="factura_{pedido.id}.pdf"'
        return response

class CarritoViewSet(viewsets.ModelViewSet):
    serializer_class = CarritoItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self): return CarritoItem.objects.filter(usuario=self.request.user)

class RecomendacionesList(generics.ListAPIView):
    serializer_class = RecomendacionSerializer
    def get_queryset(self):
        pid = self.kwargs.get('producto_id')
        return Recomendacion.objects.filter(producto_base_id=pid).order_by('-score')

class HistorialPedidosView(generics.ListAPIView):
    serializer_class = PedidoSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self): return Pedido.objects.none()

class CancelarPedidoView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request, pedido_id):
        try:
            p = Pedido.objects.get(id=pedido_id)
            if p.estado == 'PENDIENTE':
                p.estado = 'CANCELADO'
                p.save()
                return Response({'status': 'Cancelado'})
            return Response({'error': 'No se puede cancelar'}, 400)
        except: return Response({'error': 'No encontrado'}, 404)

# VISTA DE ABONO
class RegistrarAbonoView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        cliente_id = request.data.get('cliente_id')
        monto_abono = Decimal(request.data.get('monto', 0))

        if monto_abono <= 0:
            return Response({'error': 'El monto debe ser mayor a 0'}, status=400)

        try:
            cliente = Cliente.objects.get(id=cliente_id)
            # Buscar facturas pendientes ordenadas por fecha (FIFO)
            pendientes = Pedido.objects.filter(cliente=cliente, estado='PENDIENTE').order_by('fecha_pedido')

            if not pendientes.exists():
                return Response({'error': 'Este cliente no tiene deuda pendiente.'}, status=400)

            abonado_total = 0
            saldo_restante = monto_abono

            with transaction.atomic():
                for pedido in pendientes:
                    if saldo_restante <= 0:
                        break

                    deuda_pedido = pedido.total - pedido.monto_recibido
                    
                    if saldo_restante >= deuda_pedido:
                        # Paga completo
                        pedido.monto_recibido += deuda_pedido
                        pedido.estado = 'PAGADO'
                        pedido.save()
                        saldo_restante -= deuda_pedido
                        abonado_total += deuda_pedido
                    else:
                        # Abono parcial
                        pedido.monto_recibido += saldo_restante
                        pedido.save()
                        abonado_total += saldo_restante
                        saldo_restante = 0

                cambio = monto_abono - abonado_total

            return Response({
                'mensaje': 'Abono registrado correctamente',
                'monto_aplicado': abonado_total,
                'cambio_devuelto': cambio,
                'nueva_deuda': cliente.deuda_actual
            })

        except Cliente.DoesNotExist:
            return Response({'error': 'Cliente no encontrado'}, 404)
        except Exception as e:
            return Response({'error': str(e)}, 400)