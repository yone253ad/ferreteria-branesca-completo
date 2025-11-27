import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
// Importaciones limpias
import { 
  Row, Col, Card, Form, Table, Button, Alert, Offcanvas, Navbar, Container, Modal, InputGroup 
} from 'react-bootstrap';
import { Plus, Minus, Trash2, Printer, ShoppingCart, CreditCard, Banknote } from 'lucide-react';

function Facturacion() {
  const auth = useAuth();
  
  // Datos
  const [productos, setProductos] = useState([]); 
  const [carrito, setCarrito] = useState([]); 
  const [searchTerm, setSearchTerm] = useState('');
  const [sucursalId, setSucursalId] = useState(null);
  
  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [lastPedidoId, setLastPedidoId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showMobileTicket, setShowMobileTicket] = useState(false);
  
  // --- MODAL DE PAGO ---
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [cambio, setCambio] = useState(0);

  // Cálculos
  const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  const iva = subtotal * 0.15;
  const total = subtotal + iva;

  useEffect(() => {
    const loadData = async () => {
      try {
        const resProd = await auth.axiosApi.get('/productos/');
        setProductos(resProd.data);
        const resSuc = await auth.axiosApi.get('/sucursales/');
        if (resSuc.data.length > 0) {
             setSucursalId(resSuc.data[0].id);
        }
      } catch (err) {
        console.error("Error cargando datos POS", err);
        setErrorMsg("Error de conexión. Verifica que el servidor esté encendido.");
      }
    };
    loadData();
  }, [auth.axiosApi]);

  // Cálculo de Cambio en Tiempo Real
  useEffect(() => {
    if (metodoPago === 'EFECTIVO' && montoRecibido) {
        const recibido = parseFloat(montoRecibido);
        if (!isNaN(recibido)) {
            setCambio(recibido - total);
        } else {
            setCambio(0);
        }
    } else {
        setCambio(0);
    }
  }, [montoRecibido, total, metodoPago]);

  // --- Lógica del Carrito ---

  const agregarProducto = (producto) => {
    setCarrito(prev => {
      const existe = prev.find(item => item.id === producto.id);
      if (existe) {
        return prev.map(item => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item);
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
    if (carrito.length === 0) setSuccessMsg(null); 
  };

  const incrementarCantidad = (id) => {
    setCarrito(prev => prev.map(item => item.id === id ? { ...item, cantidad: item.cantidad + 1 } : item));
  };

  const decrementarCantidad = (id) => {
    setCarrito(prev => prev.map(item => item.id === id && item.cantidad > 1 ? { ...item, cantidad: item.cantidad - 1 } : item));
  };

  const quitarDelTicket = (id) => {
    setCarrito(prev => prev.filter(item => item.id !== id));
  };

  // Paso 1: Abrir Modal
  const iniciarCobro = () => {
      if (carrito.length === 0) return;
      if (!sucursalId) { setErrorMsg("Error: Sin sucursal."); return; }
      setMontoRecibido(''); // Resetear
      setMetodoPago('EFECTIVO');
      setShowPaymentModal(true);
  };

  // Paso 2: Confirmar Venta
  const procesarVenta = async () => {
    if (metodoPago === 'EFECTIVO' && (parseFloat(montoRecibido) < total || !montoRecibido)) {
        alert("Monto insuficiente."); return;
    }

    setLoading(true); setErrorMsg(null); setSuccessMsg(null); setShowPaymentModal(false);

    try {
      const payload = {
        sucursal_id: sucursalId,
        nombre_cliente: "Cliente Mostrador",
        items: carrito.map(item => ({ id: item.id, cantidad: item.cantidad })),
        metodo_pago: metodoPago,
        monto_recibido: metodoPago === 'EFECTIVO' ? parseFloat(montoRecibido) : total
      };

      const res = await auth.axiosApi.post('/venta-mostrador/', payload);
      
      const nuevoPedidoId = res.data.pedido_id;
      setLastPedidoId(nuevoPedidoId);
      setSuccessMsg(`¡Venta #${nuevoPedidoId} registrada con éxito!`);
      setCarrito([]); setSearchTerm(''); 

    } catch (err) {
      setErrorMsg("Error: " + (err.response?.data?.error || "Desconocido"));
    } finally { setLoading(false); }
  };

  const handleImprimirFactura = async () => {
      if (!lastPedidoId) return;
      try {
          const response = await auth.axiosApi.get(`/factura/${lastPedidoId}/`, { responseType: 'blob' });
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `Factura_${lastPedidoId}.pdf`);
          document.body.appendChild(link);
          link.click();
          link.remove();
      } catch (e) {
          alert("Error al generar PDF.");
      }
  };

  const productosFiltrados = productos.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderTicketContent = () => (
    <div className="d-flex flex-column h-100">
      <div className="flex-grow-1" style={{ overflowY: 'auto', minHeight: '200px' }}>
        <Table striped borderless size="sm" className="align-middle">
          <thead className="text-muted small"><tr><th>Prod</th><th className="text-center">Cant</th><th className="text-end">Sub</th><th></th></tr></thead>
          <tbody>
            {carrito.map(item => (
              <tr key={item.id}>
                <td className="small text-truncate" style={{maxWidth: '130px'}}>
                    <div className="fw-bold">{item.nombre}</div>
                    <div className="text-muted" style={{fontSize:'0.75rem'}}>${item.precio}</div>
                </td>
                <td className="text-center">
                    <div className="d-flex justify-content-center gap-1">
                        <Button variant="outline-secondary" size="sm" className="p-0" style={{width:'20px'}} onClick={() => decrementarCantidad(item.id)}><Minus size={12}/></Button>
                        <span className="fw-bold" style={{minWidth:'20px', textAlign:'center'}}>{item.cantidad}</span>
                        <Button variant="outline-secondary" size="sm" className="p-0" style={{width:'20px'}} onClick={() => incrementarCantidad(item.id)}><Plus size={12}/></Button>
                    </div>
                </td>
                <td className="text-end fw-bold">${(item.precio * item.cantidad).toFixed(2)}</td>
                <td className="text-end">
                  <Button variant="link" className="text-danger p-0" onClick={() => quitarDelTicket(item.id)}>
                    <Trash2 size={16} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        {carrito.length === 0 && <div className="text-center text-muted mt-5"><ShoppingCart size={48} className="mb-2 opacity-25"/><p>Vacío</p></div>}
      </div>

      <div className="mt-auto border-top pt-3 bg-light p-3 rounded-top">
        <div className="d-flex justify-content-between align-items-center mb-1 text-muted small"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
        <div className="d-flex justify-content-between align-items-center mb-2 text-muted small"><span>IVA (15%):</span><span>${iva.toFixed(2)}</span></div>
        <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="m-0 text-dark">Total:</h4>
            <h2 className="text-primary m-0 fw-bold">${total.toFixed(2)}</h2>
        </div>
        <div className="d-grid gap-2">
          <Button variant="success" size="lg" disabled={loading || carrito.length === 0} onClick={iniciarCobro}>
            {loading ? '...' : '💸 Cobrar'}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pb-5 mb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0 fw-bold text-primary">Punto de Venta</h2>
        <Button 
            variant={lastPedidoId ? "primary" : "secondary"} 
            onClick={handleImprimirFactura}
            disabled={!lastPedidoId}
        >
            <Printer size={20} className="me-2"/> 
            {lastPedidoId ? `Imprimir Factura #${lastPedidoId}` : 'Imprimir Última'}
        </Button>
      </div>
      
      {successMsg && <Alert variant="success" onClose={() => setSuccessMsg(null)} dismissible>{successMsg}</Alert>}
      {errorMsg && <Alert variant="danger" onClose={() => setErrorMsg(null)} dismissible>{errorMsg}</Alert>}

      <Row className="h-100 g-3">
        <Col md={7} lg={8}>
          <Card className="shadow-sm h-100 border-0" style={{minHeight: '70vh'}}>
            <Card.Header className="bg-white border-bottom-0 pt-3 pb-0">
              <Form.Control type="text" placeholder="🔍 Buscar..." className="form-control-lg bg-light" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} autoFocus />
            </Card.Header>
            <Card.Body className="p-0">
              <div style={{ height: '65vh', overflowY: 'auto' }} className="p-3">
                <Table hover className="align-middle mb-0">
                  <tbody>
                    {productosFiltrados.map(prod => (
                      <tr key={prod.id} style={{cursor:'pointer'}} onClick={() => agregarProducto(prod)}>
                        <td style={{width: '60px'}}>{prod.imagen ? <img src={prod.imagen} alt="" style={{width:'45px', height:'45px', objectFit:'cover', borderRadius:'6px'}}/> : <div style={{width:'45px', height:'45px', background:'#eee', borderRadius:'6px'}}></div>}</td>
                        <td><div className="fw-bold text-dark">{prod.nombre}</div><small className="text-muted">{prod.sku}</small></td>
                        <td className="text-end"><div className="text-success fw-bold fs-5">${prod.precio}</div></td>
                        <td className="text-end"><Button variant="primary" size="sm" className="rounded-circle p-2"><Plus size={18}/></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={5} lg={4} className="d-none d-md-block">
          <Card className="shadow h-100 border-0">
            <Card.Header className="bg-primary text-white"><h5 className="mb-0 d-flex align-items-center gap-2"><ShoppingCart size={20}/> Ticket</h5></Card.Header>
            <Card.Body className="p-0">{renderTicketContent()}</Card.Body>
          </Card>
        </Col>
      </Row>

      {/* MODAL DE PAGO */}
      <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Procesar Pago</Modal.Title></Modal.Header>
        <Modal.Body>
            <h3 className="text-center mb-4 text-primary fw-bold">${total.toFixed(2)}</h3>
            <Form.Group className="mb-3">
                <Form.Label>Método de Pago</Form.Label>
                <div className="d-flex gap-2">
                    <Button variant={metodoPago === 'EFECTIVO' ? 'success' : 'outline-secondary'} className="flex-grow-1" onClick={() => setMetodoPago('EFECTIVO')}><Banknote size={20} className="me-2"/> Efectivo</Button>
                    <Button variant={metodoPago === 'TARJETA' ? 'primary' : 'outline-secondary'} className="flex-grow-1" onClick={() => setMetodoPago('TARJETA')}><CreditCard size={20} className="me-2"/> Tarjeta</Button>
                </div>
            </Form.Group>
            {metodoPago === 'EFECTIVO' && (
                <>
                    <Form.Group className="mb-3">
                        <Form.Label>Monto Recibido</Form.Label>
                        <InputGroup>
                            <InputGroup.Text>$</InputGroup.Text>
                            <Form.Control type="number" value={montoRecibido} onChange={(e) => setMontoRecibido(e.target.value)} autoFocus />
                        </InputGroup>
                    </Form.Group>
                    <div className={`alert ${cambio >= 0 ? 'alert-success' : 'alert-danger'} text-center`}>
                        <strong className="fs-5">Cambio: ${cambio.toFixed(2)}</strong>
                    </div>
                </>
            )}
        </Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>Cancelar</Button>
            <Button variant="primary" size="lg" onClick={procesarVenta} disabled={loading || (metodoPago === 'EFECTIVO' && cambio < 0)}>Confirmar Venta</Button>
        </Modal.Footer>
      </Modal>

      <Navbar fixed="bottom" bg="dark" variant="dark" className="d-md-none shadow-lg p-0"><Container fluid className="p-2"><div className="d-flex align-items-center justify-content-between w-100"><div className="text-white ps-2"><small className="d-block text-white-50">Total</small><span className="fs-4 fw-bold">${total.toFixed(2)}</span></div><Button variant="warning" onClick={() => setShowMobileTicket(true)} className="fw-bold px-4 rounded-pill">Ver Ticket</Button></div></Container></Navbar>
      <Offcanvas show={showMobileTicket} onHide={() => setShowMobileTicket(false)} placement="end" className="d-md-none"><Offcanvas.Header closeButton className="bg-primary text-white"><Offcanvas.Title>Resumen</Offcanvas.Title></Offcanvas.Header><Offcanvas.Body className="p-0">{renderTicketContent()}</Offcanvas.Body></Offcanvas>
    </div>
  );
}
export default Facturacion;