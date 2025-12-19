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

  const [formData, setFormData] = useState({
    username: '', email: '', password: '', rol: 'VENDEDOR', sucursal: ''
  });

  // --- MOVIDO DENTRO DE USEEFFECT (Para eliminar advertencia) ---
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
  // ------------------------------------------------------------

  // Función auxiliar para recargar datos después de crear/borrar
  const reloadData = async () => {
      try {
        const usersRes = await auth.axiosApi.get('/gestion-usuarios/');
        setUsuarios(usersRes.data);
      } catch(e) { console.error(e); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = { ...formData, sucursal: formData.sucursal || null };
      await auth.axiosApi.post('/gestion-usuarios/', dataToSend);
      alert('¡Usuario creado con éxito!');
      setShowModal(false);
      setFormData({ username: '', email: '', password: '', rol: 'VENDEDOR', sucursal: '' });
      reloadData();
    } catch (err) { alert("Error al crear usuario."); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Eliminar usuario?")) {
      try {
        await auth.axiosApi.delete(`/gestion-usuarios/${id}/`);
        reloadData();
      } catch (err) { alert("No se pudo eliminar."); }
    }
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
        <h2>Gestión de Usuarios</h2>
        <Button variant="success" onClick={() => setShowModal(true)}>+ Nuevo Usuario</Button>
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
            <Form.Group className="mb-3"><Form.Label>Usuario</Form.Label><Form.Control required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Email</Form.Label><Form.Control type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Contraseña</Form.Label><Form.Control type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></Form.Group>
            <div className="row">
                <div className="col-md-6">
                    <Form.Group className="mb-3"><Form.Label>Rol</Form.Label>
                      <Form.Select value={formData.rol} onChange={e => setFormData({...formData, rol: e.target.value})}>
                        <option value="VENDEDOR">Vendedor</option><option value="GERENTE">Gerente</option><option value="ADMIN">Administrador</option><option value="CLIENTE">Cliente</option>
                      </Form.Select>
                    </Form.Group>
                </div>
                <div className="col-md-6">
                    <Form.Group className="mb-3"><Form.Label>Sucursal</Form.Label>
                      <Form.Select value={formData.sucursal} onChange={e => setFormData({...formData, sucursal: e.target.value})} disabled={formData.rol === 'ADMIN'}>
                        <option value="">-- Global --</option>
                        {sucursales.map(suc => (<option key={suc.id} value={suc.id}>{suc.nombre}</option>))}
                      </Form.Select>
                    </Form.Group>
                </div>
            </div>
            <div className="d-grid mt-3"><Button type="submit" variant="primary">Guardar</Button></div>
            <div className="d-flex gap-3">
              <Form.Group className="mb-3 flex-grow-1">
                  <Form.Label>Límite Crédito (C$)</Form.Label>
                  <Form.Control 
                      type="number" 
                      value={formData.limite_credito || 0} 
                      onChange={e => setFormData({...formData, limite_credito: e.target.value})} 
                  />
              </Form.Group>

              <Form.Group className="mb-3 flex-grow-1">
                  <Form.Label>Plazo (Días)</Form.Label>
                  <Form.Control 
                      type="number" 
                      placeholder="Ej: 15, 30"
                      value={formData.dias_credito || 0} 
                      onChange={e => setFormData({...formData, dias_credito: e.target.value})} 
                  />
                  <Form.Text className="text-muted">Días para pagar tras compra.</Form.Text>
              </Form.Group>
          </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}
export default GestionUsuarios;