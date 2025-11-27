// Este código reemplaza todo en: src/pages/GestionPedidos.js

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Table, Form, Button, Alert, Spinner } from 'react-bootstrap';

function GestionPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const auth = useAuth();

  const fetchPedidos = async () => {
    try {
      setLoading(true); setError(null);
      const response = await auth.axiosApi.get('/gestion-pedidos/');
      setPedidos(response.data);
      setLoading(false);
    } catch (err) { setError("No se pudieron cargar los pedidos."); setLoading(false); }
  };

  useEffect(() => { fetchPedidos(); }, [auth.axiosApi]);

  const handleEstadoChange = async (pedidoId, nuevoEstado) => {
    try {
      await auth.axiosApi.patch(`/gestion-pedidos/${pedidoId}/`, { estado: nuevoEstado });
      setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, estado: nuevoEstado } : p));
    } catch (err) { alert("No se pudo actualizar el estado."); }
  };

  // --- Función Descargar Factura ---
  const descargarFactura = async (pedidoId) => {
    try {
      const response = await auth.axiosApi.get(`/factura/${pedidoId}/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `factura_${pedidoId}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (err) { alert("Error al descargar la factura."); }
  };

  if (loading) return <Spinner animation="border" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div>
      <h2 className="mb-4">Gestión de Pedidos</h2>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>ID</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Estado</th><th>Factura</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map(pedido => (
            <tr key={pedido.id}>
              <td>{pedido.id}</td>
              <td>{pedido.cliente_username}</td>
              <td>{new Date(pedido.fecha_pedido).toLocaleDateString()}</td>
              <td>${parseFloat(pedido.total).toFixed(2)}</td>
              <td>
                <Form.Select value={pedido.estado} onChange={(e) => handleEstadoChange(pedido.id, e.target.value)}>
                  <option value="PAGADO">Pagado</option>
                  <option value="EN_PROCESO">En Proceso</option>
                  <option value="ENTREGADO">Entregado</option>
                  <option value="CANCELADO">Cancelado</option>
                </Form.Select>
              </td>
              <td>
                <Button variant="secondary" size="sm" onClick={() => descargarFactura(pedido.id)}>📄 PDF</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
export default GestionPedidos;