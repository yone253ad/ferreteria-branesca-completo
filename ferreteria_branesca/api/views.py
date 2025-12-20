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

# PDF
from django.http import HttpResponse
from xhtml2pdf import pisa

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
            # Creamos usuario si no existe (Rol Cliente por defecto, pero usuario de sistema)
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
        # Aquí hay un cambio: Las direcciones ahora son de Clientes, no de Usuarios.
        # Si quieres direcciones personales de empleados, ajusta el modelo.
        # Por ahora devolvemos todas para admin.
        return Direccion.objects.all()

# ==========================
# 3. PEDIDOS Y VENTAS
# ==========================

class AdminPedidoViewSet(viewsets.ModelViewSet):
    queryset = Pedido.objects.select_related('cliente', 'vendedor', 'sucursal').prefetch_related('detalles__producto').all().order_by('-fecha_pedido')
    serializer_class = AdminPedidoSerializer
    permission_classes = [permissions.IsAdminUser]
    
    def perform_update(self, serializer):
        # Lógica para recalcular totales si editan detalles se hace en el frontend y se envía aquí
        serializer.save()

class VentaMostradorView(APIView):
    permission_classes = [permissions.IsAdminUser]
    def post(self, request):
        try:
            sucursal = request.user.sucursal or Sucursal.objects.first()
            if not sucursal: return Response({'error': 'Sin sucursal asignada'}, 400)

            metodo = request.data.get('metodo_pago', 'EFECTIVO')
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
                pedido.total = total; pedido.save()
                
                return Response({'pedido_id': pedido.id}, 201)
        except Exception as e: return Response({'error': str(e)}, 400)

class CheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request):
        # Checkout online (Carrito) - Asumiendo que el usuario logueado es el cliente
        # IMPORTANTE: Si separaste usuarios de clientes, el usuario online debe tener un Cliente asociado
        # O simplificamos asumiendo que el pedido web es 'Pendiente' para revisar.
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
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request, pedido_id):
        try:
            p = Pedido.objects.get(id=pedido_id)
            detalles = DetallePedido.objects.filter(pedido=p)
            
            # Datos para Template
            total_pagar = p.total
            subtotal = total_pagar / Decimal('1.15')
            iva = total_pagar - subtotal
            cliente_nombre = p.cliente.nombre if p.cliente else "Mostrador"
            
            html = f"""
            <html>
            <head>
                <style>
                    body {{ font-family: Helvetica; font-size: 12px; }}
                    .header {{ background: #1a3c6e; color: white; padding: 10px; }}
                    table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
                    th {{ background: #eee; padding: 5px; text-align: left; }}
                    td {{ padding: 5px; border-bottom: 1px solid #ddd; }}
                    .total {{ text-align: right; font-weight: bold; margin-top: 20px; font-size: 14px; }}
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>FERRETERIA BRANESCA</h1>
                    <p>Factura #{p.id} | Fecha: {p.fecha_pedido.strftime('%d/%m/%Y')}</p>
                </div>
                <p><strong>Cliente:</strong> {cliente_nombre}</p>
                <p><strong>Vendedor:</strong> {p.vendedor.username if p.vendedor else 'Web'}</p>
                
                <table>
                    <tr><th>Producto</th><th>Cant</th><th>Precio</th><th>Subtotal</th></tr>
                    {''.join([f"<tr><td>{d.producto.nombre}</td><td>{d.cantidad}</td><td>{d.precio_unitario}</td><td>{d.cantidad*d.precio_unitario}</td></tr>" for d in detalles])}
                </table>
                
                <div class="total">
                    <p>Subtotal: C$ {subtotal:.2f}</p>
                    <p>IVA (15%): C$ {iva:.2f}</p>
                    <p>TOTAL: C$ {total_pagar:.2f}</p>
                </div>
            </body>
            </html>
            """
            res = HttpResponse(content_type='application/pdf')
            res['Content-Disposition'] = f'attachment; filename="Factura_{p.id}.pdf"'
            pisa.CreatePDF(html, dest=res)
            return res
        except Exception as e: return Response({'error': str(e)}, 400)

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
    # Aquí un usuario normal vería sus pedidos si tuviera Cliente asociado. 
    # Por ahora devolvemos vacío para evitar errores.
    def get_queryset(self): return Pedido.objects.none()

class CancelarPedidoView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request, pedido_id):
        # Lógica de cancelación simple
        try:
            p = Pedido.objects.get(id=pedido_id)
            if p.estado == 'PENDIENTE':
                p.estado = 'CANCELADO'
                p.save()
                return Response({'status': 'Cancelado'})
            return Response({'error': 'No se puede cancelar'}, 400)
        except: return Response({'error': 'No encontrado'}, 404)