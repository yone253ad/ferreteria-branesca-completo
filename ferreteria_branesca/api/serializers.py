from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import (
    Usuario, Producto, Categoria, Sucursal, 
    Inventario, Pedido, DetallePedido, Direccion, 
    CarritoItem, Recomendacion, Cliente
)

# --- 1. CONFIGURACIÓN ---
class SucursalSerializer(serializers.ModelSerializer):
    class Meta: model = Sucursal; fields = '__all__'

class CategoriaSerializer(serializers.ModelSerializer):
    class Meta: model = Categoria; fields = '__all__'

class DireccionSerializer(serializers.ModelSerializer):
    class Meta: model = Direccion; fields = '__all__'

# --- 2. PRODUCTOS E INVENTARIO ---
class ProductoSerializer(serializers.ModelSerializer):
    stock_disponible = serializers.SerializerMethodField()
    categoria_nombre = serializers.ReadOnlyField(source='categoria.nombre')

    class Meta: 
        model = Producto
        fields = ('id', 'sku', 'nombre', 'descripcion', 'precio', 'categoria', 'categoria_nombre', 'imagen', 'stock_disponible')
    
    def get_stock_disponible(self, obj):
        # Intenta obtener el stock de la sucursal del usuario o una por defecto
        request = self.context.get('request')
        try:
            if request and hasattr(request.user, 'sucursal') and request.user.sucursal:
                return obj.inventarios.get(sucursal=request.user.sucursal).cantidad
            return obj.inventarios.first().cantidad # Fallback
        except: return 0

class InventarioSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.ReadOnlyField(source='producto.nombre')
    sucursal_nombre = serializers.ReadOnlyField(source='sucursal.nombre')
    class Meta: model = Inventario; fields = '__all__'

class HistoricalInventarioSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.ReadOnlyField(source='instance.producto.nombre', default='-')
    sucursal_nombre = serializers.ReadOnlyField(source='instance.sucursal.nombre', default='-')
    usuario = serializers.ReadOnlyField(source='history_user.username', default='Sistema')
    fecha = serializers.DateTimeField(source='history_date', format="%d/%m/%Y %H:%M")
    class Meta:
        model = Inventario.history.model
        fields = ['history_id', 'fecha', 'usuario', 'history_type', 'producto_nombre', 'sucursal_nombre', 'cantidad']

# --- 3. CLIENTES (NUEVO) ---
class ClienteSerializer(serializers.ModelSerializer):
    deuda_actual = serializers.ReadOnlyField() # Campo calculado en el modelo
    class Meta:
        model = Cliente
        fields = '__all__'

# --- 4. USUARIOS (SISTEMA) ---
class GestionUsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    
    class Meta: 
        model = Usuario
        fields = ['id', 'username', 'email', 'password', 'rol', 'sucursal', 'is_active', 'is_staff']
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        instance = self.Meta.model(**validated_data)
        if password: instance.set_password(password)
        instance.save()
        return instance

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items(): setattr(instance, attr, value)
        if password: instance.set_password(password)
        instance.save()
        return instance

class RegistroUsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    class Meta: 
        model = Usuario
        fields = ('username', 'email', 'password')
    
    def create(self, validated_data):
        return Usuario.objects.create_user(**validated_data)

class UserDetailSerializer(serializers.ModelSerializer):
    sucursal_nombre = serializers.CharField(source='sucursal.nombre', read_only=True)
    class Meta: model = Usuario; fields = ('id', 'username', 'email', 'rol', 'is_staff', 'sucursal', 'sucursal_nombre')

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])

# --- 5. PEDIDOS Y VENTAS ---
class DetallePedidoSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.ReadOnlyField(source='producto.nombre')
    class Meta: model = DetallePedido; fields = ['id', 'producto', 'producto_nombre', 'cantidad', 'precio_unitario']

class AdminPedidoSerializer(serializers.ModelSerializer):
    # Lectura: Objeto completo del cliente
    cliente_info = ClienteSerializer(source='cliente', read_only=True)
    # Escritura: Solo el ID del cliente
    cliente = serializers.PrimaryKeyRelatedField(queryset=Cliente.objects.all(), write_only=True, required=False, allow_null=True)
    
    vendedor_nombre = serializers.ReadOnlyField(source='vendedor.username')
    sucursal_nombre = serializers.ReadOnlyField(source='sucursal.nombre')
    detalles = DetallePedidoSerializer(many=True, read_only=True)
    total_con_mora = serializers.ReadOnlyField() # Importante para ver la mora

    class Meta: 
        model = Pedido
        fields = '__all__'

class PedidoSerializer(serializers.ModelSerializer):
    detalles = DetallePedidoSerializer(many=True, read_only=True)
    cliente_nombre = serializers.ReadOnlyField(source='cliente.nombre')
    class Meta: model = Pedido; fields = '__all__'

# --- 6. EXTRAS (CARRITO Y RECOMENDACIONES) ---
class CarritoItemSerializer(serializers.ModelSerializer):
    producto_detalle = ProductoSerializer(source='producto', read_only=True)
    producto_id = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.all(), source='producto', write_only=True)
    class Meta: model = CarritoItem; fields = ('id', 'producto_id', 'producto_detalle', 'cantidad')

class RecomendacionSerializer(serializers.ModelSerializer):
    producto = ProductoSerializer(source='producto_recomendado', read_only=True)
    class Meta: model = Recomendacion; fields = ('producto', 'score')

# --- 7. TOKEN JWT ---
class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['rol'] = user.rol
        token['is_staff'] = user.is_staff
        return token