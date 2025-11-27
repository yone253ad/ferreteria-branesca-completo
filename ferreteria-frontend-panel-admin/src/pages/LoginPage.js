import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Form, Button, Alert, Container, Row, Col, Card } from 'react-bootstrap';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const auth = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await auth.login(username, password);
      
      // --- LÓGICA DE REDIRECCIÓN POR ROL ---
      // Obtenemos el rol directamente del estado actualizado o del localStorage temporal
      // (Como auth.authUser podría tardar un milisegundo en actualizarse, 
      //  podemos confiar en que el login fue exitoso).
      
      // Una forma segura es leer el rol decodificado o esperar, 
      // pero para este flujo rápido, haremos una redirección general 
      // y dejaremos que el Router maneje la protección.
      // Sin embargo, para mejor UX, intentemos dirigir bien:
      
      // Nota: auth.login ya guardó el usuario en el contexto.
      // Pero aquí no tenemos acceso directo inmediato al rol dentro de esta función
      // a menos que auth.login nos lo devuelva. 
      
      // Vamos a hacer una redirección genérica a la raíz '/', 
      // y en App.js manejaremos la redirección si no tienen permiso.
      navigate('/'); 

    } catch (err) {
      console.error("Error capturado en LoginPage:", err); 
      setError(err.message || "Un error inesperado ocurrió.");
    }
  };

  return (
    <Container style={{ height: '100vh' }} className="d-flex align-items-center justify-content-center">
      <Row>
        <Col md={12}>
          <Card style={{ width: '25rem' }} className="shadow-sm">
            <Card.Body className="p-4">
              <h2 className="text-center mb-4">Acceso Branesca</h2>
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="username">
                  <Form.Label>Usuario</Form.Label>
                  <Form.Control type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
                </Form.Group>
                <Form.Group className="mb-3" controlId="password">
                  <Form.Label>Contraseña</Form.Label>
                  <Form.Control type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </Form.Group>
                {error && <Alert variant="danger">{error}</Alert>}
                <div className="d-grid">
                  <Button variant="primary" type="submit">Entrar</Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default LoginPage;