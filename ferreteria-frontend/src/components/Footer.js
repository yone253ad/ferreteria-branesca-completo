import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, MapPin, Phone, Mail } from 'lucide-react';

function Footer() {
  const currentYear = new Date().getFullYear();

  // Estilos en línea para control preciso de colores
  const styles = {
    footerSection: {
      backgroundColor: '#f8f9fa', // Fondo Gris Claro (casi blanco)
      color: '#333', // Texto base oscuro
      padding: '60px 0 20px',
      marginTop: '60px',
      borderTop: '1px solid #e9ecef'
    },
    title: {
      color: '#003366', // Azul Oscuro para Títulos (o negro #000)
      fontWeight: '700',
      marginBottom: '20px',
      fontSize: '1.1rem',
      textTransform: 'uppercase'
    },
    link: {
      color: '#0077BE', // Azul Claro para enlaces
      textDecoration: 'none',
      marginBottom: '10px',
      display: 'block',
      fontSize: '0.95rem',
      transition: 'color 0.2s'
    },
    text: {
        color: '#555', // Gris medio para descripciones
        fontSize: '0.9rem'
    },
    icon: {
        color: '#f39c12', // Naranja para iconos de contacto
        marginRight: '8px'
    },
    socialIcon: {
        color: '#00509E', // Azul medio para redes
        marginRight: '15px'
    }
  };

  return (
    <footer style={styles.footerSection}>
      <Container>
        <Row className="g-4">
          
          {/* Columna 1: Marca */}
          <Col md={4} lg={3}>
            <h4 style={{color: '#003366', fontWeight: '800', marginBottom: '15px'}}>BRANESCA</h4>
            <p style={styles.text}>
              Tu socio experto en construcción. Calidad garantizada en cada herramienta y material para tu hogar o proyecto.
            </p>
            <div className="d-flex mt-3">
                <a href="#!" style={styles.socialIcon}><Facebook size={20} /></a>
                <a href="#!" style={styles.socialIcon}><Instagram size={20} /></a>
                <a href="#!" style={styles.socialIcon}><Twitter size={20} /></a>
            </div>
          </Col>

          {/* Columna 2: Información */}
          <Col md={4} lg={3}>
            <h5 style={styles.title}>Información al Cliente</h5>
            <ul className="list-unstyled">
                <li><Link to="/preguntas-frecuentes" style={styles.link}>Preguntas Frecuentes</Link></li>
                <li><Link to="/terminos-y-condiciones" style={styles.link}>Términos y Condiciones</Link></li>
                <li><Link to="/sucursales" style={styles.link}>Nuestras Tiendas</Link></li>
            </ul>
          </Col>

          {/* Columna 3: Categorías */}
          <Col md={4} lg={3}>
            <h5 style={styles.title}>Categorías Top</h5>
            <ul className="list-unstyled">
                <li><Link to="/categoria/1" style={styles.link}>Herramientas Eléctricas</Link></li>
                <li><Link to="/categoria/2" style={styles.link}>Materiales de Construcción</Link></li>
                <li><Link to="/categoria/3" style={styles.link}>Pinturas y Acabados</Link></li>
            </ul>
          </Col>

          {/* Columna 4: Contacto */}
          <Col md={12} lg={3}>
            <h5 style={styles.title}>Contáctanos</h5>
            <ul className="list-unstyled" style={styles.text}>
                <li className="mb-2 d-flex align-items-center"><MapPin size={16} style={styles.icon} /> Av. Principal, Managua</li>
                <li className="mb-2 d-flex align-items-center"><Phone size={16} style={styles.icon} /> (505) 2222-5555</li>
                <li className="mb-2 d-flex align-items-center"><Mail size={16} style={styles.icon} /> ventas@branesca.com</li>
            </ul>
          </Col>

        </Row>

        {/* Copyright */}
        <div className="text-center mt-5 pt-4" style={{borderTop: '1px solid #dee2e6'}}>
           <p className="mb-0" style={{color: '#888', fontSize: '0.85rem'}}>
             Todo lo que necesitas, encuéntralo en Ferretería Branesca &copy; {currentYear} | <strong>Todos los derechos reservados. Creado por Group J</strong>
           </p>
        </div>

      </Container>
    </footer>
  );
}

export default Footer;