import React, { useState, useEffect, useCallback } from 'react'; // Importamos useCallback
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Alert, ListGroup, Card, Spinner, Button, Badge } from 'react-bootstrap';

const HISTORIAL_URL = 'http://127.0.0.1:8000/api/historial-pedidos/';
const CANCELAR_URL = 'http://127.0.0.1:8000/api/cancelar-pedido/';

function Historial() {
  const [pedidos, setPedidos] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = useAuth();

  // Usamos useCallback para que la función sea estable y no cambie en cada render
  const fetchHistorial = useCallback(() => {
    if (auth.authToken) {
      axios.get(HISTORIAL_URL, { headers: { Authorization: `Bearer ${auth.authToken}` } })
        .then(res => { setPedidos(res.data); setLoading(false); })
        .catch(err => { setError('No se pudo cargar el historial.'); setLoading(false); });
    } else {
      setError('Inicia sesión para ver tu historial.'); setLoading(false);
    }
  }, [auth.authToken]); // Dependencia correcta

  useEffect(() => { 
    fetchHistorial(); 
  }, [fetchHistorial]); // Ahora sí podemos incluirla

  const handleCancelar = async (pedidoId) => {
    if (!window.confirm("¿Cancelar pedido?")) return;
    try {
      await axios.post(`${CANCELAR_URL}${pedidoId}/`, {}, { headers: { Authorization: `Bearer ${auth.authToken}` } });
      alert("Pedido cancelado."); fetchHistorial(); 
    } catch (err) { alert("Error al cancelar."); }
  };

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;
  if (error) return <Alert variant="danger" className="mt-5 container">{error}</Alert>;

  return (
    <div className="container mt-4 mb-5">
      <h2 className="mb-4">Mi Historial</h2>
      {pedidos.length === 0 ? <Alert variant="info">No tienes pedidos.</Alert> : 
        <ListGroup>
          {pedidos.map(pedido => (
            <ListGroup.Item key={pedido.id} className="mb-3 border-0 p-0">
              <Card className="shadow-sm">
                <Card.Header as="h5" className="d-flex justify-content-between align-items-center bg-light">
                  <span>Pedido #{pedido.id}</span>
                  <Badge bg={pedido.estado === 'PAGADO' ? 'success' : pedido.estado === 'CANCELADO' ? 'danger' : 'secondary'}>{pedido.estado}</Badge>
                </Card.Header>
                <Card.Body>
                  <Card.Text>
                    <strong>Fecha:</strong> {new Date(pedido.fecha_pedido).toLocaleString()}<br/>
                    <strong>Total:</strong> ${parseFloat(pedido.total).toFixed(2)}
                  </Card.Text>
                  <ListGroup variant="flush" className="mb-3">
                    {pedido.detalles.map((d, i) => (
                      <ListGroup.Item key={i} className="d-flex justify-content-between px-0">
                        <span>{d.producto.nombre} (x{d.cantidad})</span>
                        <span>${d.precio_unitario}</span>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                  {['PAGADO', 'PENDIENTE'].includes(pedido.estado) && (
                    <div className="d-flex justify-content-end">
                        <Button variant="outline-danger" size="sm" onClick={() => handleCancelar(pedido.id)}>Cancelar Pedido</Button>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </ListGroup.Item>
          ))}
        </ListGroup>
      }
    </div>
  );
}
export default Historial;