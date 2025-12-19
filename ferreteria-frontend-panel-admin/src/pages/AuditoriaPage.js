import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Table, Spinner, Alert, Badge, Form, InputGroup } from 'react-bootstrap';
import { FileText, Search, User, Calendar, Clock } from 'lucide-react';

function Auditoria() {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const auth = useAuth();

  useEffect(() => {
    const fetchHistorial = async () => {
      try {
        setLoading(true);
        // Asegúrate de que esta URL coincida con tu urls.py
        const response = await auth.axiosApi.get('/historial-inventario/');
        setHistorial(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Error cargando auditoría:", err);
        setError("No se pudieron cargar los registros de auditoría.");
        setLoading(false);
      }
    };
    fetchHistorial();
  }, [auth.axiosApi]);

  // Función para traducir el tipo de cambio
  const getTipoCambio = (tipo) => {
      switch(tipo) {
          case '+': return <Badge bg="success">Creación</Badge>;
          case '~': return <Badge bg="warning" text="dark">Modificación</Badge>;
          case '-': return <Badge bg="danger">Eliminación</Badge>;
          default: return <Badge bg="secondary">Desconocido</Badge>;
      }
  };

  // Filtrado local por producto o usuario
  const registrosFiltrados = historial.filter(item => {
      const term = searchTerm.toLowerCase();
      const prod = item.producto_nombre ? item.producto_nombre.toLowerCase() : ''; // Ajusta según tu serializer
      const user = item.history_user_username ? item.history_user_username.toLowerCase() : '';
      return prod.includes(term) || user.includes(term);
  });

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" variant="primary" /> <p className="mt-2 text-muted">Cargando registros...</p></div>;
  if (error) return <Alert variant="danger" className="m-3">{error}</Alert>;

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h2 className="mb-1"><FileText size={28} className="me-2"/>Auditoría de Inventario</h2>
            <p className="text-muted mb-0">Rastro de movimientos y cambios de stock.</p>
        </div>
        
        <div style={{width: '300px'}}>
            <InputGroup>
                <InputGroup.Text className="bg-white"><Search size={18}/></InputGroup.Text>
                <Form.Control 
                    placeholder="Buscar por producto o usuario..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </InputGroup>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded overflow-hidden">
        <Table hover responsive className="mb-0 align-middle">
          <thead className="bg-light text-secondary">
            <tr>
              <th>Fecha y Hora</th>
              <th>Usuario</th>
              <th>Acción</th>
              <th>Producto</th>
              <th>Sucursal</th>
              <th className="text-end">Stock</th>
            </tr>
          </thead>
          <tbody>
            {registrosFiltrados.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-5 text-muted">No se encontraron registros recientes.</td></tr>
            ) : (
                registrosFiltrados.map((record) => (
                <tr key={record.history_id}>
                    <td>
                        <div className="d-flex align-items-center">
                            <Calendar size={14} className="me-1 text-muted"/>
                            <span className="me-2">{new Date(record.history_date).toLocaleDateString()}</span>
                            <Clock size={14} className="me-1 text-muted"/>
                            <small>{new Date(record.history_date).toLocaleTimeString()}</small>
                        </div>
                    </td>
                    <td>
                        <div className="d-flex align-items-center">
                            <User size={16} className="me-2 text-primary"/>
                            {/* Manejo seguro: Si el usuario es null (ej. cambio sistema), muestra Sistema */}
                            <span className="fw-bold">{record.history_user_username || 'Sistema/Admin'}</span>
                        </div>
                    </td>
                    <td>{getTipoCambio(record.history_type)}</td>
                    {/* Ajusta estos campos según lo que devuelve tu backend exactamente. 
                        Si usaste depth=1 en serializer, accede a record.producto.nombre */}
                    <td className="fw-bold text-dark">
                        {record.producto_nombre || record.producto || 'Producto Eliminado'}
                    </td>
                    <td>{record.sucursal_nombre || record.sucursal || '-'}</td>
                    <td className="text-end">
                        <Badge bg="info" style={{fontSize: '0.9em'}}>{record.cantidad}</Badge>
                    </td>
                </tr>
                ))
            )}
          </tbody>
        </Table>
      </div>
      <div className="mt-3 text-muted small text-end">
          Mostrando los últimos 100 movimientos.
      </div>
    </div>
  );
}

export default Auditoria;