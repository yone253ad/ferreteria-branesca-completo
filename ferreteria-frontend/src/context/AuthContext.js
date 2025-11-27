import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const LOGIN_URL = 'http://127.0.0.1:8000/api/token/';
const USER_ME_URL = 'http://127.0.0.1:8000/api/user/me/'; 

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

const axiosApi = axios.create({
  baseURL: 'http://127.0.0.1:8000/api'
});

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(() => {
      const savedUser = localStorage.getItem('userProfile');
      return savedUser ? JSON.parse(savedUser) : null;
  });
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('accessToken'));

  // --- INTERCEPTOR DE ERRORES 401 (LA CURA) ---
  useEffect(() => {
    const interceptor = axiosApi.interceptors.response.use(
        response => response,
        error => {
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                // Si el token expiró o es inválido, cerramos sesión automáticamente
                console.warn("Token expirado o inválido. Cerrando sesión...");
                logout();
            }
            return Promise.reject(error);
        }
    );
    return () => axiosApi.interceptors.response.eject(interceptor);
  }, []);

  // Configurar Axios con el token
  useEffect(() => {
    if (authToken) {
      axiosApi.defaults.headers.common['Authorization'] = 'Bearer ' + authToken;
      localStorage.setItem('accessToken', authToken);
      if (authUser) localStorage.setItem('userProfile', JSON.stringify(authUser));
    } else {
      delete axiosApi.defaults.headers.common['Authorization'];
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userProfile');
    }
  }, [authToken, authUser]);


  const login = async (username, password) => {
    try {
      const response = await axios.post(LOGIN_URL, { username, password });
      const token = response.data.access;

      // Verificamos datos
      const authHeader = { headers: { 'Authorization': `Bearer ${token}` } };
      const userResponse = await axios.get(USER_ME_URL, authHeader);
      
      const userData = { 
        username: userResponse.data.username, 
        email: userResponse.data.email,
        rol: userResponse.data.rol,
        is_staff: userResponse.data.is_staff
      };

      setAuthToken(token); 
      setAuthUser(userData);
      return true;

    } catch (err) {
      logout(); // Limpiamos si falla
      throw new Error(err.response?.data?.detail || 'Error al iniciar sesión');
    }
  };

  const loginWithGoogle = async (googleToken) => {
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/google-login/', { token: googleToken });
      const { access, user } = response.data;
      setAuthToken(access);
      setAuthUser(user);
      return true;
    } catch (err) {
      console.error("Error Google:", err);
      throw new Error('Falló login con Google');
    }
  };

  const logout = () => {
    setAuthToken(null);
    setAuthUser(null);
    localStorage.clear(); // Limpieza total
  };

  const value = { authToken, authUser, login, loginWithGoogle, logout, axiosApi };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}