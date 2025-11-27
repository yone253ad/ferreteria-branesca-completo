import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
// Mantenemos tu importación correcta:
import { useAuth } from '../context/AuthContext'; 
import { GoogleLogin } from '@react-oauth/google';
import { User, Lock, Eye, EyeOff, Wrench } from 'lucide-react';
import Alert from 'react-bootstrap/Alert'; 

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const auth = useAuth(); // Usamos tu hook de autenticación existente

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      // Usamos la función login que YA FUNCIONA en tu AuthContext
      await auth.login(username, password);
      navigate('/'); // Redirigir al dashboard si es exitoso
    } catch (err) {
      setError(err.message || "Credenciales incorrectas");
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
        // Usamos la función de Google que YA FUNCIONA
        await auth.loginWithGoogle(credentialResponse.credential);
        navigate('/');
    } catch (err) {
        setError('No se pudo iniciar sesión con Google.');
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        
        {/* LOGO */}
        <div className="login-logo">
            <div style={{ color: 'var(--azul-medio)', marginBottom: '10px', display: 'flex', justifyContent: 'center' }}>
                <Wrench size={48} />
            </div>
            <h1>Ferretería Branesca</h1>
            <p>Sistema de Gestión Integral</p>
        </div>

        <div className="login-header">
            <h2>Iniciar Sesión</h2>
            <p>Ingresa tus credenciales para acceder</p>
        </div>

        {error && <Alert variant="danger" className="mb-4 text-center">{error}</Alert>}

        <form onSubmit={handleSubmit}>
            {/* Usuario */}
            <div className="form-group">
                <label htmlFor="username">Usuario</label>
                <div className="input-with-icon">
                    <User size={20} className="input-icon" />
                    <input 
                        type="text" 
                        id="username" 
                        className="form-control-custom" 
                        placeholder="Nombre de usuario" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)} 
                        required
                    />
                </div>
            </div>

            {/* Contraseña */}
            <div className="form-group">
                <label htmlFor="password">Contraseña</label>
                <div className="input-with-icon">
                    <Lock size={20} className="input-icon" />
                    <input 
                        type={showPassword ? "text" : "password"} 
                        id="password" 
                        className="form-control-custom" 
                        placeholder="Tu contraseña" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required
                    />
                    <button 
                        type="button" 
                        className="password-toggle" 
                        onClick={() => setShowPassword(!showPassword)} 
                        tabIndex="-1"
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
            </div>

            <div className="form-options">
                <Link to="/recuperar-password" class="forgot-password">¿Olvidaste tu contraseña?</Link>
            </div>

            {/* Botón Principal */}
            <button type="submit" className="btn-login-custom">
                Entrar al Sistema
            </button>

            <div className="divider-custom"><span>O acceder con</span></div>

            {/* Google Centrado */}
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Falló el login con Google')}
                    theme="filled_blue"
                    shape="pill"
                    width="320" // Ancho fijo para que se vea bien
                />
            </div>
        </form>
      </div>
    </div>
  );
}

export default Login;