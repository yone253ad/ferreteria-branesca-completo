import React from 'react';
// Quité 'ListGroup' de aquí
import { Container, Accordion, Card, Row, Col } from 'react-bootstrap';
import { MapPin, Phone, Clock } from 'lucide-react';

// --- PÁGINA 1: PREGUNTAS FRECUENTES ---
export function PreguntasFrecuentes() {
  return (
    <Container className="py-5">
      <h2 className="mb-4 text-center fw-bold" style={{color: 'var(--azul-oscuro)'}}>Preguntas Frecuentes</h2>
      <Accordion defaultActiveKey="0">
        <Accordion.Item eventKey="0">
          <Accordion.Header>¿Cómo realizo una compra?</Accordion.Header>
          <Accordion.Body>
            Solo necesitas registrarte, agregar los productos a tu carrito, seleccionar tu dirección de envío y pagar con PayPal. ¡Es muy sencillo!
          </Accordion.Body>
        </Accordion.Item>
        <Accordion.Item eventKey="1">
          <Accordion.Header>¿Hacen envíos a todo el país?</Accordion.Header>
          <Accordion.Body>
            Sí, contamos con envíos a nivel nacional. El tiempo de entrega varía entre 24 a 48 horas dependiendo de la ciudad.
          </Accordion.Body>
        </Accordion.Item>
        <Accordion.Item eventKey="2">
          <Accordion.Header>¿Puedo retirar en tienda?</Accordion.Header>
          <Accordion.Body>
            ¡Claro! En el carrito de compras puedes seleccionar la opción "Retiro en Sucursal" y elegir la tienda más cercana.
          </Accordion.Body>
        </Accordion.Item>
        <Accordion.Item eventKey="3">
          <Accordion.Header>¿Qué métodos de pago aceptan?</Accordion.Header>
          <Accordion.Body>
            Actualmente aceptamos pagos seguros vía PayPal, lo que te permite usar tus tarjetas de crédito o débito.
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    </Container>
  );
}

// --- PÁGINA 2: TÉRMINOS Y CONDICIONES ---
export function Terminos() {
  return (
    <Container className="py-5">
      <h2 className="mb-4 text-center fw-bold" style={{color: 'var(--azul-oscuro)'}}>Términos y Condiciones</h2>
      <Card className="shadow-sm p-4">
        <Card.Body>
          <h5>1. Introducción</h5>
          <p>Bienvenido a Ferretería Branesca. Al usar nuestro sitio web, aceptas estos términos y condiciones en su totalidad.</p>
          
          <h5>2. Uso del Sitio</h5>
          <p>Te comprometes a usar nuestro sitio solo para fines legales y de una manera que no infrinja los derechos de terceros.</p>
          
          <h5>3. Precios y Disponibilidad</h5>
          <p>Todos los precios están en dólares (USD) e incluyen IVA. Nos esforzamos por mantener el stock actualizado, pero la disponibilidad puede cambiar sin previo aviso.</p>
          
          <h5>4. Devoluciones</h5>
          <p>Aceptamos devoluciones dentro de los 30 días posteriores a la compra, siempre que el producto esté en su estado original y con factura.</p>
          
          <h5>5. Privacidad</h5>
          <p>Tus datos personales están seguros con nosotros y no serán compartidos con terceros sin tu consentimiento.</p>
        </Card.Body>
      </Card>
    </Container>
  );
}

// --- PÁGINA 3: NUESTRAS TIENDAS ---
export function Sucursales() {
  const tiendas = [
    { id: 1, nombre: 'Branesca Central (Managua)', dir: 'Av. Principal, Managua', tel: '(505) 2222-1111' },
    { id: 2, nombre: 'Branesca Masaya', dir: 'Calle Real, Masaya', tel: '(505) 2522-3333' },
    { id: 3, nombre: 'Branesca León', dir: 'Centro Histórico, León', tel: '(505) 2311-4444' },
    { id: 4, nombre: 'Branesca Estelí', dir: 'Salida Norte, Estelí', tel: '(505) 2713-5555' },
  ];

  return (
    <Container className="py-5">
      <h2 className="mb-5 text-center fw-bold" style={{color: 'var(--azul-oscuro)'}}>Nuestras Sucursales</h2>
      <Row xs={1} md={2} className="g-4">
        {tiendas.map(tienda => (
          <Col key={tienda.id}>
            <Card className="h-100 shadow-sm border-0" style={{borderLeft: '5px solid var(--naranja) !important'}}>
              <Card.Body>
                <Card.Title className="fw-bold mb-3">{tienda.nombre}</Card.Title>
                <div className="d-flex align-items-center gap-2 mb-2 text-muted">
                  <MapPin size={18} /> <span>{tienda.dir}</span>
                </div>
                <div className="d-flex align-items-center gap-2 mb-2 text-muted">
                  <Phone size={18} /> <span>{tienda.tel}</span>
                </div>
                <div className="d-flex align-items-center gap-2 text-muted">
                  <Clock size={18} /> <span>Lun-Vie: 8am - 6pm | Sáb: 8am - 1pm</span>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}