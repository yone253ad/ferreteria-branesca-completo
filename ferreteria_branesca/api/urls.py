from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView, # Usamos la vista ESTÁNDAR (el settings.py hace la magia)
    TokenRefreshView,
)
from . import views

router = DefaultRouter()
router.register(r'productos', views.ProductoViewSet)
router.register(r'categorias', views.CategoriaViewSet)
router.register(r'direcciones', views.DireccionViewSet, basename='direcciones')
router.register(r'carrito', views.CarritoViewSet, basename='carrito')
router.register(r'inventario', views.InventarioViewSet, basename='inventario')
router.register(r'gestion-pedidos', views.AdminPedidoViewSet, basename='admin-pedidos')
router.register(r'gestion-usuarios', views.UsuarioViewSet, basename='gestion-usuarios')
router.register(r'sucursales', views.SucursalViewSet, basename='sucursales')

urlpatterns = [
    path('', include(router.urls)),
    
    # --- RUTAS DE AUTENTICACIÓN ---
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('registro/', views.RegistroView.as_view(), name='registro'),
    path('google-login/', views.GoogleLoginView.as_view(), name='google-login'),
    path('api/password_reset/', include('django_rest_passwordreset.urls', namespace='password_reset')),
    path('activar/<str:uidb64>/<str:token>/', views.ActivateAccountView.as_view(), name='activar-cuenta'),
    
    # Rutas de Cliente
    path('user/me/', views.UserMeView.as_view(), name='user-me'),
    path('user/change-password/', views.ChangePasswordView.as_view(), name='change-password'),
    path('checkout/', views.CheckoutView.as_view(), name='checkout'),
    path('historial-pedidos/', views.HistorialPedidosView.as_view(), name='historial-pedidos'),
    path('cancelar-pedido/<int:pedido_id>/', views.CancelarPedidoView.as_view(), name='cancelar-pedido'),
    path('recomendaciones/<int:producto_id>/', views.RecomendacionesList.as_view(), name='recomendaciones'),

    # Rutas de Admin
    path('alertas-stock/', views.AlertasStockBajoView.as_view(), name='alertas-stock'),
    path('reporte-ventas/', views.ReporteVentasView.as_view(), name='reporte-ventas'),
    path('reporte-vendedores/', views.ReporteVendedoresView.as_view(), name='reporte-vendedores'),
    path('venta-mostrador/', views.VentaMostradorView.as_view(), name='venta-mostrador'),
    path('corte-caja/', views.CorteCajaView.as_view(), name='corte-caja'),
    path('factura/<int:pedido_id>/', views.FacturaPDFView.as_view(), name='factura-pdf'),
    path('monitor-pedidos/', views.MonitorPedidosView.as_view(), name='monitor-pedidos'),
    path('auditoria-inventario/', views.HistorialInventarioView.as_view(), name='auditoria-inventario'),
]