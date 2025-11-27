import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext'; // <-- CORREGIDO (..)
import { Container, Card, Form, Button, Alert, Tab, Tabs, ListGroup } from 'react-bootstrap';
import AddressForm from '../components/AddressForm'; // <-- CORREGIDO (..)

const API_BASE = 'http://127.0.0.1:8000/api';

function ProfilePage() {
  const { authToken, logout } = useAuth();
  const [key, setKey] = useState('info'); 

  const [userData, setUserData] = useState({ username: '', email: '' });
  const [direcciones, setDirecciones] = useState([]);
  const [passData, setPassData] = useState({ old_password: '', new_password: '' });
  const [msg, setMsg] = useState({});
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const config = { headers: { Authorization: `Bearer ${authToken}` } };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, addrRes] = await Promise.all([
          axios.get(`${API_BASE}/user/me/`, config),
          axios.get(`${API_BASE}/direcciones/`, config)
        ]);
        setUserData(userRes.data);
        setDirecciones(addrRes.data);
      } catch (err) { console.error("Error perfil"); }
    };
    if (authToken) fetchData();
  }, [authToken]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg({});
    try {
      await axios.patch(`${API_BASE}/user/me/`, userData, config);
      setMsg({ type: 'success', text: 'Datos actualizados.' });
    } catch (err) { setMsg({ type: 'danger', text: 'Error al actualizar.' }); }
    finally { setLoading(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg({});
    try {
      await axios.post(`${API_BASE}/user/change-password/`, passData, config);
      setMsg({ type: 'success', text: 'Contraseña cambiada. Inicia sesión.' });
      setTimeout(() => logout(), 2000);
    } catch (err) {
      setMsg({ type: 'danger', text: err.response?.data?.old_password || 'Error al cambiar.' });
    } finally { setLoading(false); }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm("¿Eliminar?")) return;
    try {
      await axios.delete(`${API_BASE}/direcciones/${id}/`, config);
      setDirecciones(direcciones.filter(d => d.id !== id));
    } catch (err) { alert("Error."); }
  };

  const handleAddressAdded = (newAddr) => {
    setDirecciones([...direcciones, newAddr]);
    setShowAddrForm(false);
  };

  return (
    <Container className="mt-4 mb-5">
      <h2 className="mb-4">Mi Perfil</h2>
      {msg.text && <Alert variant={msg.type} onClose={() => setMsg({})} dismissible>{msg.text}</Alert>}

      <Card className="shadow-sm">
        <Card.Body>
          <Tabs activeKey={key} onSelect={(k) => setKey(k)} className="mb-3">
            
            <Tab eventKey="info" title="Mis Datos">
              <Form onSubmit={handleUpdateProfile} className="mt-3" style={{maxWidth: '500px'}}>
                <Form.Group className="mb-3">
                  <Form.Label>Usuario</Form.Label>
                  <Form.Control type="text" value={userData.username} disabled className="bg-light" />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control type="email" value={userData.email} onChange={e => setUserData({...userData, email: e.target.value})} />
                </Form.Group>
                <Button variant="primary" type="submit" disabled={loading}>Guardar Cambios</Button>
              </Form>
            </Tab>

            <Tab eventKey="security" title="Seguridad">
              <Form onSubmit={handleChangePassword} className="mt-3" style={{maxWidth: '500px'}}>
                <Form.Group className="mb-3">
                  <Form.Label>Contraseña Actual</Form.Label>
                  <Form.Control type="password" value={passData.old_password} onChange={e => setPassData({...passData, old_password: e.target.value})} required />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Nueva Contraseña</Form.Label>
                  <Form.Control type="password" value={passData.new_password} onChange={e => setPassData({...passData, new_password: e.target.value})} required minLength={8} />
                </Form.Group>
                <Button variant="warning" type="submit" disabled={loading}>Cambiar Contraseña</Button>
              </Form>
            </Tab>

            <Tab eventKey="addresses" title="Direcciones">
              <div className="mt-3">
                {direcciones.length === 0 && !showAddrForm && <p>No tienes direcciones.</p>}
                <ListGroup className="mb-3">
                  {direcciones.map(dir => (
                    <ListGroup.Item key={dir.id} className="d-flex justify-content-between align-items-center">
                      <div><strong>{dir.nombre_completo}</strong><br/><small>{dir.direccion}</small></div>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDeleteAddress(dir.id)}>x</Button>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
                {!showAddrForm ? (
                  <Button variant="outline-primary" onClick={() => setShowAddrForm(true)}>+ Nueva Dirección</Button>
                ) : (
                  <AddressForm onAddressAdded={handleAddressAdded} onCancel={() => setShowAddrForm(false)} />
                )}
              </div>
            </Tab>

          </Tabs>
        </Card.Body>
      </Card>
    </Container>
  );
}
export default ProfilePage;