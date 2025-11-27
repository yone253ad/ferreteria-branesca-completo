// En: src/pages/RequestReset.js

import React, { useState } from 'react';
import axios from 'axios';
import { Form, Button, Alert, Container, Row, Col, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';

function RequestReset() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Llamamos al endpoint de Django
      await axios.post('http://127.0.0.1:8000/api/password_reset/', { email });
      setMessage('Si el correo existe, te hemos enviado un enlace para restablecer tu contraseña.');
    } catch (err) {
      // Por seguridad, no decimos si el correo existe o no, o mostramos un error genérico
      setError('Error al procesar la solicitud. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-md-center">
        <Col md={6}>
          <Card className="shadow-sm">
            <Card.Body className="p-4">
              <h3 className="text-center mb-4">Recuperar Contraseña</h3>
              <p className="text-muted text-center mb-4">Ingresa tu correo y te enviaremos instrucciones.</p>
              
              {message && <Alert variant="success">{message}</Alert>}
              {error && <Alert variant="danger">{error}</Alert>}
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Correo Electrónico</Form.Label>
                  <Form.Control 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    placeholder="ejemplo@correo.com"
                  />
                </Form.Group>
                <div className="d-grid gap-2">
                  <Button variant="primary" type="submit" disabled={loading}>
                    {loading ? 'Enviando...' : 'Enviar Enlace'}
                  </Button>
                  <Link to="/login" className="btn btn-link">Volver al Login</Link>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default RequestReset;