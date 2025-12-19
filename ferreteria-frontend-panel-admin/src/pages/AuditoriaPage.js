import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Table, Spinner, Alert, Badge, Button, Form, InputGroup } from 'react-bootstrap';
import { FileText, Search, User, RefreshCw, MapPin } from 'lucide-react'; // Se eliminó 'Layers'

function Auditoria() {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const auth = useAuth();

  // Usamos useCallback para que la función sea estable y no cause warnings
  const fetchHistorial = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Petición ligera
      const response = await auth.axiosApi.get('/historial-inventario/');
      setHistorial(response.data);
    } catch (err) {
      console.error(err);
      setError("Error de conexión al cargar auditoría.");
    } finally {
      setLoading(false);
    }
  }, [auth.axiosApi]); // Dependencia correcta

  useEffect(() => { 
    fetchHistorial(); 
  }, [fetchHistorial]); // Ahora sí podemos incluirla en el array

  const getTipoCambio = (tipo) => {
      switch(tipo) {
          case '+': return <Badge bg="success">Creación</Badge>;
          case '~': return <Badge bg="warning" text="dark">Ajuste</Badge>;
          case '-': return <Badge bg="danger">Borrado</Badge>;
          default: return <Badge bg="secondary">?</Badge>;
      }
  };

  const registrosFiltrados = historial.filter(item => {
      const term = searchTerm.toLowerCase();
      return (item.producto_nombre?.toLowerCase() || '').includes(term) || 
             (item.usuario?.toLowerCase() || '').includes(term);
  });

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
            <h2 className="mb-1 d-flex align-items-center gap-2"><FileText size={28}/> Auditoría</h2>
            <p className="text-muted mb-0 small">Últimos 50 movimientos de stock.</p>
        </div>
        
        <div className="d-flex gap-2">
            <Button variant="light" onClick={fetchHistorial} disabled={loading} title="Actualizar lista">
                <RefreshCw size={20} className={loading ? "spin-anim" : ""} />
            </Button>
            <InputGroup style={{width: '250px'}}>
                <InputGroup.Text className="bg-white"><Search size={18}/></InputGroup.Text>
                <Form.Control 
                    placeholder="Buscar..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </InputGroup>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <div className="bg-white shadow-sm rounded overflow-hidden">
        <Table hover responsive className="mb-0 align-middle size-sm">
          <thead className="bg-light text-secondary small text-uppercase">
            <tr>
              <th>Fecha</th>
              <th>Usuario</th>
              <th>Acción</th>
              <th>Producto</th>
              <th>Sucursal</th>
              <th className="text-end">Stock</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
                <tr><td colSpan="6" className="text-center py-5"><Spinner animation="border" variant="primary" /></td></tr>
            ) : registrosFiltrados.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-4 text-muted">Sin resultados.</td></tr>
            ) : (
                registrosFiltrados.map((item) => (
                <tr key={item.history_id}>
                    <td className="text-nowrap small text-muted">{item.fecha}</td>
                    <td>
                        <div className="d-flex align-items-center gap-2">
                            <div className="bg-light rounded-circle p-1"><User size={12}/></div>
                            <span className="fw-bold small">{item.usuario}</span>
                        </div>
                    </td>
                    <td>{getTipoCambio(item.history_type)}</td>
                    <td><span className="fw-bold text-dark">{item.producto_nombre}</span></td>
                    <td className="small text-muted"><MapPin size={12} className="me-1"/>{item.sucursal_nombre}</td>
                    <td className="text-end">
                        <Badge bg="info" className="px-3">{item.cantidad}</Badge>
                    </td>
                </tr>
                ))
            )}
          </tbody>
        </Table>
      </div>
      
      <style>{`
        .spin-anim { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default Auditoria;