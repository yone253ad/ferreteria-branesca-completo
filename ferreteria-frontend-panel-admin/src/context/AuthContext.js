import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const LOGIN_URL = 'http://127.0.0.1:8000/api/token/';
const USER_ME_URL = 'http://127.0.0.1:8000/api/user/me/'; 

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

// Creamos la instancia de Axios
const axiosApi = axios.create({
  baseURL: 'http://127.0.0.1:8000/api'
});

// --- CORRECCIÓN CLAVE (Sincronía) ---
// Leemos el token y lo configuramos ANTES de que arranque cualquier componente.
// Esto evita que la primera petición salga "desnuda" y de error 401.
const storedToken = localStorage.getItem('accessToken');
if (storedToken) {
    axiosApi.defaults.headers.common['Authorization'] = 'Bearer ' + storedToken;
}
// ------------------------------------

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(() => {
      const savedUser = localStorage.getItem('userProfile');
      return savedUser ? JSON.parse(savedUser) : null;
  });
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('accessToken'));

  // Interceptor para cerrar sesión si el token expira real (401/403)
  useEffect(() => {
    const interceptor = axiosApi.interceptors.response.use(
        response => response,
        error => {
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                // Solo cerramos sesión si NO es el login (para evitar bucles)
                if (!error.config.url.includes('/token/')) {
                    console.warn("Sesión expirada. Cerrando...");
                    logout();
                }
            }
            return Promise.reject(error);
        }
    );
    return () => axiosApi.interceptors.response.eject(interceptor);
  }, []);

  // Sincronizar cambios de token en tiempo real
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

      // Verificación
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
      
      // Forzamos la actualización inmediata del header para este ciclo
      axiosApi.defaults.headers.common['Authorization'] = 'Bearer ' + token;
      
      return true;

    } catch (err) {
      logout();
      throw new Error(err.response?.data?.detail || 'Error al iniciar sesión');
    }
  };

  const loginWithGoogle = async (googleToken) => {
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/google-login/', { token: googleToken });
      const { access, user } = response.data;
      
      setAuthToken(access);
      setAuthUser(user);
      axiosApi.defaults.headers.common['Authorization'] = 'Bearer ' + access;
      
      return true;
    } catch (err) {
      throw new Error('Falló login con Google');
    }
  };

  const logout = () => {
    setAuthToken(null);
    setAuthUser(null);
    delete axiosApi.defaults.headers.common['Authorization'];
    localStorage.clear();
  };

  const value = { authToken, authUser, login, loginWithGoogle, logout, axiosApi };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}