import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Alert from 'react-bootstrap/Alert';

const API_URL = 'http://127.0.0.1:8000/api/categorias/';

function CategoryList() {
  const [categorias, setCategorias] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(API_URL)
      .then(response => {
        setCategorias(response.data);
      })
      .catch(error => {
        console.error('¡Hubo un error al cargar las categorías!', error);
        setError(error);
      });
  }, []);

  if (error) { return <Alert variant="warning">Error al cargar categorías.</Alert>; }

  return (
    <div className="mb-5">
      <h2 className="mb-4">Nuestras Categorías</h2>
      <Row xs={1} md={3} lg={5} className="g-4">
        {categorias.map(categoria => (
          <Col key={categoria.id}>
            <Link to={`/categoria/${categoria.id}`} style={{ textDecoration: 'none' }}>
              <Card className="text-center h-100 shadow-sm">
                <Card.Body>
                  <Card.Title className="mt-2">{categoria.nombre}</Card.Title>
                </Card.Body>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
    </div>
  );
}

export default CategoryList;