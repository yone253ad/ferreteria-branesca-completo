import os
import django
from django.db import connection

# 1. Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ferreteria_branesca.settings')
django.setup()

def nuke_database():
    print("☢️  INICIANDO LIMPIEZA TOTAL DE SQL SERVER...")
    
    # Comandos T-SQL para eliminar todo forzosamente
    sql_clean_constraints = """
    DECLARE @sql NVARCHAR(MAX) = N'';
    
    -- 1. Eliminar todas las restricciones (Foreign Keys)
    SELECT @sql += N'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id))
        + '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) + 
        ' DROP CONSTRAINT ' + QUOTENAME(name) + ';'
    FROM sys.foreign_keys;
    
    EXEC sp_executesql @sql;
    """
    
    sql_drop_tables = """
    DECLARE @sql NVARCHAR(MAX) = N'';
    
    -- 2. Eliminar todas las tablas
    SELECT @sql += N'DROP TABLE ' + QUOTENAME(TABLE_SCHEMA) + '.' + QUOTENAME(TABLE_NAME) + ';'
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_TYPE = 'BASE TABLE';
    
    EXEC sp_executesql @sql;
    """

    with connection.cursor() as cursor:
        try:
            print("   ... Eliminando relaciones y candados...")
            cursor.execute(sql_clean_constraints)
            
            print("   ... Eliminando todas las tablas...")
            cursor.execute(sql_drop_tables)
            
            print("\n✅ ÉXITO: La base de datos está VACÍA.")
        except Exception as e:
            print(f"\n❌ ERROR: {e}")

if __name__ == '__main__':
    nuke_database()