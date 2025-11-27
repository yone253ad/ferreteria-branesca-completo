import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { GoogleOAuthProvider } from '@react-oauth/google';

// --- 1. Importar HelmetProvider ---
import { HelmetProvider } from 'react-helmet-async';

const PAYPAL_CLIENT_ID = "AbQtG3q_HyLz1eXqjQwX8c2P0WpMlooXpWhUVQ7XykhWkV2QSnbB_sMZYo2kYwB0N-uwpXn4jPJ0-ohl";
const GOOGLE_CLIENT_ID = "18552337184-n68c7tgrbm5m5qb9q18nhe4q1l61llti.apps.googleusercontent.com"; 

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* 2. Envolvemos TODO con HelmetProvider */}
    <HelmetProvider>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <BrowserRouter>
          <PayPalScriptProvider options={{ "client-id": PAYPAL_CLIENT_ID, currency: "USD" }}>
            <AuthProvider>
              <CartProvider> 
                <App />
              </CartProvider>
            </AuthProvider>
          </PayPalScriptProvider>
        </BrowserRouter>
      </GoogleOAuthProvider>
    </HelmetProvider>
  </React.StrictMode>
);