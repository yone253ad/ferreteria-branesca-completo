import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Container, Row, Col, Dropdown } from 'react-bootstrap';
// Iconos
import { ShoppingCart, User, Search, LogOut } from 'lucide-react';

function Header() {
  const { authToken, authUser, logout } = useAuth();
  const { cartItems } = useCart();
  
  // --- 1. LÓGICA DE BÚSQUEDA ---
  const [busqueda, setBusqueda] = useState(''); // Estado para guardar lo que escribes
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault(); // Evita que la página se recargue al dar Enter
    if (busqueda.trim()) {
      navigate(`/?search=${busqueda}`); // Manda a la URL con el filtro
    } else {
      navigate('/'); // Si borras, regresa al inicio
    }
  };
  // -----------------------------

  const totalItems = cartItems.reduce((acc, item) => acc + item.cantidad, 0);
  const totalPrecio = cartItems.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="custom-header">
      <Container>
        <Row className="align-items-center gx-3">
          
          {/* 1. LOGO */}
          <Col xs={12} md={3} lg={3} className="mb-3 mb-md-0 text-center text-md-start">
            <Link to="/" className="logo-text">
              FERRETERÍA <br/>
              <span>BRANESCA</span>
            </Link>
          </Col>

          {/* 2. BUSCADOR (Con funcionalidad activada) */}
          <Col xs={12} md={5} lg={5} className="mb-3 mb-md-0">
            {/* El form activa el evento onSubmit al dar Enter */}
            <form onSubmit={handleSearch} className="search-bar-container">
              <input 
                type="text" 
                className="search-input" 
                placeholder="¿Qué estás buscando hoy?" 
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              {/* El botón tipo submit activa el formulario */}
              <button type="submit" className="search-btn" title="Buscar">
                <Search size={22} strokeWidth={2.5} />
              </button>
            </form>
          </Col>

          {/* 3. ACCIONES (Derecha) */}
          <Col xs={12} md={4} lg={4}>
            <div className="d-flex justify-content-center justify-content-md-end align-items-center gap-4">
              
              {/* Carrito */}
              <Link to="/carrito" className="text-white text-decoration-none d-flex align-items-center gap-2 header-action-item">
                <div className="position-relative icon-container">
                  <ShoppingCart size={28} />
                  {totalItems > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning text-dark border border-light" style={{fontSize: '0.7rem'}}>
                      {totalItems}
                    </span>
                  )}
                </div>
                <div className="lh-1 text-start d-none d-sm-block">
                    <small style={{fontSize:'0.75rem', opacity:0.8, display:'block'}}>Mi Carrito</small>
                    <div className="fw-bold">${totalPrecio.toFixed(2)}</div>
                </div>
              </Link>

              {/* Usuario */}
              {authToken ? (
                <Dropdown align="end">
                  <Dropdown.Toggle variant="link" className="text-white text-decoration-none p-0 border-0 d-flex align-items-center gap-2 shadow-none header-action-item" id="user-menu">
                    <div className="icon-container border rounded-circle p-1 d-flex align-items-center justify-content-center">
                        <User size={24} />
                    </div>
                    <div className="lh-1 text-start d-none d-sm-block">
                        <small style={{fontSize:'0.75rem', opacity:0.8, display:'block'}}>Hola,</small>
                        <div className="fw-bold text-truncate" style={{maxWidth: '100px'}}>{authUser?.username}</div>
                    </div>
                  </Dropdown.Toggle>
                  <Dropdown.Menu className="mt-2 shadow border-0">
                    <Dropdown.Item as={Link} to="/perfil">Mi Perfil</Dropdown.Item>
                    <Dropdown.Item as={Link} to="/historial">Mis Pedidos</Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={handleLogout} className="text-danger">
                        <LogOut size={16} className="me-2"/> Cerrar Sesión
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              ) : (
                <Link to="/login" className="text-white text-decoration-none d-flex align-items-center gap-2 header-action-item">
                   <div className="icon-container border rounded-circle p-1 d-flex align-items-center justify-content-center">
                        <User size={24} />
                    </div>
                    <div className="lh-1 text-start d-none d-sm-block">
                        <small style={{fontSize:'0.75rem', opacity:0.8, display:'block'}}>Bienvenido</small>
                        <div className="fw-bold">Ingresar</div>
                    </div>
                </Link>
              )}

            </div>
          </Col>

        </Row>
      </Container>
    </header>
  );
}

export default Header;