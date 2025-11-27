import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const REGISTRO_URL = 'http://127.0.0.1:8000/api/registro/';

function Registro() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({}); // Errores específicos por campo
  
  const navigate = useNavigate();

  // --- FUNCIONES DE VALIDACIÓN ---
  const validateForm = () => {
    const errors = {};
    
    // 1. Validar Usuario (Solo letras y espacios)
    const usernameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]+$/;
    if (!usernameRegex.test(username)) {
      errors.username = "El nombre solo puede contener letras y espacios.";
    }

    // 2. Validar Contraseña (Mínimo 8 caracteres)
    if (password.length < 8) {
      errors.password = "La contraseña debe tener al menos 8 caracteres.";
    }

    // 3. Validar Coincidencia
    if (password !== password2) {
      errors.password2 = "Las contraseñas no coinciden.";
    }

    setValidationErrors(errors);
    // Retorna true si no hay errores (objeto vacío)
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Ejecutamos la validación antes de enviar
    if (!validateForm()) {
      return; // Si falla, no enviamos nada al servidor
    }

    try {
      await axios.post(REGISTRO_URL, { username, email, password, password2 });
      alert('¡Usuario registrado exitosamente! Por favor revisa tu correo para activar la cuenta.');
      navigate('/login'); 
    } catch (err) {
      console.error('Error en el registro:', err);
      if (err.response && err.response.data) {
        const errorData = err.response.data;
        // Manejo de errores que vienen del servidor (ej. usuario ya existe)
        if (errorData.username) setError(`Usuario: ${errorData.username[0]}`);
        else if (errorData.email) setError(`Email: ${errorData.email[0]}`);
        else if (errorData.password) setError(`Contraseña: ${errorData.password[0]}`);
        else setError('Error al registrar el usuario.');
      } else {
        setError('Error al conectar con el servidor.');
      }
    }
  };

  return (
    <Container>
      <Row className="justify-content-md-center mt-5">
        <Col md={6}>
          <h2 className="mb-4 text-center">Crear Cuenta</h2>
          <Form onSubmit={handleSubmit} className="shadow-sm p-4 rounded border">
            
            <Form.Group className="mb-3" controlId="regUsername">
              <Form.Label>Nombre Completo / Usuario</Form.Label>
              <Form.Control 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required 
                isInvalid={!!validationErrors.username} // Marca en rojo si hay error
              />
              <Form.Control.Feedback type="invalid">
                {validationErrors.username}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3" controlId="regEmail">
              <Form.Label>Email</Form.Label>
              <Form.Control 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="regPassword">
              <Form.Label>Contraseña</Form.Label>
              <Form.Control 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                isInvalid={!!validationErrors.password}
              />
              <Form.Control.Feedback type="invalid">
                {validationErrors.password}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3" controlId="regPassword2">
              <Form.Label>Confirmar Contraseña</Form.Label>
              <Form.Control 
                type="password" 
                value={password2} 
                onChange={(e) => setPassword2(e.target.value)} 
                required 
                isInvalid={!!validationErrors.password2}
              />
              <Form.Control.Feedback type="invalid">
                {validationErrors.password2}
              </Form.Control.Feedback>
            </Form.Group>
            
            {/* Errores generales del servidor */}
            {error && <Alert variant="danger">{error}</Alert>}
            
            <div className="d-grid">
              <Button variant="primary" type="submit">Crear Cuenta</Button>
            </div>
          </Form>
        </Col>
      </Row>
    </Container>
  );
}

export default Registro;