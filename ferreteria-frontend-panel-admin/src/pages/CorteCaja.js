import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, Table, Button, Alert, Spinner, Row, Col, Badge } from 'react-bootstrap';

function CorteCaja() {
  const auth = useAuth();
  const [corte, setCorte] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCorte = async () => {
    try {
      setLoading(true);
      // Llamamos a la API
      const res = await auth.axiosApi.get('/corte-caja/');
      setCorte(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Error al cargar el corte de caja.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCorte();
  }, [auth.axiosApi]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div className="p-3">
      <div className="d-flex justify-content-between align-items-center mb-4 no-print">
        <h2>Corte de Caja Diario</h2>
        <Button variant="outline-dark" onClick={handlePrint}>🖨️ Imprimir Reporte</Button>
      </div>

      {/* Tarjetas de Resumen */}
      <Row className="mb-4">
        <Col md={6}>
          <Card className="text-center bg-light border-primary h-100">
            <Card.Body className="d-flex flex-column justify-content-center">
              <h5 className="text-muted mb-3">Total Vendido Hoy</h5>
              <h1 className="text-primary display-4 fw-bold">
                ${parseFloat(corte.total_vendido).toFixed(2)}
              </h1>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="text-center bg-light h-100">
             <Card.Body className="d-flex flex-column justify-content-center">
              <h5 className="text-muted mb-3">Transacciones Realizadas</h5>
              <h1 className="display-6">{corte.total_transacciones}</h1>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tabla de Detalle */}
      <Card className="shadow-sm">
        <Card.Header className="bg-white">
            <div className="d-flex justify-content-between">
                <span><strong>Vendedor:</strong> {corte.vendedor}</span>
                <span><strong>Fecha:</strong> {corte.fecha}</span>
            </div>
        </Card.Header>
        <Card.Body className="p-0">
            <Table striped hover size="sm" className="mb-0">
                <thead className="bg-light">
                    <tr>
                        <th className="ps-3">Hora</th>
                        <th>ID Pedido</th>
                        <th>Estado</th>
                        <th className="text-end pe-3">Monto</th>
                    </tr>
                </thead>
                <tbody>
                    {corte.detalles.map((venta) => (
                        <tr key={venta.id}>
                            <td className="ps-3">
                                {new Date(venta.fecha_pedido).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </td>
                            <td>#{venta.id}</td>
                            <td>
                                <Badge bg={venta.estado === 'ENTREGADO' ? 'success' : 'primary'}>
                                    {venta.estado}
                                </Badge>
                            </td>
                            <td className="text-end pe-3 fw-bold">
                                ${parseFloat(venta.total).toFixed(2)}
                            </td>
                        </tr>
                    ))}
                    {corte.detalles.length === 0 && (
                        <tr><td colSpan="4" className="text-center py-4 text-muted">No hay ventas registradas hoy.</td></tr>
                    )}
                </tbody>
                {corte.detalles.length > 0 && (
                    <tfoot className="bg-light">
                        <tr>
                            <td colSpan="3" className="text-end fw-bold py-3">TOTAL CAJA:</td>
                            <td className="text-end fw-bold py-3 pe-3 text-primary h5 mb-0">
                                ${parseFloat(corte.total_vendido).toFixed(2)}
                            </td>
                        </tr>
                    </tfoot>
                )}
            </Table>
        </Card.Body>
      </Card>
      
      {/* Estilo para impresión */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .card, .table { border: 1px solid #ddd !important; }
        }
      `}</style>
    </div>
  );
}

export default CorteCaja;