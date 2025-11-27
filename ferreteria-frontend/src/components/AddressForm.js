import React, { useState } from 'react';
import axios from 'axios';
import { Form, Button, Alert } from 'react-bootstrap';
// Se eliminó useAuth ya que no usábamos axiosApi aquí, usábamos axios directo con token manual
// import { useAuth } from '../context/AuthContext'; 

const API_URL = 'http://127.0.0.1:8000/api/direcciones/';

function AddressForm({ onAddressAdded, onCancel }) {
  // Eliminamos la línea que causaba el warning:
  // const { axiosApi } = useAuth(); 
  
  const [formData, setFormData] = useState({
    nombre_completo: '',
    direccion: '',
    ciudad: '',
    departamento: '',
    telefono: ''
  });
  
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    if (validationErrors[e.target.name]) {
      setValidationErrors({ ...validationErrors, [e.target.name]: null });
    }
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    const errors = {};
    const phoneRegex = /^\d{8}$/; 
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;

    if (!nameRegex.test(formData.nombre_completo)) {
      errors.nombre_completo = "El nombre solo puede contener letras.";
    }
    if (!phoneRegex.test(formData.telefono)) {
      errors.telefono = "El teléfono debe tener 8 dígitos numéricos.";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('accessToken');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      const res = await axios.post(API_URL, formData, config);
      onAddressAdded(res.data);
      setFormData({ nombre_completo: '', direccion: '', ciudad: '', departamento: '', telefono: '' });
    } catch (err) {
      console.error("Error creando dirección:", err);
      setError("Error al guardar la dirección. Verifica los datos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit} className="border p-3 rounded bg-light mt-3 shadow-sm">
      <h5 className="mb-3 text-primary">Nueva Dirección de Envío</h5>
      {error && <Alert variant="danger">{error}</Alert>}

      <Form.Group className="mb-2">
        <Form.Label>Nombre de quien recibe</Form.Label>
        <Form.Control 
          name="nombre_completo" 
          value={formData.nombre_completo} 
          onChange={handleChange} 
          required 
          placeholder="Ej: Juan Pérez"
          isInvalid={!!validationErrors.nombre_completo}
        />
        <Form.Control.Feedback type="invalid">{validationErrors.nombre_completo}</Form.Control.Feedback>
      </Form.Group>

      <Form.Group className="mb-2">
        <Form.Label>Dirección Exacta</Form.Label>
        <Form.Control 
            as="textarea" rows={2} name="direccion" value={formData.direccion} onChange={handleChange} 
            required placeholder="Barrio, calle, número de casa..." 
        />
      </Form.Group>

      <div className="d-flex gap-2 mb-2">
        <Form.Group className="flex-grow-1">
          <Form.Label>Ciudad</Form.Label>
          <Form.Control name="ciudad" value={formData.ciudad} onChange={handleChange} required />
        </Form.Group>
        <Form.Group className="flex-grow-1">
          <Form.Label>Departamento</Form.Label>
          <Form.Control name="departamento" value={formData.departamento} onChange={handleChange} required />
        </Form.Group>
      </div>

      <Form.Group className="mb-3">
        <Form.Label>Teléfono</Form.Label>
        <Form.Control 
          name="telefono" value={formData.telefono} onChange={handleChange} 
          required placeholder="88888888" isInvalid={!!validationErrors.telefono}
        />
        <Form.Control.Feedback type="invalid">{validationErrors.telefono}</Form.Control.Feedback>
      </Form.Group>

      <div className="d-flex justify-content-end gap-2">
        {onCancel && <Button variant="secondary" size="sm" onClick={onCancel}>Cancelar</Button>}
        <Button variant="success" size="sm" type="submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar Dirección'}
        </Button>
      </div>
    </Form>
  );
}

export default AddressForm;