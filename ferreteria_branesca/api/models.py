from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator, MinValueValidator
from simple_history.models import HistoricalRecords
from decimal import Decimal 
from datetime import timedelta, date

# --- Validadores ---
solo_letras = RegexValidator(r'^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$', 'Solo se permiten letras y espacios.')
solo_numeros = RegexValidator(r'^\d+$', 'Solo se permiten números.')

# 1. Sucursal
class Sucursal(models.Model):
    nombre = models.CharField(max_length=150)
    direccion = models.TextField()
    def __str__(self): return self.nombre

# 2. Usuario
class Usuario(AbstractUser):
    class Rol(models.TextChoices):
        ADMIN = 'ADMIN', 'Administrador'
        CLIENTE = 'CLIENTE', 'Cliente'
        VENDEDOR = 'VENDEDOR', 'Vendedor'
        GERENTE = 'GERENTE', 'Gerente'

    rol = models.CharField(max_length=10, choices=Rol.choices, default=Rol.CLIENTE)
    sucursal = models.ForeignKey('Sucursal', on_delete=models.SET_NULL, null=True, blank=True)
    limite_credito = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    dias_credito = models.PositiveIntegerField(default=0, verbose_name="Días de Plazo")
    
    def __str__(self): 
        return self.username

# 3. Direccion
class Direccion(models.Model):
    usuario = models.ForeignKey(Usuario, related_name='direcciones', on_delete=models.CASCADE)
    nombre_completo = models.CharField(max_length=200, validators=[solo_letras])
    direccion = models.TextField()
    ciudad = models.CharField(max_length=100, validators=[solo_letras])
    departamento = models.CharField(max_length=100, validators=[solo_letras])
    telefono = models.CharField(max_length=20, validators=[solo_numeros])
    def __str__(self): return f"{self.direccion}, {self.ciudad}"

# 4. Categoria
class Categoria(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True, null=True)
    def __str__(self): return self.nombre

# 5. Producto
class Producto(models.Model):
    sku = models.CharField(max_length=50, unique=True)
    nombre = models.CharField(max_length=255)
    descripcion = models.TextField()
    
    # --- CORRECCIÓN AQUÍ: Usamos Decimal('0.01') ---
    precio = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.01'))] 
    )
    # -----------------------------------------------
    
    categoria = models.ForeignKey(Categoria, related_name='productos', on_delete=models.SET_NULL, null=True, blank=True)
    imagen = models.ImageField(upload_to='productos/', null=True, blank=True)
    history = HistoricalRecords()
    def save(self, *args, **kwargs):
        self.sku = self.sku.upper()
        super().save(*args, **kwargs)
    def __str__(self): return f"{self.nombre} ({self.sku})"

# 6. Inventario
class Inventario(models.Model):
    producto = models.ForeignKey(Producto, related_name='inventarios', on_delete=models.CASCADE)
    sucursal = models.ForeignKey(Sucursal, related_name='inventarios', on_delete=models.CASCADE)
    cantidad = models.PositiveIntegerField(default=0)
    history = HistoricalRecords()
    class Meta: unique_together = ('producto', 'sucursal')
    def __str__(self): return f"{self.producto.nombre} en {self.sucursal.nombre}: {self.cantidad}"

# 7. Pedido
class Pedido(models.Model):
    class EstadoPedido(models.TextChoices):
        PENDIENTE = 'PENDIENTE', 'Pendiente de Pago'
        PAGADO = 'PAGADO', 'Pagado'
        EN_PROCESO = 'EN_PROCESO', 'En Proceso'
        ENTREGADO = 'ENTREGADO', 'Entregado'
        CANCELADO = 'CANCELADO', 'Cancelado'
        DEVOLUCION = 'DEVOLUCION', 'Devolución'
    
    cliente = models.ForeignKey(Usuario, related_name='pedidos', on_delete=models.SET_NULL, null=True)
    direccion_envio = models.ForeignKey(Direccion, on_delete=models.PROTECT, null=True, blank=True)
    vendedor = models.ForeignKey(Usuario, related_name='ventas_realizadas', on_delete=models.SET_NULL, null=True, blank=True)
    fecha_vencimiento = models.DateField(null=True, blank=True)
    tasa_mora = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, verbose_name="Tasa Mora %")
    
    # Campos financieros
    metodo_pago = models.CharField(max_length=50, default='PAYPAL') 
    transaction_id = models.CharField(max_length=100, null=True, blank=True)
    
    # --- NUEVO: Para el corte de caja y factura ---
    monto_recibido = models.DecimalField(max_digits=12, decimal_places=2, default=0.00) 
    # ---------------------------------------------

    fecha_pedido = models.DateTimeField(auto_now_add=True)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    estado = models.CharField(max_length=15, choices=EstadoPedido.choices, default=EstadoPedido.PENDIENTE)
    sucursal = models.ForeignKey(Sucursal, on_delete=models.SET_NULL, null=True, blank=True)
    
    history = HistoricalRecords()
    
    def __str__(self):
        return f"Pedido {self.id} ({self.estado})"
    
    def save(self, *args, **kwargs):
        # Al crear pedido (si no tiene ID), calculamos vencimiento automático
        if not self.id and self.cliente and self.cliente.dias_credito > 0:
            self.fecha_vencimiento = date.today() + timedelta(days=self.cliente.dias_credito)
        super().save(*args, **kwargs)
        
    @property
    def total_con_mora(self):
        from datetime import date
        # Si está vencido y pendiente, aplicamos la mora
        if self.estado == 'PENDIENTE' and self.fecha_vencimiento and self.fecha_vencimiento < date.today():
            multa = self.total * (self.tasa_mora / 100)
            return self.total + multa
        return self.total

# 8. DetallePedido
class DetallePedido(models.Model):
    pedido = models.ForeignKey(Pedido, related_name='detalles', on_delete=models.CASCADE)
    producto = models.ForeignKey(Producto, related_name='detalles_pedido', on_delete=models.PROTECT)
    cantidad = models.PositiveIntegerField(default=1)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    class Meta: unique_together = ('pedido', 'producto') 
    def __str__(self): return f"{self.cantidad} x {self.producto.nombre}"

# 9. CarritoItem
class CarritoItem(models.Model):
    usuario = models.ForeignKey(Usuario, related_name='carrito', on_delete=models.CASCADE)
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    cantidad = models.PositiveIntegerField(default=1)
    creado_en = models.DateTimeField(auto_now_add=True)
    class Meta: unique_together = ('usuario', 'producto')
    def __str__(self): return f"{self.usuario.username} - {self.producto.nombre}"

# 10. Recomendacion
class Recomendacion(models.Model):
    producto_base = models.ForeignKey(Producto, related_name='recomendaciones_base', on_delete=models.CASCADE)
    producto_recomendado = models.ForeignKey(Producto, related_name='recomendaciones_sugeridas', on_delete=models.CASCADE)
    score = models.FloatField(default=0.0)
    class Meta: unique_together = ('producto_base', 'producto_recomendado'); ordering = ['-score']
    def __str__(self): return f"{self.producto_base.nombre} -> {self.producto_recomendado.nombre}"