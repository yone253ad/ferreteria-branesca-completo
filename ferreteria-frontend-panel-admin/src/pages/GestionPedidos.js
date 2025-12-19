import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Table, Form, Button, Alert, Spinner, Badge, Modal } from 'react-bootstrap';
import { Eye, Printer } from 'lucide-react';

function GestionPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null);
  
  const auth = useAuth();

  const fetchPedidos = async () => {
    try {
      setLoading(true);
      const response = await auth.axiosApi.get('/gestion-pedidos/');
      setPedidos(response.data);
      setLoading(false);
    } catch (err) { 
      setError("No se pudieron cargar las ventas."); 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchPedidos(); }, [auth.axiosApi]);

  const handleEstadoChange = async (pedidoId, nuevoEstado) => {
    try {
      await auth.axiosApi.patch(`/gestion-pedidos/${pedidoId}/`, { estado: nuevoEstado });
      // Actualización optimista local
      setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, estado: nuevoEstado } : p));
    } catch (err) { alert("Error al actualizar estado."); }
  };

  const verDetalles = (pedido) => {
      setSelectedPedido(pedido);
      setShowModal(true);
  };

  const imprimirFactura = async (id) => {
      try {
          const response = await auth.axiosApi.get(`/factura/${id}/`, { responseType: 'blob' });
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `Factura_${id}.pdf`);
          document.body.appendChild(link);
          link.click();
          link.remove();
      } catch (e) { alert("Error al descargar PDF"); }
  };

  const getBadgeColor = (estado) => {
      switch(estado) {
          case 'PAGADO': return 'success';
          case 'ENTREGADO': return 'primary';
          case 'PENDIENTE': return 'warning';
          case 'CANCELADO': return 'danger';
          default: return 'secondary';
      }
  };

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div className="p-3">
      <h2 className="mb-4">Gestión de Ventas</h2>
      <div className="bg-white shadow-sm rounded overflow-hidden">
        <Table striped hover responsive className="mb-0 align-middle">
            <thead className="bg-light">
            <tr>
                <th>ID</th>
                <th>Cliente / Vendedor</th>
                <th>Fecha</th>
                <th>Sucursal</th>
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
                    <small className="text-muted">Vend: {p.vendedor ? 'Cajero' : 'Web'}</small>
                </td>
                <td>{new Date(p.fecha_pedido).toLocaleDateString()}</td>
                <td>{p.sucursal_nombre}</td>
                <td className="fw-bold text-success">${parseFloat(p.total).toFixed(2)}</td>
                <td>
                    <Form.Select 
                        size="sm" 
                        value={p.estado} 
                        onChange={(e) => handleEstadoChange(p.id, e.target.value)}
                        style={{width: '130px', fontWeight: 'bold'}}
                        className={`text-${getBadgeColor(p.estado)} border-${getBadgeColor(p.estado)}`}
                    >
                        <option value="PAGADO">Pagado</option>
                        <option value="EN_PROCESO">En Proceso</option>
                        <option value="ENTREGADO">Entregado</option>
                        <option value="CANCELADO">Cancelado</option>
                    </Form.Select>
                </td>
                <td>
                    <Button variant="outline-info" size="sm" className="me-2" onClick={() => verDetalles(p)} title="Ver Detalles">
                        <Eye size={16}/>
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

      {/* Modal de Detalles */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton><Modal.Title>Detalles del Pedido #{selectedPedido?.id}</Modal.Title></Modal.Header>
        <Modal.Body>
            {selectedPedido && (
                <>
                    <h5>Productos:</h5>
                    <Table size="sm">
                        <thead><tr><th>Producto</th><th>Cant</th><th>Precio</th><th>Subtotal</th></tr></thead>
                        <tbody>
                            {selectedPedido.detalles.map((d, i) => (
                                <tr key={i}>
                                    <td>{d.producto.nombre}</td>
                                    <td>{d.cantidad}</td>
                                    <td>${d.precio_unitario}</td>
                                    <td>${(d.cantidad * d.precio_unitario).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                    <div className="text-end fw-bold fs-5">Total: ${selectedPedido.total}</div>
                </>
            )}
        </Modal.Body>
      </Modal>
    </div>
  );
}
export default GestionPedidos;