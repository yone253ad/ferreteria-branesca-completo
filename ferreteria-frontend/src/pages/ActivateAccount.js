import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { Container, Card, Alert, Button, Spinner } from 'react-bootstrap';

function ActivateAccount() {
  const { uid, token } = useParams();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const activate = async () => {
      try {
        // Llamamos a la API para activar
        const url = `http://127.0.0.1:8000/api/activar/${uid}/${token}/`;
        await axios.get(url);
        setStatus('success');
        setMessage('¡Tu cuenta ha sido activada exitosamente!');
      } catch (err) {
        setStatus('error');
        setMessage('El enlace de activación es inválido o ha expirado.');
      }
    };
    activate();
  }, [uid, token]);

  return (
    <Container className="mt-5 d-flex justify-content-center">
      <Card style={{ width: '400px' }} className="text-center shadow">
        <Card.Body className="p-4">
          <h3 className="mb-4">Activación de Cuenta</h3>
          
          {status === 'loading' && (
            <>
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Verificando tu cuenta...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <Alert variant="success">{message}</Alert>
              <Link to="/login">
                <Button variant="primary" className="w-100">Ir a Iniciar Sesión</Button>
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <Alert variant="danger">{message}</Alert>
              <Link to="/registro">
                <Button variant="secondary" className="w-100">Volver al Registro</Button>
              </Link>
            </>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}

export default ActivateAccount;