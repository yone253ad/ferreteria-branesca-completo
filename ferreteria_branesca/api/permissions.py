from rest_framework import permissions

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permite acceso de lectura a cualquier usuario (incluso anónimo),
    pero solo permite escritura (POST, PUT, DELETE) a usuarios Admin.
    """
    def has_permission(self, request, view):
        # Si es GET, HEAD o OPTIONS, permite pasar siempre
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Si quiere escribir, debe ser staff (Admin/Gerente)
        return request.user and request.user.is_staff