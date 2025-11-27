import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { Link, useSearchParams } from 'react-router-dom';
import { Container, Row, Col, Alert, Placeholder } from 'react-bootstrap';
import CategoryList from '../components/CategoryList';
import SEO from '../components/SEO';
import { ShoppingBag } from 'lucide-react';

const API_URL = 'http://127.0.0.1:8000/api/productos/';

function Inicio() {
  const [productos, setProductos] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true); // Estado para los skeletons
  const { addToCart } = useCart();
  
  // Lógica de Búsqueda (Lee la URL)
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get('search') || '';

  useEffect(() => {
    // 1. ESTRATEGIA DE VELOCIDAD: Caché en SessionStorage
    const cachedData = sessionStorage.getItem('productosCache');
    
    if (cachedData) {
        setProductos(JSON.parse(cachedData));
        setLoading(false); // Carga instantánea
        fetchProductos(true); // Actualiza en segundo plano por si cambió algo
    } else {
        fetchProductos(false); // Carga normal
    }
  }, []);

  const fetchProductos = (isBackground) => {
      if (!isBackground) setLoading(true);
      
      axios.get(API_URL)
      .then(res => {
        setProductos(res.data);
        // Guardamos en memoria para la próxima visita
        sessionStorage.setItem('productosCache', JSON.stringify(res.data));
        if (!isBackground) setLoading(false);
      })
      .catch(err => {
          if(!isBackground) {
              setError(err);
              setLoading(false);
          }
      });
  };

  // Filtrado de productos
  const productosFiltrados = Array.isArray(productos)
    ? productos.filter(producto =>
        producto.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  return (
    <div>
      <SEO 
        title={searchTerm ? `Resultados: ${searchTerm}` : "Inicio"} 
        description="Ferretería Branesca - Calidad y Precio." 
      />
      
      {/* HERO SECTION (Centrado y Ocultable) */}
      {!searchTerm && (
        <div className="hero-section d-flex align-items-center">
          <Container>
            <Row className="justify-content-center">
              <Col lg={8} className="text-center"> {/* Clase text-center restaurada */}
                <h1 className="display-4 fw-bold mb-3 text-white">Construye tus sueños</h1>
                <p className="lead mb-4 text-white-50 mx-auto" style={{ maxWidth: '600px' }}>
                  Encuentra todo lo que necesitas para tu proyecto con la mejor calidad y precio del mercado.
                </p>
                <a href="#catalogo" className="btn-shaday text-decoration-none px-5 py-3 fs-5">
                  Ver Catálogo
                </a>
              </Col>
            </Row>
          </Container>
        </div>
      )}

      <Container className="pb-5 mt-4">
        
        {/* CATEGORÍAS */}
        {!searchTerm && (
            <div className="mb-5">
                <CategoryList />
            </div>
        )}

        {/* ENCABEZADO DE SECCIÓN */}
        <div id="catalogo" className="d-flex justify-content-between align-items-end mb-4 border-bottom pb-2">
            <h2 style={{color: 'var(--azul-oscuro)', fontWeight: '700', margin: 0}}>
                {searchTerm ? `Resultados para: "${searchTerm}"` : 'Productos Destacados'}
            </h2>
            {searchTerm && (
                <Link to="/" className="text-danger text-decoration-none fw-bold">
                    Borrar filtro
                </Link>
            )}
        </div>
        
        {error && <Alert variant="danger">Error cargando productos.</Alert>}

        {/* 2. SKELETON LOADING (Carga visual elegante) */}
        {loading && !productos.length && (
             <Row xs={2} md={3} lg={4} className="g-3 g-md-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <Col key={n}>
                        <div className="shaday-card h-100 bg-white overflow-hidden">
                            <Placeholder as="div" animation="glow">
                                <Placeholder xs={12} style={{ height: '200px' }} />
                            </Placeholder>
                            <div className="p-3">
                                <Placeholder as="div" animation="glow">
                                    <Placeholder xs={8} /> <Placeholder xs={4} />
                                    <Placeholder xs={6} size="lg" className="mt-3" />
                                </Placeholder>
                            </div>
                        </div>
                    </Col>
                ))}
             </Row>
        )}
        
        {/* MENSAJE SIN RESULTADOS */}
        {!loading && productosFiltrados.length === 0 && (
            <div className="text-center py-5">
                <h4>No encontramos productos.</h4>
                <p className="text-muted">Intenta buscar con otro término.</p>
                <Link to="/" className="btn btn-outline-primary mt-3 text-decoration-none">Ver todo</Link>
            </div>
        )}

        {/* LISTA DE PRODUCTOS */}
        <Row xs={2} md={3} lg={4} className="g-3 g-md-4">
          {productosFiltrados.map(prod => (
              <Col key={prod.id}>
                <div className="shaday-card h-100 d-flex flex-column">
                  {/* Imagen */}
                  <div style={{height: '220px', overflow: 'hidden', position: 'relative', backgroundColor: '#fff'}}>
                     <Link to={`/productos/${prod.id}`}>
                        <img 
                            src={prod.imagen || "https://via.placeholder.com/400?text=Producto"} 
                            alt={prod.nombre}
                            loading="lazy" /* 3. LAZY LOADING (Ahorra datos) */
                            style={{width: '100%', height: '100%', objectFit: 'contain', padding: '10px'}}
                        />
                     </Link>
                     {/* Badge de Stock */}
                     <div className="position-absolute top-0 end-0 m-2">
                        {prod.stock_disponible === 0 ? (
                            <span className="stock-badge stock-no">Agotado</span>
                        ) : prod.stock_disponible < 10 ? (
                            <span className="stock-badge stock-low">¡Quedan {prod.stock_disponible}!</span>
                        ) : (
                            <span className="stock-badge stock-ok">Disponible</span>
                        )}
                     </div>
                  </div>

                  {/* Info */}
                  <div className="p-3 d-flex flex-column flex-grow-1">
                    <div className="mb-2">
                        <small className="text-muted text-uppercase" style={{fontSize: '0.7rem'}}>SKU: {prod.sku}</small>
                        <Link to={`/productos/${prod.id}`} className="d-block fw-bold text-dark text-decoration-none text-truncate" title={prod.nombre}>
                            {prod.nombre}
                        </Link>
                    </div>
                    
                    <div className="mt-auto d-flex justify-content-between align-items-center">
                        <span style={{color: 'var(--azul-medio)', fontSize: '1.25rem', fontWeight: '800'}}>
                            ${parseFloat(prod.precio).toFixed(2)}
                        </span>
                        <button 
                            className="btn btn-light border rounded-circle p-2 text-primary d-flex align-items-center justify-content-center"
                            style={{width: '40px', height: '40px'}}
                            onClick={() => addToCart(prod)}
                            disabled={prod.stock_disponible === 0}
                            title="Añadir al carrito"
                        >
                            <ShoppingBag size={20} />
                        </button>
                    </div>
                  </div>
                </div>
              </Col>
          ))}
        </Row>
      </Container>
    </div>
  );
}
export default Inicio;