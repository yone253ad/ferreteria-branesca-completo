import React from 'react';
import { Link } from 'react-router-dom';

function ProductList() {
  return (
    <div>
      <h2>Esta página ya no se usa</h2>
      <p>El catálogo principal ahora está en la página de inicio.</p>
      <Link to="/">Volver a Inicio</Link>
    </div>
  );
}

export default ProductList;