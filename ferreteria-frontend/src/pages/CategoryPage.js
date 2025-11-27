import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useCart } from '../context/CartContext'; // <-- CORREGIDO (..)
import { Link, useParams } from 'react-router-dom';

import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Alert from 'react-bootstrap/Alert';

// Importación corregida
import CategoryList from '../components/CategoryList'; // <-- CORREGIDO (..)

function CategoryPage() {
  const [productos, setProductos] = useState([]);
  const [error, setError] = useState(null);
  const cart = useCart();
  
  const { id_categoria } = useParams(); 
  const API_URL = `http://127.0.0.1:8000/api/productos/?categoria=${id_categoria}`;

  useEffect(() => {
    setProductos([]); 
    axios.get(API_URL)
      .then(response => {
        setProductos(response.data);
      })
      .catch(error => {
        setError(error);
      });
  }, [id_categoria, API_URL]); 

  const handleAddToCart = (producto) => {
    cart.addToCart(producto);
    alert(`${producto.nombre} fue agregado al carrito.`);
  };

  return (
    <div>
      <h2 className="mb-4">Productos de la Categoría</h2>

      <CategoryList />

      <hr className="my-4" />
      
      {error && <Alert variant="danger">Error al cargar: {error.message}</Alert>}
      
      <Row xs={1} md={3} lg={4} className="g-4">
        {productos.length > 0 ? (
          productos.map(producto => (
            <Col key={producto.id}>
              <Card className="h-100">
                <Card.Img 
                  variant="top" 
                  src={producto.imagen || "https://via.placeholder.com/300x200.png?text=Sin+Imagen"} 
                  alt={producto.nombre} 
                  style={{ height: '200px', objectFit: 'cover' }}
                />
                <Card.Body>
                  <Card.Title>
                    <Link to={`/productos/${producto.id}`}>
                      {producto.nombre}
                    </Link>
                  </Card.Title>
                  <Card.Text>
                    {producto.descripcion}
                  </Card.Text>
                  <Card.Text as="h5">
                    ${parseFloat(producto.precio).toFixed(2)}
                  </Card.Text>
                  <Button variant="primary" onClick={() => handleAddToCart(producto)}>
                    Añadir al Carrito
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))
        ) : (
          <Col>
            <p>No se encontraron productos en esta categoría.</p>
          </Col>
        )}
      </Row>
    </div>
  );
}

export default CategoryPage;