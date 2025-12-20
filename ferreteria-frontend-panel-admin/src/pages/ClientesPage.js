import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Table, Button, Modal, Form, Row, Col, Badge, InputGroup, Spinner, Alert } from 'react-bootstrap';
import { Users, Plus, Edit2, Search, CreditCard, Phone, MapPin } from 'lucide-react';

function ClientesPage() {
  const auth = useAuth();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '', ruc: '', telefono: '', direccion: '', email: '',
    limite_credito: 0, dias_credito: 0
  });

  const fetchClientes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await auth.axiosApi.get('/clientes/');
      setClientes(res.data);
    } catch(e) { console.error(e); } 
    finally { setLoading(false); }
  }, [auth.axiosApi]);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) await auth.axiosApi.patch(`/clientes/${editingId}/`, formData);
      else await auth.axiosApi.post('/clientes/', formData);
      setShowModal(false);
      fetchClientes();
      alert("Cliente guardado.");
    } catch(e) { alert("Error al guardar cliente. Revise los datos."); }
  };

  const openModal = (c = null) => {
    setEditingId(c?.id || null);
    setFormData(c ? { ...c } : { nombre: '', ruc: '', telefono: '', direccion: '', email: '', limite_credito: 0, dias_credito: 0 });
    setShowModal(true);
  };

  const clientesFiltrados = clientes.filter(c => 
    c.nombre.toLowerCase().includes(filtro.toLowerCase()) || 
    (c.ruc && c.ruc.includes(filtro))
  );

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between mb-4 align-items-center">
        <div>
            <h2><Users className="me-2"/> Cartera de Clientes</h2>
            <p className="text-muted">Gestión comercial y límites de crédito.</p>
        </div>
        <Button onClick={() => openModal()} variant="success"><Plus size={18}/> Nuevo Cliente</Button>
      </div>

      <InputGroup className="mb-3 shadow-sm" style={{maxWidth: '400px'}}>
        <InputGroup.Text className="bg-white border-end-0"><Search size={18} className="text-muted"/></InputGroup.Text>
        <Form.Control className="border-start-0" placeholder="Buscar por nombre o RUC..." onChange={e => setFiltro(e.target.value)}/>
      </InputGroup>

      <div className="bg-white shadow-sm rounded overflow-hidden">
        <Table hover responsive className="mb-0 align-middle">
          <thead className="bg-light">
            <tr>
              <th>Nombre / RUC</th>
              <th>Contacto</th>
              <th>Estado Financiero</th>
              <th className="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map(c => (
              <tr key={c.id}>
                <td>
                    <div className="fw-bold">{c.nombre}</div>
                    <Badge bg="light" text="dark" className="border">{c.ruc || 'Sin RUC'}</Badge>
                </td>
                <td>
                    <div className="small"><Phone size={14} className="me-1"/>{c.telefono || '-'}</div>
                    <div className="small text-muted"><MapPin size={14} className="me-1"/>{c.direccion || '-'}</div>
                </td>
                <td>
                    {parseFloat(c.limite_credito) > 0 ? (
                        <div>
                            <Badge bg="success" className="mb-1">Límite: C$ {parseFloat(c.limite_credito).toFixed(2)}</Badge>
                            <div className="small text-muted">Plazo: <strong>{c.dias_credito} días</strong></div>
                        </div>
                    ) : <Badge bg="secondary">Contado</Badge>}
                </td>
                <td className="text-end">
                    <Button size="sm" variant="outline-primary" onClick={() => openModal(c)}><Edit2 size={16}/></Button>
                </td>
              </tr>
            ))}
            {clientesFiltrados.length === 0 && <tr><td colSpan="4" className="text-center py-4">No se encontraron clientes.</td></tr>}
          </tbody>
        </Table>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton><Modal.Title>{editingId ? 'Editar' : 'Nuevo'} Cliente</Modal.Title></Modal.Header>
        <Modal.Body>
            <Form onSubmit={handleSubmit}>
                <Row className="mb-3">
                    <Col><Form.Label>Nombre / Razón Social</Form.Label><Form.Control required value={formData.nombre} onChange={e=>setFormData({...formData, nombre: e.target.value})} /></Col>
                    <Col><Form.Label>RUC / Cédula</Form.Label><Form.Control value={formData.ruc} onChange={e=>setFormData({...formData, ruc: e.target.value})} /></Col>
                </Row>
                <Row className="mb-3">
                    <Col><Form.Label>Teléfono</Form.Label><Form.Control value={formData.telefono} onChange={e=>setFormData({...formData, telefono: e.target.value})} /></Col>
                    <Col><Form.Label>Email</Form.Label><Form.Control type="email" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} /></Col>
                </Row>
                <Form.Group className="mb-4">
                    <Form.Label>Dirección</Form.Label>
                    <Form.Control as="textarea" rows={2} value={formData.direccion} onChange={e=>setFormData({...formData, direccion: e.target.value})} />
                </Form.Group>
                
                <div className="p-3 bg-light rounded border">
                    <h6 className="text-primary mb-3"><CreditCard size={18} className="me-2"/>Configuración de Crédito</h6>
                    <Row>
                        <Col>
                            <Form.Label>Límite de Crédito (C$)</Form.Label>
                            <Form.Control type="number" step="0.01" value={formData.limite_credito} onChange={e=>setFormData({...formData, limite_credito: e.target.value})} />
                            <Form.Text className="text-muted">0 = Solo Contado</Form.Text>
                        </Col>
                        <Col>
                            <Form.Label>Días de Plazo</Form.Label>
                            <Form.Control type="number" value={formData.dias_credito} onChange={e=>setFormData({...formData, dias_credito: e.target.value})} />
                            <Form.Text className="text-muted">Días antes de aplicar mora.</Form.Text>
                        </Col>
                    </Row>
                </div>

                <div className="mt-4 text-end">
                    <Button variant="secondary" className="me-2" onClick={() => setShowModal(false)}>Cancelar</Button>
                    <Button type="submit" variant="primary">Guardar Cliente</Button>
                </div>
            </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}
export default ClientesPage;