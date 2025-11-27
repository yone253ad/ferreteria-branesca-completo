import random
from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import Sucursal, Categoria, Producto, Inventario, Pedido, DetallePedido, Usuario

class Command(BaseCommand):
    help = 'Rellena la base de datos con productos reales, sucursales e inventario inicial'

    @transaction.atomic
    def handle(self, *args, **kwargs):
        self.stdout.write("🚧 Iniciando limpieza y poblado de base de datos...")

        # 1. Limpiar datos antiguos (Opcional: comenta estas líneas si no quieres borrar todo)
        self.stdout.write("   - Borrando datos antiguos...")
        Inventario.objects.all().delete()
        DetallePedido.objects.all().delete()
        Pedido.objects.all().delete()
        Producto.objects.all().delete()
        Categoria.objects.all().delete()
        Sucursal.objects.all().delete()
        # Nota: No borramos usuarios para que no pierdas tu admin

        # 2. Crear las 4 Sucursales
        self.stdout.write("   - Creando sucursales...")
        sucursales = [
            Sucursal.objects.create(nombre='Branesca Central (Managua)', direccion='Av. Principal, Managua'),
            Sucursal.objects.create(nombre='Branesca Masaya', direccion='Calle Real, Masaya'),
            Sucursal.objects.create(nombre='Branesca León', direccion='Centro Histórico, León'),
            Sucursal.objects.create(nombre='Branesca Estelí', direccion='Salida Norte, Estelí'),
        ]

        # 3. Definir el Catálogo de Productos (Datos Reales)
        catalogo = {
            'Herramientas Eléctricas': [
                ('Taladro Percutor 1/2" 650W', 45.00, 'Taladro potente para concreto y madera, velocidad variable.'),
                ('Esmeriladora Angular 4-1/2"', 38.50, 'Ideal para corte y desbaste de metal.'),
                ('Sierra Circular 7-1/4" 1500W', 85.00, 'Cortes precisos en madera, incluye disco de carburo.'),
                ('Lijadora Orbital 1/4 Hoja', 28.00, 'Acabados finos en madera, recolección de polvo.'),
                ('Rotomartillo SDS Plus', 120.00, 'Para perforación en concreto duro, 3 modos de operación.')
            ],
            'Herramientas Manuales': [
                ('Martillo de Uña 16oz', 8.50, 'Cabeza de acero forjado, mango de fibra de vidrio.'),
                ('Juego de Destornilladores (6 pzs)', 12.00, 'Puntas magnéticas, mango ergonómico, planos y phillips.'),
                ('Alicate Universal 8"', 6.50, 'Acero cromo vanadio, mango aislante.'),
                ('Llave Ajustable 10"', 9.00, 'Apertura amplia, acabado cromado resistente al óxido.'),
                ('Cinta Métrica 5m', 4.50, 'Cinta de acero flexible, carcasa resistente a impactos.')
            ],
            'Materiales de Construcción': [
                ('Cemento Portland (42.5kg)', 10.50, 'Cemento gris de alta resistencia para uso general.'),
                ('Varilla de Hierro 3/8" Corrugada', 5.20, 'Varilla de 6 metros grado 40.'),
                ('Bloque de Concreto 15cm', 0.65, 'Bloque estándar para mampostería confinada.'),
                ('Arena de Río (Metro Cúbico)', 25.00, 'Arena lavada para mezclas de concreto y mortero.'),
                ('Lámina de Zinc Ondulada 12 pies', 18.00, 'Calibre 26, galvanizada para techos.')
            ],
            'Fontanería y Plomería': [
                ('Tubo PVC 1/2" Presión (6m)', 3.50, 'Para agua potable, SDR 26.'),
                ('Codo PVC 1/2" 90 Grados', 0.30, 'Accesorio liso para presión.'),
                ('Pegamento PVC (1/4 pinta)', 2.50, 'Cemento solvente para tuberías de agua fría.'),
                ('Grifo de Lavamanos Cromado', 15.00, 'Llave individual económica, cierre fácil.'),
                ('Cinta de Teflón 3/4"', 0.50, 'Sellador de roscas para evitar fugas.')
            ],
            'Pinturas y Acabados': [
                ('Cubeta Pintura Blanca Látex (5 gal)', 45.00, 'Pintura base agua, acabado mate para interiores.'),
                ('Galón Pintura Aceite Azul', 18.00, 'Esmalte sintético brillante para metal y madera.'),
                ('Brocha de Cerda Natural 2"', 1.50, 'Mango plástico, para todo tipo de pinturas.'),
                ('Rodillo Felpa 9" con Maneral', 4.00, 'Para superficies lisas y semirugosas.'),
                ('Lija de Agua Grano 120', 0.25, 'Hoja de lija para preparación de superficies.')
            ],
            'Eléctrico e Iluminación': [
                ('Bombillo LED 9W (Luz Día)', 1.20, 'Ahorrador de energía, rosca E27.'),
                ('Tomacorriente Doble Polarizado', 2.50, 'Color blanco, incluye placa y tornillos.'),
                ('Interruptor Sencillo', 1.80, 'Mecanismo basculante, 15A 125V.'),
                ('Rollo Cable Eléctrico #12 (100m)', 35.00, 'Cable THHN sólido para instalaciones residenciales.'),
                ('Cinta Aislante Negra 3/4"', 0.80, 'Aislamiento eléctrico de vinilo.')
            ]
        }

        # 4. Insertar Productos y Asignar Inventario
        total_productos = 0
        items_inventario = []

        for nombre_categoria, productos_lista in catalogo.items():
            # Crear Categoría
            categoria = Categoria.objects.create(
                nombre=nombre_categoria, 
                descripcion=f"Todo lo relacionado con {nombre_categoria}"
            )
            
            self.stdout.write(f"   - Categoría creada: {nombre_categoria}")

            for prod_nombre, prod_precio, prod_desc in productos_lista:
                # Crear Producto
                sku = f"{nombre_categoria[:3].upper()}-{random.randint(1000, 9999)}"
                producto = Producto.objects.create(
                    sku=sku,
                    nombre=prod_nombre,
                    descripcion=prod_desc,
                    precio=prod_precio,
                    categoria=categoria
                    # Nota: No asignamos imagen aquí (se subirían manual o usaríamos URLs externas si el modelo lo permitiera)
                )
                total_productos += 1

                # Asignar Stock a las 4 Sucursales
                for sucursal in sucursales:
                    cantidad_random = random.randint(0, 100) # Entre 0 y 100 unidades
                    
                    # Lógica especial: Asegurar que la Sucursal 1 siempre tenga stock (para pruebas)
                    if sucursal.id == sucursales[0].id and cantidad_random < 10:
                        cantidad_random = 50

                    items_inventario.append(Inventario(
                        producto=producto,
                        sucursal=sucursal,
                        cantidad=cantidad_random
                    ))

        # Guardar todo el inventario de una sola vez (optimización)
        Inventario.objects.bulk_create(items_inventario)

        self.stdout.write(self.style.SUCCESS(f'✅ ¡Éxito! Base de datos poblada con:'))
        self.stdout.write(f'   - {len(sucursales)} Sucursales')
        self.stdout.write(f'   - {len(catalogo)} Categorías')
        self.stdout.write(f'   - {total_productos} Productos')
        self.stdout.write(f'   - {len(items_inventario)} Registros de Inventario')