import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Table, Button, Modal, Form, Alert, Spinner, Badge } from 'react-bootstrap';

function GestionUsuarios() {
  const auth = useAuth();
  
  const [usuarios, setUsuarios] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  // Estado para errores visuales
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    username: '', email: '', password: '', rol: 'VENDEDOR', sucursal: ''
  });

  useEffect(() => {
    const fetchData = async () => {
        try {
          setLoading(true);
          const [usersRes, sucRes] = await Promise.all([
            auth.axiosApi.get('/gestion-usuarios/'),
            auth.axiosApi.get('/sucursales/')
          ]);
          setUsuarios(usersRes.data);
          setSucursales(sucRes.data);
          setLoading(false);
        } catch (err) {
          console.error(err);
          setError("Error al cargar datos.");
          setLoading(false);
        }
      };
    fetchData();
  }, [auth.axiosApi]);

  const reloadData = async () => {
      try {
        const usersRes = await auth.axiosApi.get('/gestion-usuarios/');
        setUsuarios(usersRes.data);
      } catch(e) { console.error(e); }
  };

  // --- VALIDACIONES ---
  const validateForm = () => {
    const newErrors = {};
    
    // 1. Usuario
    if (!formData.username.trim()) newErrors.username = "El usuario es obligatorio.";
    if (formData.username.includes(" ")) newErrors.username = "No debe tener espacios.";

    // 2. Email
    if (!formData.email) newErrors.email = "Email obligatorio.";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Formato inválido.";

    // 3. Contraseña (Mínimo 5 chars si se escribe)
    if (formData.password && formData.password.length < 5) {
        newErrors.password = "Mínimo 5 caracteres.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const dataToSend = { ...formData, sucursal: formData.sucursal || null };
      await auth.axiosApi.post('/gestion-usuarios/', dataToSend);
      alert('¡Usuario creado con éxito!');
      setShowModal(false);
      setFormData({ username: '', email: '', password: '', rol: 'VENDEDOR', sucursal: '' });
      setErrors({});
      reloadData();
    } catch (err) { alert("Error: El Usuario o Email ya existen."); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro de eliminar este usuario?")) {
      try {
        await auth.axiosApi.delete(`/gestion-usuarios/${id}/`);
        reloadData();
      } catch (err) { alert("No se pudo eliminar."); }
    }
  };

  const handleChange = (field, value) => {
      setFormData({ ...formData, [field]: value });
      if (errors[field]) setErrors({ ...errors, [field]: null });
  };

  const getSucursalName = (id) => {
    if (!id) return <span className="text-muted">-</span>;
    const suc = sucursales.find(s => s.id === id);
    return suc ? suc.nombre : 'Desconocida';
  };

  const getRolBadge = (rol) => {
    switch(rol) {
        case 'ADMIN': return 'danger';
        case 'GERENTE': return 'warning';
        case 'VENDEDOR': return 'primary';
        default: return 'secondary';
    }
  };

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h2>Gestión de Personal</h2>
            <p className="text-muted mb-0">Administración de Vendedores y Gerentes</p>
        </div>
        <Button variant="success" onClick={() => { setErrors({}); setShowModal(true); }}>+ Nuevo Empleado</Button>
      </div>

      <Table striped bordered hover responsive className="bg-white shadow-sm">
        <thead className="bg-dark text-white">
          <tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Sucursal</th><th>Estado</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          {usuarios.map(u => (
            <tr key={u.id}>
              <td className="fw-bold">{u.username}</td>
              <td>{u.email}</td>
              <td><Badge bg={getRolBadge(u.rol)}>{u.rol}</Badge></td>
              <td>{getSucursalName(u.sucursal)}</td>
              <td>{u.is_active ? <Badge bg="success">Activo</Badge> : <Badge bg="secondary">Inactivo</Badge>}</td>
              <td><Button variant="danger" size="sm" onClick={() => handleDelete(u.id)}>Eliminar</Button></td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton><Modal.Title>Registrar Empleado</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
                <Form.Label>Usuario <span className="text-danger">*</span></Form.Label>
                <Form.Control 
                    value={formData.username} 
                    onChange={e => handleChange('username', e.target.value)} 
                    isInvalid={!!errors.username}
                    placeholder="Ej: juanperez"
                />
                <Form.Control.Feedback type="invalid">{errors.username}</Form.Control.Feedback>
            </Form.Group>
            
            <Form.Group className="mb-3">
                <Form.Label>Email <span className="text-danger">*</span></Form.Label>
                <Form.Control 
                    type="email" 
                    value={formData.email} 
                    onChange={e => handleChange('email', e.target.value)} 
                    isInvalid={!!errors.email}
                    placeholder="correo@empresa.com"
                />
                <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
                <Form.Label>Contraseña <span className="text-danger">*</span></Form.Label>
                <Form.Control 
                    type="password" 
                    value={formData.password} 
                    onChange={e => handleChange('password', e.target.value)} 
                    isInvalid={!!errors.password}
                />
                <Form.Control.Feedback type="invalid">{errors.password}</Form.Control.Feedback>
                <Form.Text className="text-muted">Mínimo 5 caracteres.</Form.Text>
            </Form.Group>

            <div className="row">
                <div className="col-md-6">
                    <Form.Group className="mb-3"><Form.Label>Rol</Form.Label>
                      <Form.Select value={formData.rol} onChange={e => handleChange('rol', e.target.value)}>
                        <option value="VENDEDOR">Vendedor</option>
                        <option value="GERENTE">Gerente</option>
                        <option value="ADMIN">Administrador</option>
                      </Form.Select>
                    </Form.Group>
                </div>
                <div className="col-md-6">
                    <Form.Group className="mb-3"><Form.Label>Sucursal</Form.Label>
                      <Form.Select value={formData.sucursal} onChange={e => handleChange('sucursal', e.target.value)} disabled={formData.rol === 'ADMIN'}>
                        <option value="">-- Global --</option>
                        {sucursales.map(suc => (<option key={suc.id} value={suc.id}>{suc.nombre}</option>))}
                      </Form.Select>
                    </Form.Group>
                </div>
            </div>
            <div className="d-grid mt-3"><Button type="submit" variant="primary">Guardar</Button></div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}
export default GestionUsuarios;