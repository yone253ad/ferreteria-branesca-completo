import os
import django

# 1. Configurar el entorno de Django
# Asegúrate de que 'ferreteria_branesca' sea el nombre real de tu carpeta de configuración
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ferreteria_branesca.settings')
django.setup()

from api.models import Sucursal

def crear_sucursales():
    print("🏢 Iniciando creación de Sucursales 'El Shaday'...")

    # Lista de sucursales solicitadas
    lista_sucursales = [
        {
            "nombre": "Shaday Central", 
            "direccion": "Dirección Principal, Managua"
        },
        {
            "nombre": "Shaday 2", 
            "direccion": "Salida a Masaya, Km 10"
        },
        {
            "nombre": "Shaday 3", 
            "direccion": "Mercado Oriental, Gancho de Caminos"
        },
        {
            "nombre": "Shaday 4", 
            "direccion": "Carretera Norte, Frente a la Subasta"
        }
    ]

    for data in lista_sucursales:
        # get_or_create evita duplicados si corres el script varias veces
        obj, created = Sucursal.objects.get_or_create(
            nombre=data['nombre'],
            defaults={'direccion': data['direccion']}
        )
        
        estado = "✅ Creada" if created else "⚠️ Ya existía"
        print(f"{estado}: {obj.nombre}")

    print("\n✨ ¡Listo! Las 4 sucursales están activas en la base de datos.")

if __name__ == '__main__':
    crear_sucursales()