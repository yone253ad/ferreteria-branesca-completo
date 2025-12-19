import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Card, Row, Col, Spinner, Alert, Table, Badge, Button } from 'react-bootstrap';

function DashboardPage() {
  const auth = useAuth();
  const [reporte, setReporte] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const fetchDashboardData = async (isBackground = false) => {
      try {
        if (!isBackground) setLoading(true);
        const [repRes, alRes, vendRes] = await Promise.all([
            auth.axiosApi.get('/reporte-ventas/'),
            auth.axiosApi.get('/alertas-stock/'),
            auth.axiosApi.get('/reporte-vendedores/')
        ]);
        setReporte(repRes.data);
        setAlertas(alRes.data);
        setVendedores(vendRes.data);
        setLastUpdated(new Date());
        setLoading(false);
      } catch (err) { 
          console.error(err); 
          if(!isBackground) { setError("Error cargando datos."); setLoading(false); }
      }
    };

    fetchDashboardData();
    const intervalId = setInterval(() => fetchDashboardData(true), 60000); 
    return () => clearInterval(intervalId);
  }, [auth.axiosApi]);

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Dashboard</h2>
        <small className="text-muted">Actualizado: {lastUpdated.toLocaleTimeString()}</small>
      </div>
      <Row>
        <Col md={4}>
          <Card className="text-center shadow-sm mb-3">
            <Card.Header as="h5" className="bg-success text-white">Ventas Totales</Card.Header>
            <Card.Body>
              {reporte ? (
                <>
                  <Card.Title as="h1">${parseFloat(reporte.total_ventas || 0).toFixed(2)}</Card.Title>
                  <Card.Text>{reporte.pedidos_procesados} pedidos procesados.</Card.Text>
                </>
              ) : <Card.Text>Sin datos.</Card.Text>}
            </Card.Body>
          </Card>
        </Col>
        
        {/* TARJETA DE VENCIMIENTOS (NUEVA) */}
        <Col md={4}>
          <Card className="text-center shadow-sm mb-3" border={reporte?.facturas_vencidas > 0 ? "danger" : "light"}>
            <Card.Header as="h5" className={reporte?.facturas_vencidas > 0 ? "bg-danger text-white" : "bg-light"}>
                Créditos Vencidos
            </Card.Header>
            <Card.Body>
              <Card.Title as="h1">{reporte ? reporte.facturas_vencidas : 0}</Card.Title>
              <Card.Text>Facturas pendientes de cobro.</Card.Text>
              {reporte?.facturas_vencidas > 0 && (
                  <Button variant="outline-danger" size="sm" as={Link} to="/pedidos?filtro=vencidos">
                      Ver Deudores
                  </Button>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="text-center shadow-sm mb-3" border={alertas.length > 0 ? "warning" : "secondary"}>
            <Card.Header as="h5" bg={alertas.length > 0 ? "warning" : "secondary"} text={alertas.length > 0 ? "dark" : "white"}>
                Alertas Stock
            </Card.Header>
            <Card.Body>
              <Card.Title as="h1">{alertas.length}</Card.Title>
              <Card.Text>{alertas.length > 0 ? "Productos con stock bajo." : "Todo en orden."}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <h4 className="mt-4">Top Vendedores</h4>
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
                  {vendedores.length === 0 && <tr><td colSpan="3" className="text-center">No hay ventas registradas.</td></tr>}
              </tbody>
          </Table>
      </Card>
    </div>
  );
}
export default DashboardPage;