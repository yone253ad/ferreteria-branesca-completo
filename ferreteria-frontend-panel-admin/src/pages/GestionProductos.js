import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Table, Button, Modal, Form, Alert, Spinner, Row, Col, Image, Badge } from 'react-bootstrap';

function GestionProductos() {
  const auth = useAuth();
  
  // --- Estados de Datos ---
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  
  // --- Estados de Interfaz ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // --- Estados de Edición y Formulario ---
  const [editingId, setEditingId] = useState(null); // ID del producto si estamos editando
  const [preview, setPreview] = useState(null); // URL para mostrar la imagen (local o servidor)

  const [formData, setFormData] = useState({
    sku: '',
    nombre: '',
    descripcion: '',
    precio: '',
    categoria: '',
    imagen: null // Aquí se guardará el archivo 'File'
  });

  // 1. Cargar Datos Iniciales
  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        auth.axiosApi.get('/productos/'),
        auth.axiosApi.get('/categorias/')
      ]);
      setProductos(prodRes.data);
      setCategorias(catRes.data);
      setLoading(false);
    } catch (err) {
      console.error("Error cargando datos:", err);
      setError("Error al cargar la lista de productos.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [auth.axiosApi]);


  // 2. Manejo del Modal (Abrir/Cerrar)
  const handleClose = () => {
    setShowModal(false);
    setEditingId(null);
    setPreview(null);
    setFormData({ sku: '', nombre: '', descripcion: '', precio: '', categoria: '', imagen: null });
  };

  const handleShowCreate = () => {
    setEditingId(null); // Modo Crear
    setPreview(null);
    setFormData({ sku: '', nombre: '', descripcion: '', precio: '', categoria: '', imagen: null });
    setShowModal(true);
  };

  // 3. Manejo del Formulario (Inputs)
  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === 'imagen' && files && files[0]) {
      const file = files[0];
      setFormData({ ...formData, imagen: file });
      // Generamos una URL temporal para previsualizar la imagen local
      setPreview(URL.createObjectURL(file));
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // 4. Preparar Edición (Cargar datos en el modal)
  const handleEdit = (producto) => {
    setEditingId(producto.id); // Modo Edición
    setFormData({
      sku: producto.sku,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      precio: producto.precio,
      categoria: producto.categoria || '', // Si es null, pon string vacío
      imagen: null // Reseteamos el archivo, si no sube nada, se queda la anterior
    });
    // Mostramos la imagen que ya tiene el producto (si tiene)
    setPreview(producto.imagen); 
    setShowModal(true);
  };

  // 5. Enviar Formulario (Crear o Actualizar)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = new FormData();
      dataToSend.append('sku', formData.sku);
      dataToSend.append('nombre', formData.nombre);
      dataToSend.append('descripcion', formData.descripcion);
      dataToSend.append('precio', formData.precio);
      if (formData.categoria) dataToSend.append('categoria', formData.categoria);
      
      // Solo enviamos la imagen si el usuario seleccionó un archivo nuevo
      if (formData.imagen instanceof File) {
        dataToSend.append('imagen', formData.imagen);
      }

      if (editingId) {
        // --- MODO ACTUALIZAR (PATCH) ---
        await auth.axiosApi.patch(`/productos/${editingId}/`, dataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        alert('¡Producto actualizado con éxito!');
      } else {
        // --- MODO CREAR (POST) ---
        await auth.axiosApi.post('/productos/', dataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        alert('¡Producto creado con éxito!');
      }

      handleClose();
      fetchData(); // Recargar lista

    } catch (err) {
      console.error("Error guardando producto:", err);
      alert("Error al guardar. Revisa los datos (SKU único, campos requeridos).");
    }
  };

  // 6. Eliminar Producto
  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este producto?")) {
      try {
        await auth.axiosApi.delete(`/productos/${id}/`);
        fetchData();
      } catch (err) {
        alert("Error al eliminar producto.");
      }
    }
  };

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Gestión de Productos</h2>
        <Button variant="success" onClick={handleShowCreate}>
          + Nuevo Producto
        </Button>
      </div>

      <Table striped bordered hover responsive className="align-middle">
        <thead className="bg-dark text-white">
          <tr>
            <th style={{width: '80px'}}>Img</th>
            <th>SKU</th>
            <th>Nombre</th>
            <th>Precio</th>
            <th>Categoría</th>
            <th style={{width: '150px'}}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {productos.map(prod => (
            <tr key={prod.id}>
              <td className="text-center">
                {prod.imagen ? (
                  <Image src={prod.imagen} thumbnail style={{ width: '50px', height: '50px', objectFit: 'cover' }} />
                ) : <Badge bg="secondary">Sin Foto</Badge>}
              </td>
              <td className="fw-bold">{prod.sku}</td>
              <td>{prod.nombre}</td>
              <td>${parseFloat(prod.precio).toFixed(2)}</td>
              <td>
                {categorias.find(c => c.id === prod.categoria)?.nombre || <span className="text-muted">-</span>}
              </td>
              <td>
                <div className="d-flex gap-2">
                  {/* Botón Editar */}
                  <Button variant="warning" size="sm" onClick={() => handleEdit(prod)}>
                    ✎
                  </Button>
                  {/* Botón Eliminar */}
                  <Button variant="danger" size="sm" onClick={() => handleDelete(prod.id)}>
                    🗑
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* --- MODAL (Crear / Editar) --- */}
      <Modal show={showModal} onHide={handleClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingId ? 'Editar Producto' : 'Agregar Nuevo Producto'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Row>
              {/* Columna Izquierda: Datos */}
              <Col md={8}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>SKU</Form.Label>
                      <Form.Control 
                        name="sku" 
                        value={formData.sku} 
                        onChange={handleChange} 
                        required 
                        placeholder="Ej: HER-001"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Precio ($)</Form.Label>
                      <Form.Control 
                        type="number" 
                        step="0.01" 
                        name="precio" 
                        value={formData.precio} 
                        onChange={handleChange} 
                        required 
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Nombre</Form.Label>
                  <Form.Control 
                    name="nombre" 
                    value={formData.nombre} 
                    onChange={handleChange} 
                    required 
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Categoría</Form.Label>
                  <Form.Select 
                    name="categoria" 
                    value={formData.categoria} 
                    onChange={handleChange} 
                    required
                  >
                    <option value="">Seleccione una categoría...</option>
                    {categorias.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Descripción</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={3} 
                    name="descripcion" 
                    value={formData.descripcion} 
                    onChange={handleChange} 
                    required 
                  />
                </Form.Group>
              </Col>

              {/* Columna Derecha: Imagen y Previsualización */}
              <Col md={4} className="d-flex flex-column align-items-center justify-content-start pt-4">
                 <div className="border p-2 mb-3" style={{ width: '100%', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa' }}>
                    {preview ? (
                      <Image src={preview} fluid style={{ maxHeight: '200px' }} />
                    ) : (
                      <span className="text-muted">Sin imagen</span>
                    )}
                 </div>
                 
                 <Form.Group className="w-100">
                   <Form.Label className="btn btn-outline-primary w-100">
                     {preview ? 'Cambiar Imagen' : 'Subir Imagen'}
                     <Form.Control 
                       type="file" 
                       name="imagen" 
                       onChange={handleChange} 
                       hidden 
                       accept="image/*"
                     />
                   </Form.Label>
                   {editingId && !formData.imagen && (
                     <Form.Text className="text-muted text-center d-block small">
                       Deja vacío para mantener la actual.
                     </Form.Text>
                   )}
                 </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-end gap-2 mt-3 border-top pt-3">
              <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
              <Button variant="primary" type="submit">
                {editingId ? 'Guardar Cambios' : 'Crear Producto'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default GestionProductos;