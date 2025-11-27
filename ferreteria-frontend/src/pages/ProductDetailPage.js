import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext'; // <-- CORREGIDO (..)

import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';

import SEO from '../components/SEO'; // <-- CORREGIDO (..)

const BACKEND_URL = 'http://127.0.0.1:8000';

function ProductDetailPage() {
  const [producto, setProducto] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const { id } = useParams(); 
  const cart = useCart();
  
  const API_URL = `${BACKEND_URL}/api/productos/${id}/`;

  useEffect(() => {
    axios.get(API_URL)
      .then(response => {
        setProducto(response.data);
        setLoading(false);
      })
      .catch(error => {
        setError('No se pudo cargar el producto.');
        setLoading(false);
      });
  }, [id, API_URL]);

  const handleAddToCart = (producto) => {
    cart.addToCart(producto);
  };

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!producto) return <Alert variant="warning">Producto no encontrado.</Alert>;

  const imageUrl = producto.imagen || null;

  return (
    <div>
      <SEO 
        title={producto.nombre} 
        description={producto.descripcion}
        image={imageUrl}
      />

      <Row>
        <Col md={6}>
          <Card.Img 
            variant="top" 
            src={producto.imagen || "https://via.placeholder.com/600x400.png?text=Sin+Imagen"} 
            alt={producto.nombre} 
            className="img-fluid rounded" 
          />
        </Col>
        <Col md={6}>
          <h2>{producto.nombre}</h2>
          <h3 className="text-muted">${parseFloat(producto.precio).toFixed(2)}</h3>
          
          <p className="mb-3">
            <strong>Estado: </strong>
            {producto.stock_disponible > 0 
              ? <span className="text-success fw-bold">{producto.stock_disponible} disponibles</span>
              : <span className="text-danger fw-bold">AGOTADO</span>
            }
          </p>

          <p className="lead">{producto.descripcion}</p>
          <p><strong>SKU:</strong> {producto.sku}</p>
          <div className="d-grid gap-2">
            <Button 
              variant="primary" 
              size="lg" 
              onClick={() => handleAddToCart(producto)}
              disabled={producto.stock_disponible === 0}
            >
              {producto.stock_disponible === 0 ? 'Agotado' : 'Añadir al Carrito'}
            </Button>
            <Button as={Link} to="/" variant="secondary">Volver al Catálogo</Button>
          </div>
        </Col>
      </Row>
    </div>
  );
}

export default ProductDetailPage;