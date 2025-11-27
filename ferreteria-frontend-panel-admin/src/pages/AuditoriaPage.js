import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Table, Alert, Spinner, Badge } from 'react-bootstrap';

function AuditoriaPage() {
  const auth = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        // Aseguramos que la URL sea la correcta del backend
        const res = await auth.axiosApi.get('/auditoria-inventario/');
        setLogs(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Error auditoría:", err);
        setError("No se pudo cargar el historial. Verifica que el servidor esté corriendo y tengas permisos.");
        setLoading(false);
      }
    };
    fetchLogs();
  }, [auth.axiosApi]);

  // --- CORRECCIÓN AQUÍ ---
  // El parámetro es 'tipo', así que usamos 'tipo' en todo el bloque.
  const getTipoCambio = (tipo) => {
    switch(tipo) {
      case '+': return <Badge bg="success">Creación</Badge>;
      case '~': return <Badge bg="warning" text="dark">Modificación</Badge>;
      case '-': return <Badge bg="danger">Eliminación</Badge>;
      default: return tipo; // <--- ¡AQUÍ estaba el error! Antes decía 'return type'
    }
  };
  // -----------------------

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /> <p>Cargando datos...</p></div>;
  if (error) return <Alert variant="danger" className="m-3">{error}</Alert>;

  return (
    <div className="p-3">
      <h2 className="mb-4">Auditoría de Inventario</h2>
      <Table striped bordered hover responsive size="sm" className="bg-white shadow-sm">
        <thead className="bg-light">
          <tr>
            <th>Fecha</th>
            <th>Usuario</th>
            <th>Acción</th>
            <th>Producto</th>
            <th>Sucursal</th>
            <th>Stock</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.history_id}>
              <td>{new Date(log.history_date).toLocaleString()}</td>
              <td><strong>{log.history_user_str || 'Sistema'}</strong></td>
              <td>{getTipoCambio(log.history_type)}</td>
              <td>{log.producto_str}</td>
              <td>{log.sucursal_str}</td>
              <td className="text-end fw-bold">{log.cantidad}</td>
            </tr>
          ))}
          {logs.length === 0 && <tr><td colSpan="6" className="text-center py-3">No hay registros.</td></tr>}
        </tbody>
      </Table>
    </div>
  );
}
export default AuditoriaPage;