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
import GestionInventario from './pages/GestionInventario';
import ClientesPage from './pages/ClientesPage'; 

function ProtectedRoute({ children }) {
  const auth = useAuth();
  if (!auth.authToken) return <Navigate to="/login" replace />;
  return children;
}

function RequireRole({ children, allowedRoles }) {
  const auth = useAuth();
  const userRol = auth.authUser?.rol;
  
  if (userRol !== 'ADMIN' && !allowedRoles.includes(userRol)) {
    return <Navigate to="/facturacion" replace />;
  }
  return children;
}

function App() {
  const auth = useAuth();
  
  // Redirección Inteligente
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
        
        {/* --- RUTAS DE ADMINISTRACIÓN --- */}
        <Route path="usuarios" element={<RequireRole allowedRoles={[]}><GestionUsuarios /></RequireRole>} />   {/* Solo Admin */}
        <Route path="productos" element={<RequireRole allowedRoles={[]}><GestionProductos /></RequireRole>} /> {/* Solo Admin */}
        <Route path="inventario" element={<RequireRole allowedRoles={['ADMIN', 'GERENTE']}><GestionInventario /></RequireRole>} />
        <Route path="auditoria" element={<RequireRole allowedRoles={['GERENTE']}><AuditoriaPage /></RequireRole>} />
        
        {/* --- 2. RUTA NUEVA DE CLIENTES --- */}
        <Route path="clientes" element={<RequireRole allowedRoles={['GERENTE', 'VENDEDOR']}><ClientesPage /></RequireRole>} />
        
        {/* --- RUTAS OPERATIVAS --- */}
        <Route path="pedidos" element={<RequireRole allowedRoles={['GERENTE', 'VENDEDOR']}><GestionPedidos /></RequireRole>} />
        <Route path="facturacion" element={<Facturacion />} />
        <Route path="corte-caja" element={<CorteCaja />} />

      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
export default App;