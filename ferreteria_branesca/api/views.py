from rest_framework import viewsets, permissions, generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action,api_view, permission_classes
from django.db import transaction, IntegrityError
from django.core.mail import send_mail
from django.db.models import Sum, Count
from datetime import datetime
from decouple import config
from decimal import Decimal
from rest_framework.permissions import IsAdminUser
from django.utils import timezone


# --- PDF ---
from django.http import HttpResponse
from xhtml2pdf import pisa

# --- Auth & Tokens ---
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from rest_framework_simplejwt.tokens import RefreshToken
# Corrección de zona horaria
from django.utils import timezone 

from .models import (
    Producto, Categoria, Inventario, 
    Sucursal, Pedido, DetallePedido, Usuario, Direccion, CarritoItem, Recomendacion
)
from .serializers import (
    ProductoSerializer, CategoriaSerializer, InventarioSerializer,
    RegistroUsuarioSerializer, PedidoSerializer, AdminPedidoSerializer,
    UserDetailSerializer, GestionUsuarioSerializer, DireccionSerializer,
    HistoricalInventarioSerializer, CarritoItemSerializer, RecomendacionSerializer,
    ChangePasswordSerializer, SucursalSerializer
)
from .permissions import IsAdminOrReadOnly
from django_filters.rest_framework import DjangoFilterBackend

# ==========================
# 1. AUTENTICACIÓN
# ==========================

class RegistroView(generics.CreateAPIView):
    serializer_class = RegistroUsuarioSerializer
    permission_classes = [permissions.AllowAny]
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save(is_active=False)
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        link = f"http://localhost:3000/activar/{uid}/{token}"
        try: send_mail('Activa tu cuenta', f'Link: {link}', config('EMAIL_USER'), [user.email], fail_silently=False)
        except: pass
        return Response({"message": "Usuario creado. Revisa tu correo."}, status=status.HTTP_201_CREATED)

