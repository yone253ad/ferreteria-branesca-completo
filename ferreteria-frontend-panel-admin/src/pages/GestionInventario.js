import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Table, Button, Modal, Form, Alert, Spinner, Badge } from 'react-bootstrap';

function GestionInventario() {
  const auth = useAuth();
  
  const [inventarios, setInventarios] = useState([]);
  const [productos, setProductos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ producto: '', sucursal: '', cantidad: '' });
  const [editingId, setEditingId] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, prodRes, sucRes] = await Promise.all([
        auth.axiosApi.get('/inventario/'),
        auth.axiosApi.get('/productos/'),
        auth.axiosApi.get('/sucursales/')
      ]);
      setInventarios(invRes.data);
      setProductos(prodRes.data);
      setSucursales(sucRes.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [auth.axiosApi]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await auth.axiosApi.patch(`/inventario/${editingId}/`, formData);
      } else {
        await auth.axiosApi.post('/inventario/', formData);
      }
      alert('Inventario actualizado.');
      setShowModal(false);
      setEditingId(null);
      setFormData({ producto: '', sucursal: '', cantidad: '' });
      fetchData();
    } catch (err) { 
      alert("Error. Quizás ya existe un registro para este producto en esta sucursal."); 
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    // Dependiendo de cómo devuelva el serializer (ID u objeto), ajustamos:
    // Si item.producto es un objeto, usamos item.producto.id, si es un número, usamos item.producto
    const prodId = typeof item.producto === 'object' ? item.producto.id : item.producto;
    const sucId = typeof item.sucursal === 'object' ? item.sucursal.id : item.sucursal;

    setFormData({ 
        producto: prodId || '',
        sucursal: sucId || '',
        cantidad: item.cantidad 
    });
    setShowModal(true);
  };

  // Helpers seguros para nombres
  const getProdName = (prod) => {
      if (typeof prod === 'object' && prod.nombre) return prod.nombre;
      const found = productos.find(p => p.id === prod);
      return found ? found.nombre : 'Producto #' + prod;
  };

  const getSucName = (suc) => {
      if (typeof suc === 'object' && suc.nombre) return suc.nombre;
      const found = sucursales.find(s => s.id === suc);
      return found ? found.nombre : 'Sucursal #' + suc;
  };

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Control de Inventario</h2>
        <Button variant="success" onClick={() => { setEditingId(null); setFormData({ producto: '', sucursal: '', cantidad: '' }); setShowModal(true); }}>
            + Agregar Stock
        </Button>
      </div>

      <div className="bg-white shadow-sm rounded p-0 overflow-hidden">
        <Table striped hover responsive className="mb-0">
            <thead className="bg-dark text-white">
            <tr>
                <th className="py-3 px-4">Producto</th>
                <th className="py-3 px-4">Sucursal</th>
                <th className="py-3 px-4">Cantidad</th>
                <th className="py-3 px-4">Acciones</th>
            </tr>
            </thead>
            <tbody>
            {inventarios.map(inv => (
                <tr key={inv.id}>
                <td className="px-4 align-middle">{getProdName(inv.producto)}</td> 
                <td className="px-4 align-middle">{getSucName(inv.sucursal)}</td>
                <td className="px-4 align-middle">
                    <Badge bg={inv.cantidad < 10 ? 'danger' : 'success'} style={{fontSize: '0.9rem', padding: '8px 12px'}}>
                        {inv.cantidad}
                    </Badge>
                </td>
                <td className="px-4 align-middle">
                    <Button variant="outline-primary" size="sm" onClick={() => handleEdit(inv)}>
                        Editar Cantidad
                    </Button>
                </td>
                </tr>
            ))}
            {inventarios.length === 0 && (
                <tr><td colSpan="4" className="text-center py-4 text-muted">No hay inventario registrado.</td></tr>
            )}
            </tbody>
        </Table>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
            <Modal.Title>{editingId ? 'Editar Stock' : 'Nuevo Registro de Inventario'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            {!editingId && (
                <>
                    <Form.Group className="mb-3">
                        <Form.Label>Producto</Form.Label>
                        <Form.Select 
                            value={formData.producto} 
                            onChange={e => setFormData({...formData, producto: e.target.value})} 
                            required
                        >
                            <option value="">-- Seleccionar Producto --</option>
                            {productos.map(p => (
                                <option key={p.id} value={p.id}>{p.nombre}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Sucursal</Form.Label>
                        <Form.Select 
                            value={formData.sucursal} 
                            onChange={e => setFormData({...formData, sucursal: e.target.value})} 
                            required
                        >
                            <option value="">-- Seleccionar Sucursal --</option>
                            {sucursales.map(s => (
                                <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </>
            )}
            
            <Form.Group className="mb-3">
                <Form.Label>Cantidad</Form.Label>
                <Form.Control 
                    type="number" 
                    value={formData.cantidad} 
                    onChange={e => setFormData({...formData, cantidad: e.target.value})} 
                    required 
                    min="0"
                />
            </Form.Group>
            
            <div className="d-grid gap-2">
                <Button type="submit" variant="primary" size="lg">Guardar</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default GestionInventario;