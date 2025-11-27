import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// 1. Importaciones de Bootstrap (LIMPIAS)
import { Dropdown, Toast, ToastContainer, Offcanvas, Button } from 'react-bootstrap';

// 2. Importaciones de Iconos (LIMPIAS - Sin Search)
import { 
  LayoutDashboard, Package, ShoppingCart, Users, FileText, 
  Menu, Bell, ChevronDown, LogOut, Landmark, Scissors, Warehouse
} from 'lucide-react';

// Sonido de notificación
const NOTIFICATION_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

function AdminLayout() {
  // Estados de UI
  const [expanded, setExpanded] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Estados Notificaciones
  const [showToast, setShowToast] = useState(false);
  const [notificationData, setNotificationData] = useState({ id: 0, pendientes: 0 });
  const [notificationsList, setNotificationsList] = useState([]);
  
  const lastKnownIdRef = useRef(null);

  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const rol = auth.authUser?.rol; 

  const handleLogout = () => {
    auth.logout();
    navigate('/login');
  };

  const toggleSidebar = () => setExpanded(!expanded);
  const clearNotifications = () => setNotificationsList([]);

  // Lógica de Monitoreo (Polling)
  useEffect(() => {
    const checkNewOrders = async () => {
      try {
        const res = await auth.axiosApi.get('/monitor-pedidos/');
        const { ultimo_id, pendientes } = res.data;

        if (lastKnownIdRef.current === null) {
          lastKnownIdRef.current = ultimo_id;
          return;
        }

        if (ultimo_id > lastKnownIdRef.current) {
          lastKnownIdRef.current = ultimo_id;
          
          setNotificationData({ id: ultimo_id, pendientes });
          setShowToast(true);

          const newNotification = {
            id: Date.now(),
            orderId: ultimo_id,
            time: new Date().toLocaleTimeString(),
            read: false
          };
          setNotificationsList(prev => [newNotification, ...prev]);

          try { new Audio(NOTIFICATION_SOUND).play().catch(() => {}); } catch (e) {}
        }
      } catch (err) { console.error("Error monitor:", err); }
    };

    const interval = setInterval(checkNewOrders, 30000);
    checkNewOrders();

    return () => clearInterval(interval);
  }, [auth.axiosApi]);

  const isActive = (path) => location.pathname === path ? 'active' : '';

  // --- MENÚ LATERAL ---
  const renderMenuContent = () => (
    <>
        {/* DASHBOARD */}
        {['ADMIN', 'GERENTE'].includes(rol) && (
          <Link to="/" className={`compact-menu-item ${isActive('/')}`} onClick={() => setShowMobileMenu(false)}>
            <div className="menu-icon"><LayoutDashboard size={20} /></div>
            <span className="menu-label">Dashboard</span>
          </Link>
        )}

        {/* PRODUCTOS */}
        {rol === 'ADMIN' && (
          <Link to="/productos" className={`compact-menu-item ${isActive('/productos')}`} onClick={() => setShowMobileMenu(false)}>
            <div className="menu-icon"><Package size={20} /></div>
            <span className="menu-label">Productos</span>
          </Link>
        )}

        {/* INVENTARIO */}
        {['ADMIN', 'GERENTE'].includes(rol) && (
          <Link to="/inventario" className={`compact-menu-item ${isActive('/inventario')}`} onClick={() => setShowMobileMenu(false)}>
            <div className="menu-icon"><Warehouse size={20} /></div>
            <span className="menu-label">Inventario</span>
          </Link>
        )}

        {/* VENTAS */}
        {['ADMIN', 'GERENTE'].includes(rol) && (
          <Link to="/pedidos" className={`compact-menu-item ${isActive('/pedidos')}`} onClick={() => setShowMobileMenu(false)}>
            <div className="menu-icon"><ShoppingCart size={20} /></div>
            <span className="menu-label">Ventas</span>
          </Link>
        )}

        {/* USUARIOS */}
        {rol === 'ADMIN' && (
          <Link to="/usuarios" className={`compact-menu-item ${isActive('/usuarios')}`} onClick={() => setShowMobileMenu(false)}>
            <div className="menu-icon"><Users size={20} /></div>
            <span className="menu-label">Usuarios</span>
          </Link>
        )}

        {/* AUDITORÍA */}
        {['ADMIN', 'GERENTE'].includes(rol) && (
          <Link to="/auditoria" className={`compact-menu-item ${isActive('/auditoria')}`} onClick={() => setShowMobileMenu(false)}>
            <div className="menu-icon"><FileText size={20} /></div>
            <span className="menu-label">Auditoría</span>
          </Link>
        )}
        
        <div className="my-2 border-top border-secondary mx-3" style={{opacity: 0.3}}></div>

        {/* POS */}
        <Link to="/facturacion" className={`compact-menu-item ${isActive('/facturacion')}`} style={{color: 'var(--amarillo)'}} onClick={() => setShowMobileMenu(false)}>
          <div className="menu-icon"><Landmark size={20} /></div>
          <span className="menu-label">Caja POS</span>
        </Link>
        
        {/* CORTE */}
        <Link to="/corte-caja" className={`compact-menu-item ${isActive('/corte-caja')}`} onClick={() => setShowMobileMenu(false)}>
           <div className="menu-icon"><Scissors size={20} /></div>
           <span className="menu-label">Corte</span>
        </Link>
    </>
  );

  return (
    <div className="admin-container">
      
      {/* Sidebar Desktop */}
      <div className={`compact-sidebar ${expanded ? 'expanded' : ''} d-none d-md-flex`}>
        <div className="sidebar-logo">
          <div className="logo-icon"><Landmark size={28} /></div>
          <div className="logo-text">Ferretería Branesca</div>
        </div>
        <div className="compact-menu">
            {renderMenuContent()}
        </div>
        <div className="mt-auto p-3 text-center text-white-50 small w-100">
          {auth.authUser?.username}<br/>
          <span className="badge bg-secondary">{rol}</span>
          <div className="d-grid mt-2">
            <button className="btn btn-danger btn-sm" onClick={handleLogout}>Salir</button>
          </div>
        </div>
      </div>

      {/* Panel Principal */}
      <div className={`main-panel ${expanded ? 'expanded-margin' : ''}`}>
        
        {/* Header */}
        <header className="admin-header">
          <div className="header-left">
            <button className="sidebar-toggle-btn d-none d-md-block" onClick={toggleSidebar}>
              <Menu size={24} />
            </button>
            <button className="sidebar-toggle-btn d-md-none" onClick={() => setShowMobileMenu(true)}>
              <Menu size={24} />
            </button>
            <div className="page-info ms-3">
              <h1>Panel de Control</h1>
            </div>
          </div>

          <div className="header-right">
             <div className="header-actions d-none d-sm-flex align-items-center">
                
                {/* Campanita Funcional */}
                <Dropdown align="end">
                  <Dropdown.Toggle as="button" className="header-icon-btn border-0 bg-transparent position-relative">
                    <Bell size={20} />
                    {notificationsList.length > 0 && (
                      <span className="badge-notification" style={{top: '0', right: '0'}}>
                        {notificationsList.length}
                      </span>
                    )}
                  </Dropdown.Toggle>

                  <Dropdown.Menu className="shadow border-0 p-0" style={{ width: '300px', maxHeight: '400px', overflowY: 'auto' }}>
                    <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
                        <h6 className="m-0 fw-bold">Notificaciones</h6>
                        {notificationsList.length > 0 && (
                            <small className="text-primary" style={{cursor:'pointer'}} onClick={clearNotifications}>
                                Borrar todo
                            </small>
                        )}
                    </div>
                    
                    {notificationsList.length === 0 ? (
                        <div className="p-4 text-center text-muted">
                            <small>No hay notificaciones nuevas</small>
                        </div>
                    ) : (
                        notificationsList.map((notif) => (
                            <Dropdown.Item key={notif.id} as={Link} to="/pedidos" className="border-bottom py-2">
                                <div className="d-flex align-items-start">
                                    <div className="bg-light p-2 rounded-circle me-2 text-success">
                                        <ShoppingCart size={16} />
                                    </div>
                                    <div>
                                        <strong className="d-block text-dark" style={{fontSize: '0.9rem'}}>
                                            Nuevo Pedido #{notif.orderId}
                                        </strong>
                                        <small className="text-muted">{notif.time}</small>
                                    </div>
                                </div>
                            </Dropdown.Item>
                        ))
                    )}
                  </Dropdown.Menu>
                </Dropdown>
             </div>
             
             {/* Perfil */}
             <Dropdown align="end">
                <Dropdown.Toggle as="div" bsPrefix="custom" className="user-profile">
                   <div className="avatar-circle">{auth.authUser?.username?.charAt(0).toUpperCase()}</div>
                   <div className="user-info d-none d-md-flex">
                      <span className="user-name">{auth.authUser?.username}</span>
                      <span className="user-role">{rol}</span>
                   </div>
                   <ChevronDown size={16} className="text-muted ms-2" />
                </Dropdown.Toggle>
                <Dropdown.Menu className="shadow border-0 mt-2">
                   <Dropdown.Item onClick={handleLogout} className="text-danger"><LogOut size={16}/> Salir</Dropdown.Item>
                </Dropdown.Menu>
             </Dropdown>
          </div>
        </header>

        <div className="content-wrapper">
            <Outlet />
        </div>
      </div>

      {/* Menú Móvil (Reemplazo de Navbar para evitar warnings) */}
      <Offcanvas show={showMobileMenu} onHide={() => setShowMobileMenu(false)} className="bg-dark text-white" style={{ maxWidth: '250px' }}>
        <Offcanvas.Header closeButton closeVariant="white">
            <Offcanvas.Title>Menú</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0">
            <div className="compact-menu">
                {renderMenuContent()}
            </div>
             <div className="mt-auto p-3 text-center text-white-50 small w-100 border-top border-secondary">
                {auth.authUser?.username}<br/>
                <span className="badge bg-secondary">{rol}</span>
                <div className="d-grid mt-2">
                    <button className="btn btn-danger btn-sm" onClick={handleLogout}>Salir</button>
                </div>
            </div>
        </Offcanvas.Body>
      </Offcanvas>

      {/* Toast */}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999, position: 'fixed', top: '60px' }}>
        <Toast onClose={() => setShowToast(false)} show={showToast} delay={8000} autohide bg="success">
          <Toast.Header closeButton>
            <strong className="me-auto text-success">🔔 Nuevo Pedido</strong>
          </Toast.Header>
          <Toast.Body className="text-white">
            Pedido <strong>#{notificationData.id}</strong> recibido.
            <br/>
            <Button size="sm" variant="light" as={Link} to="/pedidos" className="mt-2" onClick={() => setShowToast(false)}>
                Ver Pedidos
            </Button>
          </Toast.Body>
        </Toast>
      </ToastContainer>

    </div>
  );
}

export default AdminLayout;