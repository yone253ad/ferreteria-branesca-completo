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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Hacemos las peticiones en paralelo
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
    fetchData();
  }, [auth.axiosApi]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await auth.axiosApi.patch(`/inventario/${editingId}/`, formData);
      } else {
        await auth.axiosApi.post('/inventario/', formData);
      }
      alert('Guardado.');
      setShowModal(false);
      // Recargar página completa para refrescar datos (simple y seguro)
      window.location.reload(); 
    } catch (err) { alert("Error al guardar."); }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({ 
        producto: item.producto, // El backend ahora devuelve el ID directo en algunas configuraciones, o el objeto
        sucursal: item.sucursal,
        cantidad: item.cantidad 
    });
    setShowModal(true);
  };

  // Helpers seguros: Si el backend manda objeto (por el select_related), usamos .nombre
  // Si manda ID, buscamos en la lista.
  const getNombreProducto = (prod) => {
      if (typeof prod === 'object') return prod.nombre; 
      return productos.find(p => p.id === prod)?.nombre || prod;
  };
  
  const getNombreSucursal = (suc) => {
      if (typeof suc === 'object') return suc.nombre;
      return sucursales.find(s => s.id === suc)?.nombre || suc;
  };

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;

  return (
    <div className="p-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Inventario</h2>
        <Button variant="success" onClick={() => { setEditingId(null); setFormData({}); setShowModal(true); }}>+ Asignar Stock</Button>
      </div>

      <div className="bg-white shadow-sm rounded">
        <Table striped hover responsive className="mb-0 align-middle">
            <thead className="bg-dark text-white">
            <tr>
                <th>Producto</th>
                <th>Sucursal</th>
                <th>Stock</th>
                <th>Acción</th>
            </tr>
            </thead>
            <tbody>
            {inventarios.map(inv => (
                <tr key={inv.id}>
                <td className="fw-bold">{getNombreProducto(inv.producto)}</td> 
                <td>{getNombreSucursal(inv.sucursal)}</td>
                <td>
                    <Badge bg={inv.cantidad < 10 ? 'danger' : 'success'} style={{fontSize:'0.9rem'}}>
                        {inv.cantidad} u.
                    </Badge>
                </td>
                <td>
                    <Button variant="outline-primary" size="sm" onClick={() => handleEdit(inv)}>Editar</Button>
                </td>
                </tr>
            ))}
            </tbody>
        </Table>
      </div>

      {/* Modal Formulario (Simplificado para brevedad, usa lógica anterior de Selects) */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
         <Modal.Header closeButton><Modal.Title>Gestionar Stock</Modal.Title></Modal.Header>
         <Modal.Body>
             <Form onSubmit={handleSubmit}>
                 {!editingId && (
                     <>
                        <Form.Group className="mb-3">
                            <Form.Label>Producto</Form.Label>
                            <Form.Select onChange={e=>setFormData({...formData, producto: e.target.value})} required>
                                <option value="">Seleccione...</option>
                                {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Sucursal</Form.Label>
                            <Form.Select onChange={e=>setFormData({...formData, sucursal: e.target.value})} required>
                                <option value="">Seleccione...</option>
                                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </Form.Select>
                        </Form.Group>
                     </>
                 )}
                 <Form.Group className="mb-3">
                    <Form.Label>Cantidad</Form.Label>
                    <Form.Control type="number" onChange={e=>setFormData({...formData, cantidad: e.target.value})} required />
                 </Form.Group>
                 <Button type="submit" className="w-100">Guardar</Button>
             </Form>
         </Modal.Body>
      </Modal>
    </div>
  );
}
export default GestionInventario;