class ActivateAccountView(APIView):
    permission_classes = [permissions.AllowAny]
    def get(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = Usuario.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, Usuario.DoesNotExist):
            user = None

        if user is not None and default_token_generator.check_token(user, token):
            user.is_active = True
            user.save()
            return Response({"message": "Cuenta activada exitosamente."}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Enlace inválido o expirado."}, status=status.HTTP_400_BAD_REQUEST)

class GoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        token = request.data.get('token')
        if not token: return Response({'error': 'Falta token'}, status=400)
        try:
            id_info = id_token.verify_oauth2_token(token, google_requests.Request())
            email = id_info['email']
            user, created = Usuario.objects.get_or_create(username=email, defaults={
                'email': email, 'first_name': id_info.get('given_name',''), 'last_name': id_info.get('family_name',''), 'rol': 'CLIENTE', 'is_active': True
            })
            if created: user.set_unusable_password(); user.save()
            refresh = RefreshToken.for_user(user)
            refresh['username'] = user.username; refresh['rol'] = user.rol; refresh['is_staff'] = user.is_staff
            return Response({'refresh': str(refresh), 'access': str(refresh.access_token), 'user': {'username': user.username, 'email': user.email, 'rol': user.rol}})
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
            return Response({"message": "Contraseña actualizada."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ==========================
# 2. CATÁLOGO Y TIENDA
# ==========================

class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all().order_by('nombre')
    serializer_class = CategoriaSerializer
    permission_classes = [IsAdminOrReadOnly]

class ProductoViewSet(viewsets.ModelViewSet):
    # select_related('categoria') evita una consulta extra por cada producto
    queryset = Producto.objects.select_related('categoria').all().order_by('nombre')
    serializer_class = ProductoSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

class RecomendacionesList(generics.ListAPIView):
    serializer_class = RecomendacionSerializer
    permission_classes = [permissions.AllowAny]
    def get_queryset(self):
        return Recomendacion.objects.filter(producto_base_id=self.kwargs['producto_id']).order_by('-score')

class SucursalViewSet(viewsets.ModelViewSet):
    queryset = Sucursal.objects.all()
    serializer_class = SucursalSerializer
    permission_classes = [IsAdminOrReadOnly] # Público para el selector

class DireccionViewSet(viewsets.ModelViewSet):
    serializer_class = DireccionSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self): return Direccion.objects.filter(usuario=self.request.user)

class CarritoViewSet(viewsets.ModelViewSet):
    serializer_class = CarritoItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self): return CarritoItem.objects.filter(usuario=self.request.user).order_by('creado_en')
    
    def perform_create(self, serializer): serializer.save(usuario=self.request.user)
    
    @action(detail=False, methods=['post'])
    def sincronizar(self, request):
        items_local = request.data.get('items', [])
        if not isinstance(items_local, list): return Response({"error": "Formato inválido"}, 400)
        for item in items_local:
            prod_id = item.get('id'); cant = item.get('cantidad')
            if not prod_id or not cant: continue
            try:
                if not Producto.objects.filter(id=prod_id).exists(): continue
                obj, created = CarritoItem.objects.get_or_create(
                    usuario=request.user, producto_id=prod_id, defaults={'cantidad': cant}
                )
                if not created: obj.cantidad = cant; obj.save()
            except: continue
        return Response(self.get_serializer(CarritoItem.objects.filter(usuario=request.user), many=True).data)

class CheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request, *args, **kwargs):
        sucursal_id = request.data.get('sucursal_id')
        direccion_id = request.data.get('direccion_id')
        items_data = request.data.get('items')
        transaction_id = request.data.get('transaction_id', None)

        if not items_data or not direccion_id: return Response({"error": "Faltan datos."}, 400)
        try:
            sucursal = Sucursal.objects.get(id=sucursal_id)
            direccion = Direccion.objects.get(id=direccion_id, usuario=request.user)
        except: return Response({"error": "Datos inválidos."}, 404)

        try:
            with transaction.atomic():
                pedido = Pedido.objects.create(
                    cliente=request.user, sucursal=sucursal, direccion_envio=direccion, 
                    estado=Pedido.EstadoPedido.PAGADO, total=0,
                    transaction_id=transaction_id, metodo_pago='PAYPAL'
                )
                detalles = []; subtotal = 0
                for item in items_data:
                    inv = Inventario.objects.select_for_update().get(producto_id=item.get('producto_id'), sucursal_id=sucursal_id)
                    cant = int(item.get('cantidad'))
                    if inv.cantidad < cant: raise IntegrityError(f"Sin stock: {inv.producto.nombre}")
                    inv.cantidad -= cant; inv.save()
                    det = DetallePedido(pedido=pedido, producto=inv.producto, cantidad=cant, precio_unitario=inv.producto.precio)
                    detalles.append(det); subtotal += (inv.producto.precio * cant)
                
                iva = subtotal * Decimal('0.15')
                total = subtotal + iva
                
                DetallePedido.objects.bulk_create(detalles); pedido.total = total; pedido.save()
                try: send_mail(f'Pedido #{pedido.id}', f'Total: ${total}', config('EMAIL_USER'), [request.user.email], fail_silently=True)
                except: pass
                return Response(PedidoSerializer(pedido).data, 201)
        except Exception as e: return Response({"error": str(e)}, 400)

class CancelarPedidoView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request, pedido_id):
        try:
            pedido = Pedido.objects.get(id=pedido_id, cliente=request.user)
            if pedido.estado not in ['PAGADO', 'PENDIENTE']: return Response({"error": "No cancelable."}, 400)
            with transaction.atomic():
                pedido.estado = 'CANCELADO'; pedido.save()
                for d in DetallePedido.objects.filter(pedido=pedido):
                    try: inv = Inventario.objects.select_for_update().get(producto=d.producto, sucursal=pedido.sucursal); inv.cantidad += d.cantidad; inv.save()
                    except: pass
                return Response({"message": "Cancelado."}, 200)
        except: return Response({"error": "No encontrado."}, 404)

class HistorialPedidosView(generics.ListAPIView):
    serializer_class = PedidoSerializer; permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self): return Pedido.objects.filter(cliente=self.request.user).order_by('-fecha_pedido')

# ==========================
# 3. ADMINISTRACIÓN & POS
# ==========================


class InventarioViewSet(viewsets.ModelViewSet):
    queryset = Inventario.objects.select_related('producto', 'sucursal').all().order_by('producto__nombre')
    serializer_class = InventarioSerializer
    permission_classes = [permissions.IsAdminUser]
class AdminPedidoViewSet(viewsets.ModelViewSet):
    # Trae cliente, vendedor, sucursal, dirección Y los detalles del producto de un solo golpe
    queryset = Pedido.objects.select_related(
        'cliente', 'vendedor', 'sucursal', 'direccion_envio'
    ).prefetch_related(
        'detalles__producto'
    ).all().order_by('-fecha_pedido')
    
    serializer_class = AdminPedidoSerializer
    permission_classes = [permissions.IsAdminUser]
