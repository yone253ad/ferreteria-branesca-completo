import React, { useState, useEffect } from 'react';
import axios from 'axios';
// --- CORRECCIÓN: Usamos '..' para subir de nivel ---
import { useAuth } from '../context/AuthContext'; 
import { Alert, ListGroup, Card, Spinner, Button, Badge } from 'react-bootstrap';

const HISTORIAL_URL = 'http://127.0.0.1:8000/api/historial-pedidos/';
const CANCELAR_URL = 'http://127.0.0.1:8000/api/cancelar-pedido/';

function Historial() {
  const [pedidos, setPedidos] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const auth = useAuth();

  const fetchHistorial = () => {
    if (auth.authToken) {
      axios.get(HISTORIAL_URL, {
        headers: { Authorization: `Bearer ${auth.authToken}` }
      })
      .then(res => {
        setPedidos(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('No se pudo cargar el historial.');
        setLoading(false);
      });
    } else {
      setError('Necesitas iniciar sesión para ver tu historial.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistorial();
  }, [auth.authToken]);

  const handleCancelar = async (pedidoId) => {
    if (!window.confirm("¿Estás seguro de que quieres cancelar este pedido?")) return;
    try {
      await axios.post(`${CANCELAR_URL}${pedidoId}/`, {}, {
        headers: { Authorization: `Bearer ${auth.authToken}` }
      });
      alert("Pedido cancelado exitosamente.");
      fetchHistorial(); 
    } catch (err) {
      alert("Error al cancelar: " + (err.response?.data?.error || "Intenta más tarde."));
    }
  };

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;
  if (error) return <Alert variant="danger" className="mt-5 container">{error}</Alert>;

  return (
    <div className="container mt-4 mb-5">
      <h2 className="mb-4">Mi Historial de Pedidos</h2>
      {pedidos.length === 0 ? (
        <Alert variant="info">No has realizado ningún pedido todavía.</Alert>
      ) : (
        <ListGroup>
          {pedidos.map(pedido => (
            <ListGroup.Item key={pedido.id} className="mb-3 border-0 p-0">
              <Card className="shadow-sm">
                <Card.Header as="h5" className="d-flex justify-content-between align-items-center bg-light">
                  <span>Pedido #{pedido.id}</span>
                  <Badge bg={pedido.estado === 'PAGADO' ? 'success' : pedido.estado === 'CANCELADO' ? 'danger' : 'secondary'}>
                    {pedido.estado}
                  </Badge>
                </Card.Header>
                <Card.Body>
                  <Card.Text>
                    <strong>Fecha:</strong> {new Date(pedido.fecha_pedido).toLocaleString()}<br/>
                    <strong>Dirección:</strong> {pedido.direccion_str || 'N/A'}<br/>
                    <strong>Total:</strong> ${parseFloat(pedido.total).toFixed(2)}
                  </Card.Text>
                  <ListGroup variant="flush" className="mb-3">
                    {pedido.detalles.map((detalle, index) => (
                      <ListGroup.Item key={index} className="d-flex justify-content-between px-0">
                        <span>{detalle.producto.nombre} (x{detalle.cantidad})</span>
                        <span>${detalle.precio_unitario}</span>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                  {['PAGADO', 'PENDIENTE'].includes(pedido.estado) && (
                    <div className="d-flex justify-content-end">
                        <Button variant="outline-danger" size="sm" onClick={() => handleCancelar(pedido.id)}>
                            Cancelar Pedido
                        </Button>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </div>
  );
}
export default Historial;