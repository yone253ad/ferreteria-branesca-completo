import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Alert, Form, Spinner } from 'react-bootstrap'; // Importamos Spinner
import { ShoppingCart, ArrowLeft, RefreshCw, Trash2, Plus, Minus, Tag, Store, Box } from 'lucide-react';
import { PayPalButtons } from '@paypal/react-paypal-js';
import AddressForm from '../components/AddressForm';

const API_BASE = 'http://127.0.0.1:8000/api';

function CartPage() {
  // Obtenemos cartLoading del contexto
  const { cartItems, addToCart, decrementItem, removeItem, clearCart, cartLoading } = useCart();
  const auth = useAuth();
  const navigate = useNavigate();
  
  const [error, setError] = useState(null);
  const [direcciones, setDirecciones] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [sucursales, setSucursales] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [cupon, setCupon] = useState('');

  const subtotal = cartItems.reduce((acc, item) => acc + (item.cantidad * item.precio), 0);
  const iva = subtotal * 0.15;
  const total = subtotal + iva;

  useEffect(() => {
    axios.get(`${API_BASE}/sucursales/`).then(res => {
        setSucursales(res.data);
        if(res.data.length > 0) setSelectedBranchId(res.data[0].id);
    }).catch(e => console.error(e));
    
    if (auth.authToken) {
      axios.get(`${API_BASE}/direcciones/`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } })
        .then(res => {
            setDirecciones(res.data);
            if (res.data.length > 0) setSelectedAddressId(res.data[0].id);
        }).catch(e => console.error(e));
    }
  }, [auth.authToken]);

  const handleAddressAdded = (newAddress) => {
    setDirecciones([...direcciones, newAddress]);
    setSelectedAddressId(newAddress.id);
    setShowAddressForm(false);
  };

  const createOrder = (data, actions) => {
    return actions.order.create({ purchase_units: [{ description: "Compra Ferretería", amount: { value: total.toFixed(2), currency_code: "USD" } }] });
  };

  const onApprove = (data, actions) => {
    return actions.order.capture().then(async (details) => {
      await handleBackendCheckout(details.id);
    }).catch(err => setError("Error procesando pago."));
  };

  const handleBackendCheckout = async (transactionId) => {
    setError(null);
    if (!auth.authToken) return navigate('/login');
    
    const payload = {
      sucursal_id: selectedBranchId,
      direccion_id: selectedAddressId,
      items: cartItems.map(item => ({ producto_id: item.id, cantidad: item.cantidad })),
      transaction_id: transactionId
    };

    try {
      await axios.post(`${API_BASE}/checkout/`, payload, {
        headers: { Authorization: `Bearer ${auth.authToken}` }
      });
      alert('¡Compra registrada con éxito!');
      clearCart();
      navigate('/historial');
    } catch (err) {
      setError(err.response?.data?.error || "Error registrando compra.");
    }
  };

  // --- MANEJO DE CARGA (Anti-Parpadeo) ---
  if (cartLoading) {
      return (
          <div className="d-flex justify-content-center align-items-center" style={{minHeight: '60vh'}}>
              <Spinner animation="border" variant="primary" />
          </div>
      );
  }
  // ---------------------------------------

  // Estilos (igual que antes)
  const styles = {
    container: { maxWidth: '1200px', margin: '0 auto', padding: '20px' },
    header: { backgroundColor: '#fff', borderRadius: '10px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' },
    headerIcon: { width: '50px', height: '50px', backgroundColor: '#E6F0FF', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00509E' },
    content: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '25px' },
    productList: { backgroundColor: '#fff', borderRadius: '10px', padding: '25px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
    item: { display: 'flex', alignItems: 'center', gap: '15px', padding: '20px', border: '1px solid #F5F5F5', borderRadius: '8px', marginBottom: '15px' },
    itemImg: { width: '80px', height: '80px', backgroundColor: '#E6F0FF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', objectFit: 'contain' },
    resumen: { backgroundColor: '#fff', borderRadius: '10px', padding: '25px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', height: 'fit-content', position: 'sticky', top: '20px' },
    btnAction: { backgroundColor: '#fff', border: '1px solid #F5F5F5', borderRadius: '6px', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: '#333' },
    qtyBtn: { background: 'none', border: '1px solid #eee', borderRadius: '4px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
    qtyInput: { width: '40px', textAlign: 'center', border: 'none', fontSize: '1rem', fontWeight: 'bold' },
    deleteBtn: { background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer' }
  };

  if (window.innerWidth < 992) styles.content.gridTemplateColumns = '1fr';

  return (
    <div style={styles.container}>
        <div style={styles.header}>
            <div className="d-flex align-items-center gap-3">
                <div style={styles.headerIcon}><ShoppingCart size={24} /></div>
                <div>
                    <h1 className="m-0" style={{fontSize: '1.8rem', fontWeight: '700', color: '#003366'}}>Mi Carrito</h1>
                    <p className="m-0 text-muted">Revisa y gestiona tus productos</p>
                </div>
            </div>
            <div className="d-flex gap-2">
                <button style={styles.btnAction} onClick={() => navigate('/')}><ArrowLeft size={16}/> Seguir Comprando</button>
                <button style={styles.btnAction} onClick={() => window.location.reload()}><RefreshCw size={16}/> Actualizar</button>
            </div>
        </div>

        <div style={styles.content}>
            <div style={styles.productList}>
                <h2 style={{fontSize: '1.3rem', fontWeight: '600', color: '#003366', marginBottom: '20px', display:'flex', alignItems:'center', gap:'10px'}}>
                    <Box size={20} color="#00509E" /> Productos en el Carrito
                </h2>
                {cartItems.length === 0 ? (
                    <Alert variant="info" className="text-center p-5">
                        <ShoppingCart size={48} className="mb-3 opacity-50" />
                        <h4>Tu carrito está vacío</h4>
                        <button className="btn btn-primary mt-3" onClick={() => navigate('/')}>Ir a Comprar</button>
                    </Alert>
                ) : (
                    cartItems.map(item => (
                        <div key={item.id} style={styles.item}>
                            <div style={styles.itemImg}>
                                {item.imagen ? <img src={item.imagen} alt={item.nombre} style={{width:'100%', height:'100%', objectFit:'cover', borderRadius:'8px'}} /> : <Box size={32} color="#00509E"/>}
                            </div>
                            <div style={{flex: 1}}>
                                <div style={{fontWeight:'600', fontSize:'1.1rem', color:'#003366'}}>{item.nombre}</div>
                                <div style={{color:'#666', fontSize:'0.9rem'}}>${parseFloat(item.precio).toFixed(2)} unitario</div>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <button style={styles.qtyBtn} onClick={() => decrementItem(item)}><Minus size={14}/></button>
                                <span style={styles.qtyInput}>{item.cantidad}</span>
                                <button style={styles.qtyBtn} onClick={() => addToCart(item)}><Plus size={14}/></button>
                            </div>
                            <div style={{fontWeight:'700', color:'#00509E', minWidth:'80px', textAlign:'right'}}>
                                ${(item.precio * item.cantidad).toFixed(2)}
                            </div>
                            <button style={styles.deleteBtn} onClick={() => removeItem(item)}><Trash2 size={18}/></button>
                        </div>
                    ))
                )}
            </div>

            {cartItems.length > 0 && (
                <div style={styles.resumen}>
                    <h2 style={{fontSize: '1.3rem', fontWeight: '600', color: '#003366', marginBottom: '20px'}}>Resumen</h2>
                    <div className="mb-4 p-3 bg-light rounded">
                        <div className="d-flex align-items-center gap-2 mb-2 fw-bold text-dark"><Tag size={16} /> Cupón</div>
                        <div className="d-flex gap-2">
                            <input type="text" className="form-control form-control-sm" placeholder="Código" value={cupon} onChange={e=>setCupon(e.target.value)} />
                            <button className="btn btn-warning btn-sm text-white fw-bold">Aplicar</button>
                        </div>
                    </div>
                    <div className="mb-3">
                        <Form.Group className="mb-2">
                            <Form.Label className="small fw-bold">Sucursal de Despacho</Form.Label>
                            <Form.Select size="sm" value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)}>
                                <option value="">-- Selecciona --</option>
                                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </Form.Select>
                        </Form.Group>
                        <div className="mb-2">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <label className="small fw-bold">Dirección de Envío</label>
                                {auth.authToken && <button className="btn btn-link btn-sm p-0" onClick={() => setShowAddressForm(!showAddressForm)}>+ Nueva</button>}
                            </div>
                            {!auth.authToken ? <Alert variant="warning" className="p-2 small">Inicia sesión.</Alert> : 
                             direcciones.length === 0 && !showAddressForm ? <p className="small text-muted">No tienes direcciones.</p> :
                             direcciones.map(d => (
                                <Form.Check type="radio" key={d.id} id={`addr-${d.id}`} label={d.direccion} checked={selectedAddressId === d.id} onChange={() => setSelectedAddressId(d.id)} className="small" />
                             ))
                            }
                            {showAddressForm && <div className="mt-2"><AddressForm onAddressAdded={handleAddressAdded} onCancel={() => setShowAddressForm(false)} /></div>}
                        </div>
                    </div>
                    <hr />
                    <div className="d-flex justify-content-between mb-2 small"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
                    <div className="d-flex justify-content-between mb-2 small"><span>IVA (15%):</span><span>${iva.toFixed(2)}</span></div>
                    <div className="d-flex justify-content-between mb-4 pt-2 border-top"><span className="fw-bold fs-5 text-dark">Total:</span><span className="fw-bold fs-5 text-primary">${total.toFixed(2)}</span></div>
                    {error && <Alert variant="danger" className="small">{error}</Alert>}
                    {auth.authToken ? (
                        (!selectedAddressId || !selectedBranchId) ? <button className="btn btn-secondary w-100 disabled" style={{cursor: 'not-allowed'}}>Completa datos</button> : 
                        <PayPalButtons style={{ layout: "vertical", shape: "rect" }} createOrder={createOrder} onApprove={onApprove} onError={() => setError("Error PayPal")} />
                    ) : <button className="btn btn-primary w-100 fw-bold py-2" onClick={() => navigate('/login')}>Iniciar Sesión</button>}
                    <button className="btn btn-outline-primary w-100 mt-2 fw-bold" onClick={() => navigate('/')}><Store size={18} className="me-2 mb-1"/> Seguir Comprando</button>
                </div>
            )}
        </div>
    </div>
  );
}
export default CartPage;