class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all().order_by('-date_joined'); serializer_class = GestionUsuarioSerializer; permission_classes = [permissions.IsAdminUser]
class HistorialInventarioView(generics.ListAPIView):
    serializer_class = HistoricalInventarioSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        return Inventario.history.select_related(
            'history_user', 'producto', 'sucursal'
        ).defer(
            'producto__descripcion', 'producto__imagen', 'sucursal__direccion'
        ).all().order_by('-history_date')[:50]
class AlertasStockBajoView(generics.ListAPIView):
    serializer_class = InventarioSerializer; permission_classes = [permissions.IsAdminUser]
    def get_queryset(self): return Inventario.objects.filter(cantidad__lte=10).order_by('cantidad')
class ReporteVentasView(APIView):
    permission_classes = [permissions.IsAdminUser]
    def get(self, request):
        res = Pedido.objects.filter(estado__in=['PAGADO', 'ENTREGADO']).aggregate(total=Sum('total'), count=Count('id'))
        return Response({'total_ventas': res['total'] or 0, 'pedidos_procesados': res['count'] or 0})
class ReporteVendedoresView(APIView):
    permission_classes = [permissions.IsAdminUser]
    def get(self, request):
        inicio = request.query_params.get('inicio', '2024-01-01'); fin = request.query_params.get('fin', timezone.now().strftime('%Y-%m-%d'))
        rep = Pedido.objects.filter(fecha_pedido__range=[inicio, fin], estado__in=['PAGADO', 'ENTREGADO']).values('vendedor__username').annotate(total=Sum('total'), pedidos=Count('id')).order_by('-total')
        return Response([{'vendedor': r['vendedor__username'] or "Venta Web", 'total': r['total'], 'pedidos': r['pedidos']} for r in rep])
class MonitorPedidosView(APIView):
    permission_classes = [permissions.IsAdminUser]
    def get(self, request):
        last = Pedido.objects.last(); pend = Pedido.objects.filter(estado='PAGADO').count()
        return Response({"ultimo_id": last.id if last else 0, "pendientes": pend, "timestamp": timezone.now().isoformat()})

class VentaMostradorView(APIView):
    permission_classes = [permissions.IsAdminUser]
    def post(self, request):
        try:
            # Obtener sucursal del usuario o del request
            sucursal = request.user.sucursal
            if not sucursal: 
                 sucursal_id = request.data.get('sucursal_id', 14)
                 try: sucursal = Sucursal.objects.get(id=sucursal_id)
                 except: sucursal = Sucursal.objects.first()
            
            # Datos del pago
            metodo = request.data.get('metodo_pago', 'EFECTIVO')
            recibido = request.data.get('monto_recibido', 0)

            cliente, _ = Usuario.objects.get_or_create(username='cliente_mostrador', defaults={'rol':'CLIENTE'})
            
            with transaction.atomic():
                pedido = Pedido.objects.create(
                    cliente=cliente, 
                    sucursal=sucursal, 
                    estado='ENTREGADO', 
                    total=0, 
                    vendedor=request.user, 
                    metodo_pago=metodo,
                    monto_recibido=recibido # <-- Guardamos lo que pagó
                )
                
                items = request.data.get('items')
                subtotal = 0
                detalles = []
                
                for i in items:
                    inv = Inventario.objects.select_for_update().get(producto_id=i['id'], sucursal_id=sucursal.id)
                    if inv.cantidad < int(i['cantidad']): raise IntegrityError(f"Sin stock: {inv.producto.nombre}")
                    inv.cantidad -= int(i['cantidad'])
                    inv.save()
                    detalles.append(DetallePedido(pedido=pedido, producto=inv.producto, cantidad=i['cantidad'], precio_unitario=inv.producto.precio))
                    subtotal += (inv.producto.precio * int(i['cantidad']))
                
                iva = subtotal * Decimal('0.15')
                total = subtotal + iva
                
                DetallePedido.objects.bulk_create(detalles)
                pedido.total = total
                pedido.save()
                
                return Response({'pedido_id': pedido.id}, 201)
        except Exception as e: return Response({'error': str(e)}, 400)

