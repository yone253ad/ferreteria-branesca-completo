import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Table, Button, Modal, Form, Row, Col, Badge, InputGroup, Alert, Spinner } from 'react-bootstrap';
import { Users, Plus, Edit2, Search, CreditCard, Phone, MapPin, Fingerprint, Trash2, DollarSign } from 'lucide-react';

function ClientesPage() {
  const auth = useAuth();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  
  // Modales
  const [showModal, setShowModal] = useState(false);
  const [showAbonoModal, setShowAbonoModal] = useState(false); // Modal de Pago
  const [editingId, setEditingId] = useState(null);
  const [selectedCliente, setSelectedCliente] = useState(null); // Cliente que va a pagar
  const [montoAbono, setMontoAbono] = useState('');
  
  // Estado para los errores de validación
  const [errors, setErrors] = useState({});

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

  // --- LOGICA DE PAGO DE DEUDA ---
  const handleOpenAbono = (cliente) => {
      setSelectedCliente(cliente);
      setMontoAbono('');
      setShowAbonoModal(true);
  };

  const procesarAbono = async () => {
      if (!montoAbono || parseFloat(montoAbono) <= 0) {
          alert("Ingrese un monto válido."); return;
      }
      try {
          const res = await auth.axiosApi.post('/registrar-abono/', {
              cliente_id: selectedCliente.id,
              monto: parseFloat(montoAbono)
          });
          
          alert(`¡Pago Exitoso!\nSe aplicaron: C$ ${res.data.monto_applied || res.data.monto_aplicado}\nCambio: C$ ${res.data.cambio_devuelto || 0}`);
          setShowAbonoModal(false);
          fetchClientes(); // Recargar para ver deuda actualizada
      } catch (e) {
          alert("Error: " + (e.response?.data?.error || "No se pudo procesar el pago."));
      }
  };

  // --- VALIDACIONES ---
  const validateForm = () => {
      const newErrors = {};
      
      if (!formData.nombre.trim()) newErrors.nombre = "El nombre es obligatorio.";
      if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
          newErrors.email = "Correo inválido (falta @ o punto).";
      }

      if (formData.telefono) {
          const cleanPhone = formData.telefono.replace(/\D/g, ''); 
          if (/[a-zA-Z]/.test(formData.telefono)) {
              newErrors.telefono = "❌ No se permiten letras.";
          } 
          else if (cleanPhone.length !== 8) {
              newErrors.telefono = `Debe tener 8 dígitos exactos. (Tienes ${cleanPhone.length})`;
          }
      }

      if (formData.ruc) {
          const val = formData.ruc.replace(/-/g, '').toUpperCase();
          if (val.length !== 14) {
             newErrors.ruc = "La cédula debe tener 14 caracteres.";
          } else if (!/^[0-9]{13}[A-Z]$/.test(val)) {
             newErrors.ruc = "Formato inválido (13 # + 1 Letra).";
          }
      }

      if (parseFloat(formData.limite_credito) < 0) newErrors.limite_credito = "No negativo.";
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingId) await auth.axiosApi.patch(`/clientes/${editingId}/`, formData);
      else await auth.axiosApi.post('/clientes/', formData);
      setShowModal(false);
      fetchClientes();
      alert("Cliente guardado exitosamente.");
    } catch(e) { 
        alert("Error: Verifique duplicados."); 
    }
  };

  const handleDelete = async (id) => {
      if (window.confirm("¿Seguro de ELIMINAR este cliente?")) {
          try {
              await auth.axiosApi.delete(`/clientes/${id}/`);
              fetchClientes();
          } catch(e) {
              alert("⚠️ No se puede eliminar: Tiene historial.");
          }
      }
  };

  const openModal = (c = null) => {
    setErrors({});
    setEditingId(c?.id || null);
    setFormData(c ? { ...c } : { nombre: '', ruc: '', telefono: '', direccion: '', email: '', limite_credito: 0, dias_credito: 0 });
    setShowModal(true);
  };

  const handleChange = (field, value) => {
      let val = value;
      if (field === 'ruc') val = value.toUpperCase();
      setFormData({ ...formData, [field]: val });
      if (errors[field]) setErrors({ ...errors, [field]: null });
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
            <p className="text-muted">Gestión comercial y abonos a deuda.</p>
        </div>
        <Button onClick={() => openModal()} variant="success"><Plus size={18}/> Nuevo Cliente</Button>
      </div>

      <InputGroup className="mb-3 shadow-sm" style={{maxWidth: '400px'}}>
        <InputGroup.Text className="bg-white border-end-0"><Search size={18} className="text-muted"/></InputGroup.Text>
        <Form.Control className="border-start-0" placeholder="Buscar por Nombre o Cédula..." onChange={e => setFiltro(e.target.value)}/>
      </InputGroup>

      <div className="bg-white shadow-sm rounded overflow-hidden">
        <Table hover responsive className="mb-0 align-middle">
          <thead className="bg-light">
            <tr><th>Nombre / Cédula</th><th>Contacto</th><th>Estado Financiero</th><th className="text-end">Acciones</th></tr>
          </thead>
          <tbody>
            {clientesFiltrados.map(c => (
              <tr key={c.id}>
                <td>
                    <div className="fw-bold">{c.nombre}</div>
                    <Badge bg="light" text="dark" className="border"><Fingerprint size={12} className="me-1"/>{c.ruc || 'Sin Cédula'}</Badge>
                </td>
                <td>
                    <div className="small"><Phone size={14} className="me-1"/>{c.telefono || '-'}</div>
                    <div className="small text-muted"><MapPin size={14} className="me-1"/>{c.direccion || '-'}</div>
                </td>
                <td>
                    {parseFloat(c.limite_credito) > 0 ? (
                        <div>
                            <div className="fw-bold text-success mb-1">Límite: C$ {parseFloat(c.limite_credito).toFixed(2)}</div>
                            {/* MOSTRAR DEUDA REAL */}
                            {parseFloat(c.deuda_actual) > 0 ? (
                                <Badge bg="danger">Debe: C$ {parseFloat(c.deuda_actual).toFixed(2)}</Badge>
                            ) : <Badge bg="success">Solvente</Badge>}
                        </div>
                    ) : <Badge bg="secondary">Contado</Badge>}
                </td>
                <td className="text-end">
                    {/* BOTÓN DE PAGAR DEUDA (Solo si tiene deuda) */}
                    {parseFloat(c.deuda_actual) > 0 && (
                        <Button size="sm" variant="success" className="me-2" onClick={() => handleOpenAbono(c)} title="Registrar Abono">
                            <DollarSign size={16}/>
                        </Button>
                    )}
                    <Button size="sm" variant="outline-primary" className="me-2" onClick={() => openModal(c)}><Edit2 size={16}/></Button>
                    <Button size="sm" variant="outline-danger" onClick={() => handleDelete(c.id)}><Trash2 size={16}/></Button>
                </td>
              </tr>
            ))}
            {clientesFiltrados.length === 0 && <tr><td colSpan="4" className="text-center py-4">No se encontraron clientes.</td></tr>}
          </tbody>
        </Table>
      </div>

      {/* MODAL CLIENTE */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton><Modal.Title>{editingId ? 'Editar' : 'Nuevo'} Cliente</Modal.Title></Modal.Header>
        <Modal.Body>
            <Form onSubmit={handleSubmit}>
                <Row className="mb-3">
                    <Col><Form.Label>Nombre <span className="text-danger">*</span></Form.Label><Form.Control value={formData.nombre} onChange={e => handleChange('nombre', e.target.value)} isInvalid={!!errors.nombre} /><Form.Control.Feedback type="invalid">{errors.nombre}</Form.Control.Feedback></Col>
                    <Col><Form.Label>Cédula</Form.Label><Form.Control value={formData.ruc} onChange={e => handleChange('ruc', e.target.value)} isInvalid={!!errors.ruc} placeholder="001-000000-0000L" maxLength={16} /><Form.Control.Feedback type="invalid">{errors.ruc}</Form.Control.Feedback></Col>
                </Row>
                <Row className="mb-3">
                    <Col><Form.Label>Teléfono</Form.Label><Form.Control value={formData.telefono} onChange={e => handleChange('telefono', e.target.value)} isInvalid={!!errors.telefono} /><Form.Control.Feedback type="invalid">{errors.telefono}</Form.Control.Feedback></Col>
                    <Col><Form.Label>Email</Form.Label><Form.Control type="email" value={formData.email} onChange={e => handleChange('email', e.target.value)} isInvalid={!!errors.email} /><Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback></Col>
                </Row>
                <Form.Group className="mb-4"><Form.Label>Dirección</Form.Label><Form.Control as="textarea" rows={2} value={formData.direccion} onChange={e => handleChange('direccion', e.target.value)} /></Form.Group>
                <div className="p-3 bg-light rounded border">
                    <h6 className="text-primary mb-3"><CreditCard size={18} className="me-2"/>Crédito</h6>
                    <Row>
                        <Col><Form.Label>Límite (C$)</Form.Label><Form.Control type="number" value={formData.limite_credito} onChange={e => handleChange('limite_credito', e.target.value)} isInvalid={!!errors.limite_credito} /></Col>
                        <Col><Form.Label>Días Plazo</Form.Label><Form.Control type="number" value={formData.dias_credito} onChange={e => handleChange('dias_credito', e.target.value)} /></Col>
                    </Row>
                </div>
                <div className="mt-4 text-end">
                    <Button variant="secondary" className="me-2" onClick={() => setShowModal(false)}>Cancelar</Button>
                    <Button type="submit" variant="primary">Guardar</Button>
                </div>
            </Form>
        </Modal.Body>
      </Modal>

      {/* MODAL DE ABONO (NUEVO) */}
      <Modal show={showAbonoModal} onHide={() => setShowAbonoModal(false)}>
          <Modal.Header closeButton><Modal.Title>Registrar Pago / Abono</Modal.Title></Modal.Header>
          <Modal.Body>
              {selectedCliente && (
                  <>
                      <Alert variant="info">
                          <strong>Cliente:</strong> {selectedCliente.nombre} <br/>
                          <strong>Deuda Total:</strong> C$ {parseFloat(selectedCliente.deuda_actual).toFixed(2)}
                      </Alert>
                      <Form.Group>
                          <Form.Label>Monto a Abonar (C$)</Form.Label>
                          <Form.Control 
                              type="number" 
                              autoFocus
                              value={montoAbono} 
                              onChange={(e) => setMontoAbono(e.target.value)} 
                              placeholder="0.00"
                          />
                          <Form.Text className="text-muted">
                              El pago se aplicará a las facturas más antiguas primero (FIFO).
                          </Form.Text>
                      </Form.Group>
                  </>
              )}
          </Modal.Body>
          <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowAbonoModal(false)}>Cancelar</Button>
              <Button variant="success" onClick={procesarAbono} disabled={!montoAbono}>Confirmar Pago</Button>
          </Modal.Footer>
      </Modal>
    </div>
  );
}
export default ClientesPage;