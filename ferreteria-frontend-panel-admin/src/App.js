// Este código reemplaza todo en: src/App.js

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import './App.css';

import AdminLayout from './components/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import GestionPedidos from './pages/GestionPedidos';
import GestionProductos from './pages/GestionProductos';
import Facturacion from './pages/Facturacion';
import GestionUsuarios from './pages/GestionUsuarios';
import AuditoriaPage from './pages/AuditoriaPage';
import CorteCaja from './pages/CorteCaja';
import GestionInventario from './pages/GestionInventario'; // <-- Importar

// ... dentro de <Routes> ...
<Route path="inventario" element={<RequireRole allowedRoles={['ADMIN', 'GERENTE']}><GestionInventario /></RequireRole>} />

function ProtectedRoute({ children }) {
  const auth = useAuth();
  if (!auth.authToken) return <Navigate to="/login" replace />;
  return children;
}

function RequireRole({ children, allowedRoles }) {
  const auth = useAuth();
  const userRol = auth.authUser?.rol;
  
  // DEBUG: Ver qué rol está detectando
  console.log("RequireRole chequeando:", userRol);

  // Admin siempre pasa. Si no es admin, revisamos la lista.
  if (userRol !== 'ADMIN' && !allowedRoles.includes(userRol)) {
    // Si no tiene permiso, lo mandamos al POS (zona segura para empleados)
    return <Navigate to="/facturacion" replace />;
  }
  return children;
}

function App() {
  const auth = useAuth();
  
  // Redirección inicial inteligente
  const getHomeRoute = () => {
      if (auth.authUser?.rol === 'ADMIN' || auth.authUser?.rol === 'GERENTE') {
          return <DashboardPage />;
      }
      return <Navigate to="/facturacion" replace />;
  };

  return (
    <Routes>
      <Route path="/login" element={auth.authToken ? <Navigate to="/" replace /> : <LoginPage />} />
      
      <Route path="/" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        
        {/* Ruta raíz inteligente */}
        <Route index element={getHomeRoute()} /> 
        
        {/* Rutas con Permisos Específicos */}
        <Route path="pedidos" element={<RequireRole allowedRoles={['GERENTE']}><GestionPedidos /></RequireRole>} />
        <Route path="productos" element={<RequireRole allowedRoles={[]}><GestionProductos /></RequireRole>} /> {/* Solo Admin */}
        <Route path="usuarios" element={<RequireRole allowedRoles={[]}><GestionUsuarios /></RequireRole>} />   {/* Solo Admin */}
        <Route path="auditoria" element={<RequireRole allowedRoles={['GERENTE']}><AuditoriaPage /></RequireRole>} />
        <Route path="inventario" element={<RequireRole allowedRoles={['ADMIN', 'GERENTE']}><GestionInventario /></RequireRole>} />
        
        {/* Rutas Públicas para Empleados */}
        <Route path="facturacion" element={<Facturacion />} />
        <Route path="corte-caja" element={<CorteCaja />} />

      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
export default App;