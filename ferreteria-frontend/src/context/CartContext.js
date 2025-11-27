import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const SYNC_URL = 'http://127.0.0.1:8000/api/carrito/sincronizar/';
const CART_API_URL = 'http://127.0.0.1:8000/api/carrito/';

const CartContext = createContext();

export function useCart() {
  return useContext(CartContext);
}

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [cartLoading, setCartLoading] = useState(true); // <-- NUEVO ESTADO
  const { authToken } = useAuth();

  // Cargar Carrito
  useEffect(() => {
    const loadCart = async () => {
      setCartLoading(true); // Empezamos a cargar
      
      if (authToken) {
        // Lógica Usuario Logueado
        const localCart = JSON.parse(localStorage.getItem('cartItems')) || [];
        try {
          const res = await axios.post(SYNC_URL, { items: localCart }, {
            headers: { Authorization: `Bearer ${authToken}` }
          });
          
          const serverCart = res.data.map(item => ({
            id: item.producto_id,
            nombre: item.producto_detalle.nombre,
            precio: item.producto_detalle.precio,
            imagen: item.producto_detalle.imagen,
            stock_disponible: item.producto_detalle.stock_disponible,
            cantidad: item.cantidad,
            db_id: item.id 
          }));
          
          setCartItems(serverCart);
          localStorage.removeItem('cartItems');
        } catch (err) {
          console.error("Error sync", err);
        }
      } else {
        // Lógica Invitado
        const localCart = JSON.parse(localStorage.getItem('cartItems')) || [];
        setCartItems(localCart);
      }
      
      setCartLoading(false); // ¡Terminamos de cargar!
    };
    
    loadCart();
  }, [authToken]);

  // Guardar en LocalStorage (Solo si no hay usuario)
  useEffect(() => {
    if (!authToken && !cartLoading) { // Solo guardar si ya cargó
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
    }
  }, [cartItems, authToken, cartLoading]);

  // --- ACCIONES (Optimizadas) ---

  const addToCart = async (producto) => {
    setCartItems(prev => {
      const newCart = [...prev];
      const idx = newCart.findIndex(i => i.id === producto.id);
      
      // Validación Stock
      const currentQty = idx > -1 ? newCart[idx].cantidad : 0;
      if (producto.stock_disponible && currentQty + 1 > producto.stock_disponible) {
         alert(`¡Solo quedan ${producto.stock_disponible} unidades!`);
         return prev;
      }

      if (idx > -1) {
        newCart[idx] = { ...newCart[idx], cantidad: newCart[idx].cantidad + 1 };
      } else {
        newCart.push({ ...producto, cantidad: 1 });
      }
      
      // Sincronización en segundo plano
      if (authToken) {
          const itemToSend = idx > -1 ? newCart[idx] : newCart[newCart.length - 1];
          axios.post(SYNC_URL, { items: [{ id: producto.id, cantidad: itemToSend.cantidad }] }, {
             headers: { Authorization: `Bearer ${authToken}` }
          }).catch(console.error);
      }
      
      return newCart;
    });
  };

  const decrementItem = async (producto) => {
    setCartItems(prev => {
      const newCart = [...prev];
      const idx = newCart.findIndex(i => i.id === producto.id);
      
      if (idx > -1) {
        if (newCart[idx].cantidad > 1) {
          newCart[idx] = { ...newCart[idx], cantidad: newCart[idx].cantidad - 1 };
          
          // Sync update
          if (authToken) {
              axios.post(SYNC_URL, { items: [{ id: producto.id, cantidad: newCart[idx].cantidad }] }, { 
                  headers: { Authorization: `Bearer ${authToken}` } 
              }).catch(console.error);
          }
        } else {
          newCart.splice(idx, 1);
          
          // Sync delete
          if (authToken && producto.db_id) {
              axios.delete(`${CART_API_URL}${producto.db_id}/`, { 
                  headers: { Authorization: `Bearer ${authToken}` } 
              }).catch(console.error);
          }
        }
      }
      return newCart;
    });
  };

  const removeItem = async (producto) => {
    setCartItems(prev => prev.filter(i => i.id !== producto.id));
    if (authToken && producto.db_id) {
        axios.delete(`${CART_API_URL}${producto.db_id}/`, {
            headers: { Authorization: `Bearer ${authToken}` }
        }).catch(console.error);
    }
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('cartItems');
  };

  // Exportamos también 'cartLoading'
  const value = { cartItems, addToCart, decrementItem, removeItem, clearCart, cartLoading };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}