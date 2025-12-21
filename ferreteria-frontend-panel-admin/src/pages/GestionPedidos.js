import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Table, Form, Button, Alert, Spinner, Modal, Badge } from 'react-bootstrap';
import { Printer, Save, Edit2 } from 'lucide-react';

function GestionPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para el Modal y Edición
  const [showModal, setShowModal] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedItems, setEditedItems] = useState([]);
  
  const auth = useAuth();

  const fetchPedidos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await auth.axiosApi.get('/gestion-pedidos/');
      setPedidos(response.data);
      setLoading(false);
    } catch (err) { 
      setError("No se pudieron cargar las ventas."); 
      setLoading(false); 
    }
  }, [auth.axiosApi]);

  useEffect(() => { fetchPedidos(); }, [fetchPedidos]);

  const handleEstadoChange = async (pedidoId, nuevoEstado) => {
    try {
      await auth.axiosApi.patch(`/gestion-pedidos/${pedidoId}/`, { estado: nuevoEstado });
      setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, estado: nuevoEstado } : p));
    } catch (err) { alert("Error al actualizar estado."); }
  };

  const openModal = (pedido) => {
      setSelectedPedido(pedido);
      setEditedItems(pedido.detalles ? pedido.detalles.map(d => ({...d})) : []); 
      setEditMode(false);
      setShowModal(true);
  };

  const handleItemChange = (index, field, value) => {
      const newItems = [...editedItems];
      newItems[index][field] = parseFloat(value) || 0;
      setEditedItems(newItems);
  };

  const saveChanges = async () => {
      if(!window.confirm("¿Confirmar cambios en la factura? El total se recalculará.")) return;
      try {
          await auth.axiosApi.patch(`/gestion-pedidos/${selectedPedido.id}/`, {
              detalles_edit: editedItems,
              tasa_mora: selectedPedido.tasa_mora
          });
          alert("Factura actualizada correctamente.");
          setShowModal(false);
          fetchPedidos();
      } catch (e) { alert("Error al guardar cambios."); }
  };

  const calculateTotalPreview = () => {
      return editedItems.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
  };

  // --- CORRECCIÓN PDF ---
  const imprimirFactura = async (id) => {
      try {
          // 1. Pedir BLOB (Binario)
          const response = await auth.axiosApi.get(`/factura/${id}/`, { 
              responseType: 'blob' 
          });
          
          // 2. Crear Blob PDF
          const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
          
          // 3. Crear URL y abrir
          const url = window.URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = url;
          // link.setAttribute('download', `Factura_${id}.pdf`); // Descomenta si quieres descarga forzada
          link.setAttribute('target', '_blank'); // Abrir en nueva pestaña
          document.body.appendChild(link);
          link.click();
          link.parentNode.removeChild(link);
          
      } catch (e) { alert("Error al generar PDF"); }
  };

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div className="p-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="mb-0">Gestión de Ventas</h2>
          <Button variant="outline-primary" onClick={fetchPedidos}>Actualizar</Button>
      </div>

      <div className="bg-white shadow-sm rounded overflow-hidden">
        <Table hover responsive className="mb-0 align-middle">
            <thead className="bg-light">
            <tr>
                <th>ID</th>
                <th>Cliente / Info</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acciones</th>
            </tr>
            </thead>
            <tbody>
            {pedidos.map(p => (
                <tr key={p.id}>
                <td>#{p.id}</td>
                <td>
                    <div className="fw-bold">{p.cliente_username || 'Cliente Mostrador'}</div>
                    <small className="text-muted">{p.sucursal_nombre || 'Sucursal Principal'}</small>
                    {(p.total_con_mora > p.total) && <Badge bg="danger" className="ms-2">Mora</Badge>}
                </td>
                <td>{new Date(p.fecha_pedido).toLocaleDateString()}</td>
                <td className="fw-bold text-success">
                    C$ {parseFloat(p.total_con_mora || p.total).toFixed(2)}
                </td>
                <td>
                    <Form.Select 
                        size="sm" 
                        value={p.estado} 
                        onChange={(e) => handleEstadoChange(p.id, e.target.value)}
                        style={{width: '130px', fontWeight: 'bold'}}
                        className={`text-${p.estado === 'PAGADO' ? 'success' : 'warning'}`}
                    >
                        <option value="PENDIENTE">Pendiente</option>
                        <option value="PAGADO">Pagado</option>
                        <option value="ENTREGADO">Entregado</option>
                        <option value="CANCELADO">Cancelado</option>
                    </Form.Select>
                </td>
                <td>
                    <Button variant="outline-primary" size="sm" className="me-2" onClick={() => openModal(p)} title="Ver/Editar">
                        <Edit2 size={16}/>
                    </Button>
                    <Button variant="outline-secondary" size="sm" onClick={() => imprimirFactura(p.id)} title="Imprimir">
                        <Printer size={16}/>
                    </Button>
                </td>
                </tr>
            ))}
            </tbody>
        </Table>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
            <Modal.Title>
                {editMode ? 'Editando Factura' : 'Detalle de Factura'} #{selectedPedido?.id}
            </Modal.Title>
        </Modal.Header>
        <Modal.Body>
            {selectedPedido && (
                <>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <strong>Cliente:</strong> {selectedPedido.cliente_username || 'Anónimo'} <br/>
                            <small className="text-muted">Vence: {selectedPedido.fecha_vencimiento || 'N/A'}</small>
                        </div>
                        <div>
                           {!editMode && selectedPedido.estado === 'PENDIENTE' && (
                               <Button variant="warning" size="sm" onClick={() => setEditMode(true)}>
                                   <Edit2 size={14}/> Habilitar Edición
                               </Button>
                           )}
                        </div>
                    </div>

                    <div className="row mb-3 p-2 bg-light border rounded mx-0 align-items-center">
                        <div className="col-md-6">
                            {(selectedPedido.total_con_mora > selectedPedido.total) ? (
                                <span className="text-danger fw-bold">¡FACTURA VENCIDA! Aplica mora.</span>
                            ) : (
                                <span className="text-success">En plazo correcto.</span>
                            )}
                        </div>
                        <div className="col-md-6 d-flex justify-content-end align-items-center">
                            <label className="me-2 fw-bold small">Tasa Mora (%):</label>
                            {editMode ? (
                                <Form.Control 
                                    type="number" size="sm" style={{width: '80px'}}
                                    value={selectedPedido.tasa_mora || 0}
                                    onChange={(e) => setSelectedPedido({...selectedPedido, tasa_mora: parseFloat(e.target.value)})}
                                />
                            ) : (
                                <Badge bg="secondary">{selectedPedido.tasa_mora}%</Badge>
                            )}
                        </div>
                    </div>

                    <Table size="sm" bordered>
                        <thead className="bg-light"><tr><th>Producto</th><th style={{width:80}}>Cant</th><th style={{width:100}}>Precio</th><th className="text-end">Subtotal</th></tr></thead>
                        <tbody>
                            {editMode ? (
                                editedItems.map((item, index) => (
                                    <tr key={index}>
                                        <td className="align-middle">{item.producto_nombre || item.producto?.nombre}</td>
                                        <td><Form.Control type="number" size="sm" value={item.cantidad} onChange={(e) => handleItemChange(index, 'cantidad', e.target.value)}/></td>
                                        <td><Form.Control type="number" step="0.01" size="sm" value={item.precio_unitario} onChange={(e) => handleItemChange(index, 'precio_unitario', e.target.value)}/></td>
                                        <td className="text-end align-middle">C$ {(item.cantidad * item.precio_unitario).toFixed(2)}</td>
                                    </tr>
                                ))
                            ) : (
                                selectedPedido.detalles?.map((d, i) => (
                                    <tr key={i}>
                                        <td>{d.producto_nombre || d.producto?.nombre}</td>
                                        <td>{d.cantidad}</td>
                                        <td>C$ {d.precio_unitario}</td>
                                        <td className="text-end">C$ {(d.cantidad * d.precio_unitario).toFixed(2)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>

                    <div className="d-flex flex-column align-items-end mt-3 p-2 bg-light rounded">
                        <div className="text-muted">Subtotal Base: C$ {editMode ? calculateTotalPreview().toFixed(2) : parseFloat(selectedPedido.total).toFixed(2)}</div>
                        
                        {(selectedPedido.total_con_mora > selectedPedido.total) && (
                            <div className="text-danger small">
                                + Mora ({selectedPedido.tasa_mora}%): 
                                C$ {(selectedPedido.total_con_mora - selectedPedido.total).toFixed(2)}
                            </div>
                        )}

                        <h3 className="m-0 text-primary mt-1">
                            Total a Pagar: C$ {editMode ? calculateTotalPreview().toFixed(2) : parseFloat(selectedPedido.total_con_mora).toFixed(2)}
                        </h3>
                    </div>
                </>
            )}
        </Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cerrar</Button>
            {editMode && (
                <Button variant="success" onClick={saveChanges}>
                    <Save size={18} className="me-1"/> Guardar Cambios
                </Button>
            )}
        </Modal.Footer>
      </Modal>
    </div>
  );
}
export default GestionPedidos;