class CorteCajaView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        hoy = timezone.now()
        hoy_inicio = hoy.replace(hour=0, minute=0, second=0, microsecond=0)
        hoy_fin = hoy.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        vtas = Pedido.objects.filter(
            vendedor=request.user, 
            fecha_pedido__range=[hoy_inicio, hoy_fin], 
            estado__in=['ENTREGADO', 'PAGADO']
        )
        res = vtas.aggregate(total=Sum('total'), count=Count('id'))
        detalles = vtas.values('id', 'fecha_pedido', 'total', 'estado').order_by('-fecha_pedido')
        
        return Response({
            "vendedor": request.user.username,
            "fecha": hoy.strftime("%d/%m/%Y"),
            "total_vendido": res['total'] or 0.00,
            "total_transacciones": res['count'] or 0,
            "detalles": list(detalles)
        })

# --- FACTURA PDF (DISEÑO AZUL) ---
class FacturaPDFView(APIView):
    # 1. PERMISO: Permitimos entrar a cualquier usuario logueado (Cliente o Admin)
    permission_classes = [permissions.IsAuthenticated] 

    def get(self, request, pedido_id):
        try:
            p = Pedido.objects.get(id=pedido_id)
            
            # 2. SEGURIDAD: Verificamos si el usuario tiene derecho a ver esta factura
            # (Es Staff O es el Cliente dueño del pedido)
            if not request.user.is_staff and p.cliente != request.user:
                return Response({'error': 'No tienes permiso para ver esta factura.'}, status=403)

            detalles = DetallePedido.objects.filter(pedido=p)
            
            # Cálculos
            total_pagar = p.total
            subtotal = total_pagar / Decimal('1.15')
            iva = total_pagar - subtotal
            
            # Formatos de datos
            fecha = p.fecha_pedido.strftime('%d/%m/%Y')
            hora = p.fecha_pedido.strftime('%I:%M %p')
            
            # Datos dinámicos recuperados
            vendedor = p.vendedor.username if p.vendedor else "Venta Web"
            cliente_nombre = p.cliente.first_name + " " + p.cliente.last_name if p.cliente.first_name else p.cliente.username
            direccion = p.direccion_envio.direccion if p.direccion_envio else "Retiro en Sucursal"
            
            # Datos de pago (Recuperados de la actualización del POS)
            metodo = p.metodo_pago # EFECTIVO / TARJETA / PAYPAL
            ref = p.transaction_id if p.transaction_id else "N/A"

            html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    @page {{ size: letter; margin: 1.5cm; }}
                    body {{ font-family: Helvetica, sans-serif; color: #333; font-size: 11px; line-height: 1.4; }}
                    
                    /* Tablas Maestras */
                    table {{ width: 100%; border-collapse: collapse; }}
                    
                    /* Header Azul Sólido */
                    .header-cell {{
                        background-color: #1a3c6e;
                        color: #ffffff;
                        padding: 15px;
                        vertical-align: middle;
                    }}
                    
                    .empresa {{ font-size: 18px; font-weight: bold; text-transform: uppercase; }}
                    .subtitulo {{ font-size: 10px; color: #e0e0e0; margin-top: 4px; }}
                    
                    .factura-titulo {{ font-size: 24px; font-weight: bold; text-align: right; color: #f39c12; }}
                    .factura-num {{ font-size: 12px; text-align: right; color: #ffffff; margin-top: 5px; }}
                    
                    /* Secciones de Info */
                    .section-title {{ 
                        font-weight: bold; 
                        color: #1a3c6e; 
                        border-bottom: 2px solid #1a3c6e; 
                        margin-top: 20px; 
                        margin-bottom: 5px;
                        padding-bottom: 3px;
                        font-size: 12px;
                        text-transform: uppercase;
                    }}
                    
                    .info-cell {{ padding: 5px 0; vertical-align: top; }}
                    .label {{ font-weight: bold; color: #555; }}
                    
                    /* Tabla de Productos */
                    .prod-table {{ margin-top: 15px; border: 1px solid #ccc; }}
                    .prod-header {{ background-color: #f2f2f2; color: #333; font-weight: bold; padding: 8px; border-bottom: 1px solid #ccc; }}
                    .prod-cell {{ padding: 8px; border-bottom: 1px solid #eee; }}
                    
                    /* Totales */
                    .total-table {{ width: 40%; margin-left: 60%; margin-top: 15px; }}
                    .total-row td {{ padding: 4px 10px; text-align: right; }}
                    .total-final {{ 
                        background-color: #1a3c6e; 
                        color: white; 
                        font-weight: bold; 
                        font-size: 13px; 
                        padding: 8px 10px;
                    }}
                    
                    /* Footer */
                    .footer {{ 
                        position: fixed; bottom: 0; left: 0; right: 0; 
                        text-align: center; font-size: 9px; color: #999; 
                        border-top: 1px solid #ddd; padding-top: 10px; 
                    }}
                </style>
            </head>
            <body>
            
                <table class="header-table">
                    <tr>
                        <td class="header-cell" width="60%">
                            <div class="empresa">FERRETERÍA BRANESCA</div>
                            <div class="subtitulo">
                                RUC: J0310000000000<br/>
                                Managua, Nicaragua | Tel: 2278-5555<br/>
                                ventas@branesca.com.ni
                            </div>
                        </td>
                        <td class="header-cell" width="40%" align="right">
                            <div class="factura-titulo">FACTURA</div>
                            <div class="factura-num">Nº {p.id:08d}</div>
                        </td>
                    </tr>
                </table>

                <table>
                    <tr>
                        <td width="48%" class="info-cell">
                            <div class="section-title">Cliente</div>
                            <span class="label">Nombre:</span> {cliente_nombre}<br/>
                            <span class="label">Email:</span> {p.cliente.email}<br/>
                            <span class="label">Dirección:</span> {direccion}
                        </td>
                        <td width="4%"></td>
                        <td width="48%" class="info-cell">
                            <div class="section-title">Detalles de Orden</div>
                            <span class="label">Fecha:</span> {fecha} {hora}<br/>
                            <span class="label">Vendedor:</span> {vendedor}<br/>
                            <span class="label">Método Pago:</span> {metodo} <br/>
                            <span class="label">Ref/Transacción:</span> {ref}
                        </td>
                    </tr>
                </table>

                <table class="prod-table" cellspacing="0">
                    <thead>
                        <tr>
                            <th class="prod-header" width="50%" align="left">Descripción</th>
                            <th class="prod-header" width="10%" align="center">Cant</th>
                            <th class="prod-header" width="20%" align="right">Precio</th>
                            <th class="prod-header" width="20%" align="right">Importe</th>
                        </tr>
                    </thead>
                    <tbody>
            """
            
            for d in detalles:
                importe = d.cantidad * d.precio_unitario
                html += f"""
                <tr>
                    <td class="prod-cell">{d.producto.nombre}<br/><span style="font-size:9px; color:#777;">SKU: {d.producto.sku}</span></td>
                    <td class="prod-cell" align="center">{d.cantidad}</td>
                    <td class="prod-cell" align="right">C$ {d.precio_unitario:.2f}</td>
                    <td class="prod-cell" align="right">C$ {importe:.2f}</td>
                </tr>
                """
                
            html += f"""
                    </tbody>
                </table>

                <table class="total-table" cellspacing="0">
                    <tr class="total-row">
                        <td><strong>Subtotal:</strong></td>
                        <td>C$ {subtotal:.2f}</td>
                    </tr>
                    <tr class="total-row">
                        <td><strong>IVA (15%):</strong></td>
                        <td>C$ {iva:.2f}</td>
                    </tr>
                    <tr>
                        <td colspan="2" class="total-final" align="right">
                            TOTAL A PAGAR: C$ {total_pagar:.2f}
                        </td>
                    </tr>
                </table>
                
                <div style="margin-top: 30px; font-size: 10px; color: #555;">
                    <strong>Condiciones:</strong>
                    <br/>• Se aceptan cambios por defectos de fábrica dentro de los 30 días posteriores a la compra.
                    <br/>• Es indispensable presentar esta factura original.
                </div>

                <div class="footer">
                    Gracias por su compra - Ferretería Branesca<br/>
                    Documento generado electrónicamente
                </div>

            </body>
            </html>
            """
            
            res = HttpResponse(content_type='application/pdf')
            res['Content-Disposition'] = f'attachment; filename="Factura_{p.id}.pdf"'
            pisa.CreatePDF(html, dest=res)
            return res

        except Exception as e:
            return Response({'error': str(e)}, 404)

@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def reporte_ventas(request):
    hoy = timezone.now().date()
    
    total = Pedido.objects.filter(estado='PAGADO').aggregate(Sum('total'))['total__sum'] or 0
    conteo = Pedido.objects.filter(estado='PAGADO').count()
    
    vencidas = Pedido.objects.filter(estado='PENDIENTE', fecha_vencimiento__lt=hoy).count()
    
    return Response({
        'total_ventas': total, 
        'pedidos_procesados': conteo,
        'facturas_vencidas': vencidas 
    })