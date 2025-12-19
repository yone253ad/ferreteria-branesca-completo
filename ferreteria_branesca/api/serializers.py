from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Inventario

from .models import (
    Usuario, Producto, Categoria, Sucursal, 
    Inventario, Pedido, DetallePedido, Direccion, CarritoItem, Recomendacion
)

class SucursalSerializer(serializers.ModelSerializer):
    class Meta: model = Sucursal; fields = '__all__'

class CategoriaSerializer(serializers.ModelSerializer):
    class Meta: model = Categoria; fields = '__all__'

class ProductoSerializer(serializers.ModelSerializer):
    stock_disponible = serializers.SerializerMethodField()
    class Meta: model = Producto; fields = ('id', 'sku', 'nombre', 'descripcion', 'precio', 'categoria', 'imagen', 'stock_disponible')
    def get_stock_disponible(self, obj):
        request = self.context.get('request')
        sucursal_id = request.query_params.get('sucursal') if request else None
        if not sucursal_id and request and request.user.is_authenticated and hasattr(request.user, 'sucursal') and request.user.sucursal:
            sucursal_id = request.user.sucursal.id
        target = sucursal_id if sucursal_id else 14 # Default a ID 14
        try: return obj.inventarios.get(sucursal_id=target).cantidad
        except: return 0

class InventarioSerializer(serializers.ModelSerializer):
    class Meta: model = Inventario; fields = '__all__'

class DireccionSerializer(serializers.ModelSerializer):
    class Meta: model = Direccion; fields = '__all__'; read_only_fields = ('usuario',)
    def create(self, validated_data):
        validated_data['usuario'] = self.context['request'].user
        return super().create(validated_data)

class RegistroUsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    class Meta: model = Usuario; fields = ('username', 'email', 'password', 'password2', 'is_staff', 'rol'); read_only_fields = ('is_staff', 'rol')
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']: raise serializers.ValidationError({"password": "No coinciden."})
        return attrs
    def create(self, validated_data): return Usuario.objects.create_user(username=validated_data['username'], email=validated_data['email'], password=validated_data['password'])

class GestionUsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    class Meta: 
        model = Usuario; fields = ('id', 'username', 'email', 'password', 'rol', 'is_staff', 'is_active', 'sucursal')
        fields = ['id', 'username', 'email','password', 'rol', 'sucursal', 'limite_credito', 'dias_credito', 'is_active']
        extra_kwargs = {'password': {'write_only': True, 'required': False}}
    def create(self, validated_data):
        password = validated_data.pop('password'); rol = validated_data.get('rol', 'CLIENTE')
        user = Usuario(**validated_data); user.set_password(password)
        if rol in ['ADMIN', 'VENDEDOR', 'GERENTE']: user.is_staff = True
        user.save(); return user
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

class UserDetailSerializer(serializers.ModelSerializer):
    sucursal_nombre = serializers.CharField(source='sucursal.nombre', read_only=True)
    class Meta: model = Usuario; fields = ('id', 'username', 'email', 'rol', 'is_staff', 'sucursal', 'sucursal_nombre')

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    def validate_old_password(self, value):
        if not self.context['request'].user.check_password(value): raise serializers.ValidationError("Clave incorrecta.")
        return value

class DetallePedidoSerializer(serializers.ModelSerializer):
    producto = ProductoSerializer(read_only=True) 
    class Meta: model = DetallePedido; fields = ('producto', 'cantidad', 'precio_unitario')

class PedidoSerializer(serializers.ModelSerializer):
    detalles = DetallePedidoSerializer(many=True, read_only=True)
    cliente_username = serializers.CharField(source='cliente.username', read_only=True)
    sucursal_nombre = serializers.CharField(source='sucursal.nombre', read_only=True)
    direccion_str = serializers.CharField(source='direccion_envio.__str__', read_only=True)
    class Meta: model = Pedido; fields = ('id', 'cliente_username', 'sucursal_nombre', 'direccion_str', 'fecha_pedido', 'total', 'estado', 'detalles', 'transaction_id', 'metodo_pago')

class AdminPedidoSerializer(serializers.ModelSerializer):
    detalles = DetallePedidoSerializer(many=True, read_only=True)
    cliente_username = serializers.CharField(source='cliente.username', read_only=True)
    sucursal_nombre = serializers.CharField(source='sucursal.nombre', read_only=True)
    direccion_str = serializers.CharField(source='direccion_envio.__str__', read_only=True)
    total_con_mora = serializers.ReadOnlyField()
    class Meta: model = Pedido; fields = ('id', 'cliente_username', 'sucursal_nombre', 'direccion_str', 'fecha_pedido', 'total', 'estado', 'detalles', 'transaction_id', 'metodo_pago', 'fecha_vencimiento', 'tasa_mora', 'total_con_mora'); read_only_fields = ('id', 'cliente_username', 'sucursal_nombre', 'direccion_str', 'fecha_pedido', 'total', 'detalles', 'transaction_id', 'metodo_pago', 'fecha_vencimiento', 'tasa_mora', 'total_con_mora')

class HistoricalInventarioSerializer(serializers.ModelSerializer):
    # Campos calculados (Solo texto simple, nada de objetos pesados)
    producto_nombre = serializers.ReadOnlyField(source='instance.producto.nombre', default='-')
    sucursal_nombre = serializers.ReadOnlyField(source='instance.sucursal.nombre', default='-')
    usuario = serializers.ReadOnlyField(source='history_user.username', default='Sistema')
    fecha = serializers.DateTimeField(source='history_date', format="%d/%m/%Y %H:%M") # Formateamos la fecha aquí directo

    class Meta:
        model = Inventario.history.model
        # Solo enviamos lo estrictamente necesario
        fields = ['history_id', 'fecha', 'usuario', 'history_type', 'producto_nombre', 'sucursal_nombre', 'cantidad']

class CarritoItemSerializer(serializers.ModelSerializer):
    producto_detalle = ProductoSerializer(source='producto', read_only=True)
    producto_id = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.all(), source='producto', write_only=True)
    class Meta: model = CarritoItem; fields = ('id', 'producto_id', 'producto_detalle', 'cantidad')

class RecomendacionSerializer(serializers.ModelSerializer):
    producto = ProductoSerializer(source='producto_recomendado', read_only=True)
    class Meta: model = Recomendacion; fields = ('producto', 'score')

# --- ¡ESTE ES CRÍTICO PARA EL LOGIN! ---
class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['rol'] = user.rol
        token['is_staff'] = user.is_staff
        return token