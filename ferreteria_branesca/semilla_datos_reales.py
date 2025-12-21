import os
import django
import random
from decimal import Decimal

# 1. Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ferreteria_branesca.settings')
django.setup()

from api.models import Categoria, Producto, Sucursal, Inventario

def poblar_base_datos():
    print("🚀 Iniciando carga masiva de datos reales para 'El Shaday'...")

    # --- 1. CATEGORÍAS ---
    categorias_data = [
        "Herramientas Manuales", "Herramientas Eléctricas", "Materiales de Construcción",
        "Fontanería y PVC", "Electricidad e Iluminación", "Pinturas y Acabados",
        "Jardinería", "Seguridad Industrial", "Hogar y Limpieza", "Cerrajería"
    ]
    
    cats_objs = {}
    print("\n📂 Creando Categorías...")
    for nombre in categorias_data:
        cat, _ = Categoria.objects.get_or_create(nombre=nombre, defaults={'descripcion': f'Todo en {nombre}'})
        cats_objs[nombre] = cat
        print(f"   - {nombre}")

    # --- 2. PRODUCTOS REALES (Nicaragua) ---
    productos_data = [
        # Herramientas Manuales
        {"sku": "TRU-1001", "nombre": "Martillo de Uña 16oz Truper", "cat": "Herramientas Manuales", "precio": 350.00},
        {"sku": "STA-5500", "nombre": "Cinta Métrica 5m Stanley", "cat": "Herramientas Manuales", "precio": 280.00},
        {"sku": "TRU-ALIC", "nombre": "Alicate de Presión 10plg Truper", "cat": "Herramientas Manuales", "precio": 420.00},
        {"sku": "STA-DEST", "nombre": "Juego Desarmadores 6pzs Stanley", "cat": "Herramientas Manuales", "precio": 650.00},
        {"sku": "TRU-LLAV", "nombre": "Juego Llaves Allen mm/std Truper", "cat": "Herramientas Manuales", "precio": 210.00},
        
        # Herramientas Eléctricas
        {"sku": "DEW-TAL1", "nombre": "Taladro Percutor 1/2 DeWalt 700W", "cat": "Herramientas Eléctricas", "precio": 3800.00},
        {"sku": "MAK-ESM1", "nombre": "Esmeriladora Angular 4-1/2 Makita", "cat": "Herramientas Eléctricas", "precio": 2900.00},
        {"sku": "BOS-LIJ1", "nombre": "Lijadora Orbital Bosch", "cat": "Herramientas Eléctricas", "precio": 2500.00},
        {"sku": "ING-SOL1", "nombre": "Inversor Soldador Ingco 160A", "cat": "Herramientas Eléctricas", "precio": 5200.00},

        # Construcción
        {"sku": "CEM-CAN", "nombre": "Cemento Canal (Bolsa 42.5kg)", "cat": "Materiales de Construcción", "precio": 410.00},
        {"sku": "HOL-CEM", "nombre": "Cemento Holcim Fuerte", "cat": "Materiales de Construcción", "precio": 415.00},
        {"sku": "ARE-MT3", "nombre": "Arena de Río (Metro Cúbico)", "cat": "Materiales de Construcción", "precio": 600.00},
        {"sku": "PIE-CAN", "nombre": "Piedra Cantera (Unidad)", "cat": "Materiales de Construcción", "precio": 48.00},
        {"sku": "VAR-3/8", "nombre": "Varilla de Hierro 3/8 Corrugada", "cat": "Materiales de Construcción", "precio": 230.00},
        {"sku": "BLO-15", "nombre": "Bloque de Cemento 15x20x40", "cat": "Materiales de Construcción", "precio": 28.00},
        {"sku": "LAM-ZINC", "nombre": "Lámina de Zinc Lisa 12 pies", "cat": "Materiales de Construcción", "precio": 550.00},

        # Fontanería
        {"sku": "PVC-1/2", "nombre": "Tubo PVC 1/2 SDR-26 (6m)", "cat": "Fontanería y PVC", "precio": 120.00},
        {"sku": "PVC-4", "nombre": "Tubo PVC 4 Sanitario (6m)", "cat": "Fontanería y PVC", "precio": 850.00},
        {"sku": "GRI-LAV", "nombre": "Grifo Lavamanos Cromado Pfister", "cat": "Fontanería y PVC", "precio": 1200.00},
        {"sku": "INO-COR", "nombre": "Inodoro Corona Blanco Completo", "cat": "Fontanería y PVC", "precio": 4500.00},
        {"sku": "TEF-ROL", "nombre": "Cinta Teflón 3/4 Industrial", "cat": "Fontanería y PVC", "precio": 25.00},
        {"sku": "PEG-PVC", "nombre": "Pegamento PVC Tangit 1/4", "cat": "Fontanería y PVC", "precio": 180.00},

        # Electricidad
        {"sku": "CAB-12", "nombre": "Cable Eléctrico #12 THHN (Metro)", "cat": "Electricidad e Iluminación", "precio": 28.00},
        {"sku": "CAB-14", "nombre": "Cable Eléctrico #14 THHN (Metro)", "cat": "Electricidad e Iluminación", "precio": 22.00},
        {"sku": "TOM-DOB", "nombre": "Tomacorriente Doble Eagle", "cat": "Electricidad e Iluminación", "precio": 110.00},
        {"sku": "INT-SEN", "nombre": "Interruptor Sencillo Eagle", "cat": "Electricidad e Iluminación", "precio": 95.00},
        {"sku": "BOM-LED", "nombre": "Bombillo LED 9W Luz Día Sylvania", "cat": "Electricidad e Iluminación", "precio": 85.00},
        {"sku": "BRE-20A", "nombre": "Breaker 20A 1 Polo SquareD", "cat": "Electricidad e Iluminación", "precio": 250.00},

        # Pinturas
        {"sku": "PNT-LAN", "nombre": "Cubeta Pintura Lanco Dry Coat Blanca", "cat": "Pinturas y Acabados", "precio": 3800.00},
        {"sku": "PNT-SUR", "nombre": "Galón Pintura Sur Goltex Satinada", "cat": "Pinturas y Acabados", "precio": 1400.00},
        {"sku": "ANT-COR", "nombre": "Anticorrosivo Rojo Óxido (Galón)", "cat": "Pinturas y Acabados", "precio": 850.00},
        {"sku": "BRO-2", "nombre": "Brocha 2 pulgadas Mona", "cat": "Pinturas y Acabados", "precio": 60.00},
        {"sku": "THI-GAL", "nombre": "Thinner Laca (Galón)", "cat": "Pinturas y Acabados", "precio": 350.00},

        # Hogar y Varios
        {"sku": "CER-YAL", "nombre": "Cerradura Yale Doble Paso", "cat": "Cerrajería", "precio": 650.00},
        {"sku": "CAN-40", "nombre": "Candado 40mm Hierro Yale", "cat": "Cerrajería", "precio": 180.00},
        {"sku": "ESC-ALU", "nombre": "Escoba Tipo Abanico Plástica", "cat": "Hogar y Limpieza", "precio": 120.00},
        {"sku": "MAN-JAR", "nombre": "Manguera Jardín 15m Reforzada", "cat": "Jardinería", "precio": 450.00},
        {"sku": "GUA-IND", "nombre": "Guantes de Cuero Carnaza (Par)", "cat": "Seguridad Industrial", "precio": 110.00},
        {"sku": "LEN-PRO", "nombre": "Lentes de Seguridad Claros 3M", "cat": "Seguridad Industrial", "precio": 150.00},
    ]

    print(f"\n📦 Creando {len(productos_data)} Productos...")
    
    sucursales = Sucursal.objects.all()
    if not sucursales.exists():
        print("⚠️ No hay sucursales. Creando 'Shaday Central' por defecto...")
        Sucursal.objects.create(nombre="Shaday Central", direccion="Managua")
        sucursales = Sucursal.objects.all()

    for p in productos_data:
        prod, created = Producto.objects.get_or_create(
            sku=p['sku'],
            defaults={
                'nombre': p['nombre'],
                'descripcion': f"Producto de alta calidad: {p['nombre']}",
                'precio': Decimal(p['precio']),
                'categoria': cats_objs[p['cat']]
            }
        )
        
        # Asignar Inventario a cada sucursal
        for suc in sucursales:
            # Shaday Central siempre tiene stock, las otras aleatorio
            if "Central" in suc.nombre:
                stock = random.randint(50, 200)
            else:
                stock = random.randint(0, 50) # Algunas pueden tener 0
            
            Inventario.objects.get_or_create(
                producto=prod,
                sucursal=suc,
                defaults={'cantidad': stock}
            )
        
        if created:
            print(f"   ✅ Creado: {p['nombre']} (C$ {p['precio']})")
        else:
            print(f"   ℹ️ Ya existe: {p['nombre']}")

    print("\n✨ ¡BASE DE DATOS LLENA Y LISTA PARA VENDER! ✨")
    print("Recuerda reiniciar el servidor si estaba corriendo.")

if __name__ == '__main__':
    poblar_base_datos()