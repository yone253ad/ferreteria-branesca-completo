import React from 'react';
import { Routes, Route } from 'react-router-dom'; // <-- Quitamos Link y useNavigate
import './App.css';

// Componentes de Layout
import Header from './components/Header';
import Footer from './components/Footer';

// Páginas
import Inicio from './pages/Inicio';
import Login from './pages/Login';
import Registro from './pages/Registro';
import ProductList from './pages/ProductList';
import ProductDetailPage from './pages/ProductDetailPage';
import Historial from './pages/Historial';
import CartPage from './pages/CartPage';
import CategoryPage from './pages/CategoryPage';
import ProfilePage from './pages/ProfilePage';
import RequestReset from './pages/RequestReset';
import PasswordResetConfirm from './pages/PasswordResetConfirm';
import ActivateAccount from './pages/ActivateAccount';

// Páginas de Información
import { PreguntasFrecuentes, Terminos, Sucursales } from './pages/InfoPages';

function App() {
  return (
    <div className="App d-flex flex-column" style={{ minHeight: '100vh' }}>
      
      {/* HEADER (Contiene el menú y la navegación) */}
      <Header />

      <div className="flex-grow-1"> 
        <Routes>
          <Route path="/" element={<Inicio />} /> 
          <Route path="/productos/:id" element={<ProductDetailPage />} />
          <Route path="/categoria/:id_categoria" element={<CategoryPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/historial" element={<Historial />} />
          <Route path="/carrito" element={<CartPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="/recuperar-password" element={<RequestReset />} />
          <Route path="/password-reset" element={<PasswordResetConfirm />} />
          <Route path="/activar/:uid/:token" element={<ActivateAccount />} />
          <Route path="/productos" element={<ProductList />} />
          
          {/* Rutas Footer */}
          <Route path="/preguntas-frecuentes" element={<PreguntasFrecuentes />} />
          <Route path="/terminos-y-condiciones" element={<Terminos />} />
          <Route path="/sucursales" element={<Sucursales />} />
        </Routes>
      </div>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}

export default App;