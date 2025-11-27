from django.contrib import admin
from . import models

# Le decimos a Django que registre todos nuestros modelos
# para que aparezcan en el panel de administrador.

admin.site.register(models.Usuario)
admin.site.register(models.Sucursal)
admin.site.register(models.Categoria)
admin.site.register(models.Producto)
admin.site.register(models.Inventario)
admin.site.register(models.Pedido)
admin.site.register(models.DetallePedido)