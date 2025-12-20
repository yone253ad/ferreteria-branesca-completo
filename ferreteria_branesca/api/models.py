from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator, MinValueValidator
from simple_history.models import HistoricalRecords
from decimal import Decimal 
from datetime import timedelta, date
from django.db.models import Sum

# --- Validadores ---
solo_letras = RegexValidator(r'^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$', 'Solo se permiten letras y espacios.')
solo_numeros = RegexValidator(r'^\d+$', 'Solo se permiten números.')

# 1. Sucursal
class Sucursal(models.Model):
    nombre = models.CharField(max_length=150)
    direccion = models.TextField()
    def __str__(self): return self.nombre

# 2. Usuario (SOLO EMPLEADOS - LOGIN)
class Usuario(AbstractUser):
    class Rol(models.TextChoices):
        ADMIN = 'ADMIN', 'Administrador'
        VENDEDOR = 'VENDEDOR', 'Vendedor'
        GERENTE = 'GERENTE', 'Gerente'
        # Eliminamos 'CLIENTE' de aquí porque ahora tienen su propia tabla

    rol = models.CharField(max_length=10, choices=Rol.choices, default=Rol.VENDEDOR)
    sucursal = models.ForeignKey('Sucursal', on_delete=models.SET_NULL, null=True, blank=True)
    
    def __str__(self): return self.username

# 3. Cliente (CARTERA COMERCIAL)
class Cliente(models.Model):
    nombre = models.CharField(max_length=200, verbose_name="Nombre o Razón Social")
    ruc = models.CharField(max_length=20, blank=True, null=True, verbose_name="RUC/Cédula")
    telefono = models.CharField(max_length=20, blank=True, null=True)
    direccion = models.TextField(blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    
    # Datos Financieros
    limite_credito = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    dias_credito = models.PositiveIntegerField(default=0, verbose_name="Días de Plazo")
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self): return f"{self.nombre} ({self.ruc or 'S/R'})"

    @property
    def deuda_actual(self):
        total = self.pedido_set.filter(estado='PENDIENTE').aggregate(Sum('total'))['total__sum']
        return total or 0.00

# 4. Direccion (Vinculada a Cliente ahora)
class Direccion(models.Model):
    cliente = models.ForeignKey(Cliente, related_name='direcciones', on_delete=models.CASCADE)
    nombre_completo = models.CharField(max_length=200, validators=[solo_letras])
    direccion = models.TextField()
    ciudad = models.CharField(max_length=100)
    departamento = models.CharField(max_length=100)
    telefono = models.CharField(max_length=20)
    def __str__(self): return f"{self.direccion}, {self.ciudad}"

# 5. Categoria
class Categoria(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True, null=True)
    def __str__(self): return self.nombre

# 6. Producto
class Producto(models.Model):
    sku = models.CharField(max_length=50, unique=True)
    nombre = models.CharField(max_length=255)
    descripcion = models.TextField()
    precio = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    categoria = models.ForeignKey(Categoria, related_name='productos', on_delete=models.SET_NULL, null=True, blank=True)
    imagen = models.ImageField(upload_to='productos/', null=True, blank=True)
    history = HistoricalRecords()
    
    def save(self, *args, **kwargs):
        self.sku = self.sku.upper()
        super().save(*args, **kwargs)
    def __str__(self): return f"{self.nombre} ({self.sku})"

# 7. Inventario
class Inventario(models.Model):
    producto = models.ForeignKey(Producto, related_name='inventarios', on_delete=models.CASCADE)
    sucursal = models.ForeignKey(Sucursal, related_name='inventarios', on_delete=models.CASCADE)
    cantidad = models.PositiveIntegerField(default=0)
    history = HistoricalRecords()
    class Meta: unique_together = ('producto', 'sucursal')
    def __str__(self): return f"{self.producto.nombre} en {self.sucursal.nombre}: {self.cantidad}"

# 8. Pedido
class Pedido(models.Model):
    class EstadoPedido(models.TextChoices):
        PENDIENTE = 'PENDIENTE', 'Pendiente de Pago'
        PAGADO = 'PAGADO', 'Pagado'
        EN_PROCESO = 'EN_PROCESO', 'En Proceso'
        ENTREGADO = 'ENTREGADO', 'Entregado'
        CANCELADO = 'CANCELADO', 'Cancelado'
        DEVOLUCION = 'DEVOLUCION', 'Devolución'
    
    # RELACIÓN CORRECTA: Apunta a Cliente
    cliente = models.ForeignKey(Cliente, related_name='pedidos', on_delete=models.SET_NULL, null=True, blank=True)
    # Vendedor sigue siendo Usuario (el empleado)
    vendedor = models.ForeignKey(Usuario, related_name='ventas_realizadas', on_delete=models.SET_NULL, null=True, blank=True)
    
    sucursal = models.ForeignKey(Sucursal, on_delete=models.SET_NULL, null=True, blank=True)
    direccion_envio = models.TextField(blank=True, null=True)
    
    # Fechas
    fecha_pedido = models.DateTimeField(auto_now_add=True)
    fecha_vencimiento = models.DateField(null=True, blank=True)
    
    # Financiero
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    monto_recibido = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    tasa_mora = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, verbose_name="Tasa Mora %")
    
    estado = models.CharField(max_length=15, choices=EstadoPedido.choices, default=EstadoPedido.PENDIENTE)
    metodo_pago = models.CharField(max_length=50, default='EFECTIVO')
    transaction_id = models.CharField(max_length=100, null=True, blank=True)
    
    history = HistoricalRecords()

    def save(self, *args, **kwargs):
        # Calculamos vencimiento basado en el CLIENTE (no usuario)
        if not self.id and self.cliente and self.cliente.dias_credito > 0:
            self.fecha_vencimiento = date.today() + timedelta(days=self.cliente.dias_credito)
        super().save(*args, **kwargs)

    @property
    def total_con_mora(self):
        if self.estado == 'PENDIENTE' and self.fecha_vencimiento and self.fecha_vencimiento < date.today():
            multa = self.total * (self.tasa_mora / 100)
            return self.total + multa
        return self.total

# 9. DetallePedido
class DetallePedido(models.Model):
    pedido = models.ForeignKey(Pedido, related_name='detalles', on_delete=models.CASCADE)
    producto = models.ForeignKey(Producto, related_name='detalles_pedido', on_delete=models.PROTECT)
    cantidad = models.PositiveIntegerField(default=1)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    class Meta: unique_together = ('pedido', 'producto')
    def __str__(self): return f"{self.cantidad} x {self.producto.nombre}"

# 10. CarritoItem (RECUPERADO)
class CarritoItem(models.Model):
    usuario = models.ForeignKey(Usuario, related_name='carrito', on_delete=models.CASCADE)
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    cantidad = models.PositiveIntegerField(default=1)
    creado_en = models.DateTimeField(auto_now_add=True)
    class Meta: unique_together = ('usuario', 'producto')
    def __str__(self): return f"{self.usuario.username} - {self.producto.nombre}"

# 11. Recomendacion (RECUPERADO)
class Recomendacion(models.Model):
    producto_base = models.ForeignKey(Producto, related_name='recomendaciones_base', on_delete=models.CASCADE)
    producto_recomendado = models.ForeignKey(Producto, related_name='recomendaciones_sugeridas', on_delete=models.CASCADE)
    score = models.FloatField(default=0.0)
    class Meta: unique_together = ('producto_base', 'producto_recomendado'); ordering = ['-score']
    def __str__(self): return f"{self.producto_base.nombre} -> {self.producto_recomendado.nombre}"