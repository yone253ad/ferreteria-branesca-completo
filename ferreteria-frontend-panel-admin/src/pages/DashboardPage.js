import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Row, Col, Spinner, Alert, Table, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

function DashboardPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  const [reporte, setReporte] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  
  // Estado de carga inicial (solo para la primera vez)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estado para indicar última actualización (opcional, visual)
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    // Función de carga de datos
    // Recibe 'isBackground' para saber si debe mostrar spinner o no
    const fetchDashboardData = async (isBackground = false) => {
      try {
        setError(null);
        
        // Solo mostramos el spinner si NO es una actualización de fondo
        if (!isBackground) setLoading(true);

        const [repRes, alRes, vendRes] = await Promise.all([
            auth.axiosApi.get('/reporte-ventas/'),
            auth.axiosApi.get('/alertas-stock/'),
            auth.axiosApi.get('/reporte-vendedores/')
        ]);

        setReporte(repRes.data);
        setAlertas(alRes.data);
        setVendedores(vendRes.data);
        setLastUpdated(new Date()); // Actualizamos la hora
        
        setLoading(false);
      } catch (err) {
        console.error("Error cargando dashboard:", err);
        // Si falla en segundo plano, no borramos la pantalla, solo logueamos
        if (!isBackground) {
            setError("Error cargando dashboard. Verifica tu conexión.");
            setLoading(false);
        }
      }
    };

    // 1. Carga Inicial (Inmediata)
    fetchDashboardData();

    // 2. Configurar Intervalo (Cada 60 segundos = 60000 ms)
    const intervalId = setInterval(() => {
        console.log("Actualizando dashboard en segundo plano...");
        fetchDashboardData(true); // true = Carga silenciosa
    }, 60000);

    // 3. Limpieza (Cuando el usuario sale de la página, matamos el intervalo)
    return () => clearInterval(intervalId);

  }, [auth.axiosApi]);

  const handleLogout = () => { auth.logout(); navigate('/login'); };

  const renderContent = () => {
    if (loading) return <div className="text-center mt-5"><Spinner animation="border" /><p>Cargando datos...</p></div>;
    if (error) return <Alert variant="danger">{error}</Alert>;

    return (
      <>
        <div className="text-end mb-2 text-muted small">
            <small>Actualizado: {lastUpdated.toLocaleTimeString()}</small>
        </div>

        <Row>
          {/* Tarjeta Ventas */}
          <Col md={6}>
            <Card className="text-center shadow-sm mb-3">
              <Card.Header as="h5" className="bg-success text-white">Reporte de Ventas</Card.Header>
              <Card.Body>
                {reporte ? (
                  <>
                    <Card.Title as="h1">${parseFloat(reporte.total_ventas).toFixed(2)}</Card.Title>
                    <Card.Text>Total en {reporte.pedidos_procesados} pedidos procesados.</Card.Text>
                  </>
                ) : <Card.Text>Sin datos.</Card.Text>}
              </Card.Body>
            </Card>
          </Col>
          
          {/* Tarjeta Alertas */}
          <Col md={6}>
            <Card className="text-center shadow-sm mb-3" border={alertas.length > 0 ? "danger" : "secondary"}>
              <Card.Header as="h5" bg={alertas.length > 0 ? "danger" : "secondary"} text="white">
                Alertas de Stock
              </Card.Header>
              <Card.Body>
                <Card.Title as="h1">{alertas.length}</Card.Title>
                <Card.Text>
                    {alertas.length > 0 ? "Productos con stock crítico." : "Inventario saludable."}
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        {/* Tabla Vendedores */}
        <h4 className="mt-4">Rendimiento por Vendedor</h4>
        <Card className="shadow-sm">
            <Table striped bordered hover size="sm" className="mb-0">
                <thead className="bg-light"><tr><th>Vendedor</th><th>Total Vendido</th><th>Pedidos</th></tr></thead>
                <tbody>
                    {vendedores.map((v, i) => (
                        <tr key={i}>
                            <td>{v.vendedor}</td>
                            <td className="text-success fw-bold">${parseFloat(v.total).toFixed(2)}</td>
                            <td><Badge bg="info">{v.pedidos}</Badge></td>
                        </tr>
                    ))}
                    {vendedores.length === 0 && <tr><td colSpan="3" className="text-center">No hay ventas registradas este mes.</td></tr>}
                </tbody>
            </Table>
        </Card>
      </>
    );
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div><h2>Panel de Administración</h2><h4>Hola, {auth.authUser?.username}!</h4></div>
        {/* El botón de cerrar sesión ya está en el sidebar, pero lo dejamos aquí si gustas o lo quitamos para limpiar */}
        {/* <Button variant="danger" onClick={handleLogout}>Cerrar Sesión</Button> */}
      </div>
      {renderContent()}
    </div>
  );
}
export default DashboardPage;