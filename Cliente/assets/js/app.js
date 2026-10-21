document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // CONFIGURACIÓN GLOBAL Y SESIÓN
  // ==========================================
  const API_URL = (window.location.hostname === 'localhost' && window.location.port === '3000')
    ? '/api'
    : 'http://localhost:3000/api';

  function obtenerUsuarioLogueado() {
    const data = localStorage.getItem('zenspace-usuario');
    try {
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  function actualizarHeaderUsuario() {
    const usuario = obtenerUsuarioLogueado();
    const btnsPerfil = document.querySelectorAll('.btn-perfil');
    btnsPerfil.forEach(btn => {
      if (usuario) {
        btn.setAttribute('href', 'perfil.html');
        btn.setAttribute('title', `Perfil de ${usuario.nombre || 'Usuario'}`);
      } else {
        btn.setAttribute('href', 'login.html');
        btn.setAttribute('title', 'Iniciar Sesión');
      }
    });
  }

  actualizarHeaderUsuario();

  // ==========================================
  // FAVORITOS
  // ==========================================
  function obtenerFavoritos() {
    const guardado = localStorage.getItem('zenspace-favoritos');
    return guardado ? JSON.parse(guardado) : [];
  }

  function guardarFavoritos(favoritos) {
    localStorage.setItem('zenspace-favoritos', JSON.stringify(favoritos));
  }

  function normalizarNombre(texto) {
    return texto.trim().toLowerCase();
  }

  function aplicarEstadoIcono(btn, activo) {
    const icono = btn.querySelector('i');
    if (activo) {
      btn.classList.add('activo');
      icono.classList.remove('bi-heart');
      icono.classList.add('bi-heart-fill');
    } else {
      btn.classList.remove('activo');
      icono.classList.remove('bi-heart-fill');
      icono.classList.add('bi-heart');
    }
  }

  document.querySelectorAll('.favorito').forEach(btn => {
    const card = btn.closest('.card-producto');
    if (!card) return;
    const nombreProducto = normalizarNombre(card.querySelector('h3').textContent);
    const favoritos = obtenerFavoritos();
    aplicarEstadoIcono(btn, favoritos.includes(nombreProducto));
    btn.addEventListener('click', () => {
      let favoritosActuales = obtenerFavoritos();
      const yaEsFavorito = favoritosActuales.includes(nombreProducto);
      if (yaEsFavorito) {
        favoritosActuales = favoritosActuales.filter(nombre => nombre !== nombreProducto);
      } else {
        favoritosActuales.push(nombreProducto);
      }
      guardarFavoritos(favoritosActuales);
      aplicarEstadoIcono(btn, !yaEsFavorito);
    });
  });

  // ==========================================
  // CARRITO EN MONGODB (POR USUARIO)
  // ==========================================
  async function obtenerCarrito() {
    const usuario = obtenerUsuarioLogueado();
    if (!usuario || !usuario.id) return [];

    try {
      const res = await fetch(`${API_URL}/carrito/${usuario.id}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.items || [];
    } catch (err) {
      console.error('Error al obtener carrito de MongoDB:', err);
      return [];
    }
  }

  async function agregarAlCarrito(producto) {
    const usuario = obtenerUsuarioLogueado();
    if (!usuario || !usuario.id) {
      alert('Debes iniciar sesión para agregar productos a tu carrito.');
      window.location.href = 'login.html';
      return false;
    }

    try {
      const res = await fetch(`${API_URL}/carrito/${usuario.id}/agregar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(producto)
      });
      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.error || 'Error al agregar producto al carrito');
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error al agregar al carrito en MongoDB:', err);
      alert('Error de conexión con el servidor.');
      return false;
    }
  }

  async function actualizarCantidadItem(nombre, cantidad) {
    const usuario = obtenerUsuarioLogueado();
    if (!usuario || !usuario.id) return;

    try {
      await fetch(`${API_URL}/carrito/${usuario.id}/item`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, cantidad })
      });
    } catch (err) {
      console.error('Error al actualizar cantidad:', err);
    }
  }

  async function eliminarItemCarrito(nombre) {
    const usuario = obtenerUsuarioLogueado();
    if (!usuario || !usuario.id) return;

    try {
      await fetch(`${API_URL}/carrito/${usuario.id}/item/${encodeURIComponent(nombre)}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error('Error al eliminar producto del carrito:', err);
    }
  }

  // Botones "Agregar al carrito" en Catálogo e Inicio
  document.querySelectorAll('.btn-agregar-carrito, .btn-aggcarrito').forEach(btn => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.card-producto');

      if (card) {
        const nombre = card.querySelector('h3').textContent.trim();
        const categoria = card.querySelector('.marcar-categoria')?.textContent.trim() || '';
        const precioTexto = card.querySelector('.precio-catalogo')?.textContent || '0';
        const precio = parseFloat(precioTexto.replace(/[^0-9.]+/g, '')) || 0;
        const imagen = card.querySelector('img')?.getAttribute('src') || '';

        const agregado = await agregarAlCarrito({ nombre, categoria, precio, imagen, cantidad: 1 });
        if (!agregado) return;
      }

      if (btn.classList.contains('agregado')) return;

      const iconoOriginal = btn.innerHTML;
      btn.innerHTML = '<i class="bi bi-check2"></i>';
      btn.classList.add('agregado');

      setTimeout(() => {
        btn.innerHTML = iconoOriginal;
        btn.classList.remove('agregado');
      }, 1200);
    });
  });

  // ==========================================
  // FILTROS Y BÚSQUEDA EN CATÁLOGO
  // ==========================================
  const chips = document.querySelectorAll('.chip');
  const productosCatalogo = document.querySelectorAll('.card-producto');
  const buscador = document.querySelector('.busqueda input');

  if (chips.length > 0 && productosCatalogo.length > 0) {
    const normalizar = (texto) =>
      texto.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const filtrarCatalogo = () => {
      const chipActivo = document.querySelector('.chip.activo');
      if (!chipActivo) return;

      const categoria = normalizar(chipActivo.textContent);
      const busqueda = buscador ? normalizar(buscador.value) : '';

      productosCatalogo.forEach(card => {
        const categoriaProducto = normalizar(card.querySelector('.marcar-categoria')?.textContent || '');
        const nombreProducto = normalizar(card.querySelector('h3')?.textContent || '');

        const coincideCategoria = categoria === 'todos' || categoriaProducto === categoria;
        const coincideBusqueda = nombreProducto.includes(busqueda);

        card.style.display = (coincideCategoria && coincideBusqueda) ? '' : 'none';
      });
    };

    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('activo'));
        chip.classList.add('activo');
        filtrarCatalogo();
      });
    });

    if (buscador) {
      buscador.addEventListener('input', filtrarCatalogo);
    }
  }

/* cards */



  // ==========================================
  // PANTALLA DEL CARRITO (carrito.html)
  // ==========================================
  const contenedorProductosCarrito = document.querySelector('.productos-carrito');

  if (contenedorProductosCarrito) {

    function crearFilaProducto(producto) {
      const totalLinea = producto.precio * producto.cantidad;
      return `
        <div class="lista-prodcutos">
          <div class="producto-agregado" data-nombre="${producto.nombre}">
            <img src="${producto.imagen}" alt="${producto.nombre}">
            <div class="descripcion-producto">
              <h3>${producto.nombre}</h3>
              <span class="marcar-categoria">${producto.categoria}</span>
              <h4>$${producto.precio.toFixed(2)}</h4>
            </div>
            <div class="cantidad-productos">
              <h4>Cantidad</h4>
              <div class="suma-resta-producto">
                <button class="restar-producto">-</button>
                <input type="text" class="numero-productos" value="${producto.cantidad}">
                <button class="sumar-producto">+</button>
              </div>
            </div>
            <div class="total-productosumado">
              <div class="total-precio">
                <span>$${totalLinea.toFixed(2)}</span>
                <button class="eliminar-producto"><i class="bi bi-trash"></i></button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    function mostrarEstadoVacio(vacio, textoPersonalizado) {
      let mensaje = document.querySelector('.carrito-vacio');

      if (vacio) {
        if (!mensaje) {
          mensaje = document.createElement('div');
          mensaje.className = 'carrito-vacio';
          mensaje.innerHTML = `
            <i class="bi bi-cart-x"></i>
            <h3>${textoPersonalizado || 'Tu carrito está vacío'}</h3>
            <p>Agrega productos desde el catálogo para verlos aquí</p>
            <a href="catalogo.html" class="btn-volver-catalogo">Ir al catálogo</a>
          `;
          contenedorProductosCarrito.appendChild(mensaje);
        }
      } else if (mensaje) {
        mensaje.remove();
      }
    }

    function actualizarTotales(items) {
      const subtotal = items.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
      const envio = subtotal > 0 ? 19.99 : 0;
      const descuento = subtotal > 0 ? 15.00 : 0;
      const total = subtotal + envio - descuento;

      const filas = document.querySelectorAll('.fila-resumen');
      if (filas[0]) filas[0].querySelector('span:last-child').textContent = '$' + subtotal.toFixed(2);
      if (filas[1]) filas[1].querySelector('span:last-child').textContent = '$' + envio.toFixed(2);
      if (filas[2]) filas[2].querySelector('span:last-child').textContent = '-$' + descuento.toFixed(2);

      const totalSpan = document.querySelector('.fila-total span');
      if (totalSpan) totalSpan.textContent = '$' + total.toFixed(2);
    }

    async function renderizarCarrito() {
      const usuario = obtenerUsuarioLogueado();
      if (!usuario) {
        contenedorProductosCarrito.innerHTML = '';
        mostrarEstadoVacio(true, 'Inicia sesión para ver y gestionar tu carrito');
        actualizarTotales([]);
        return;
      }

      contenedorProductosCarrito.innerHTML = '<p style="text-align:center; padding: 20px; color:#888;">Cargando tu carrito...</p>';
      const items = await obtenerCarrito();
      contenedorProductosCarrito.innerHTML = '';

      items.forEach(producto => {
        contenedorProductosCarrito.insertAdjacentHTML('beforeend', crearFilaProducto(producto));
      });

      mostrarEstadoVacio(items.length === 0);
      actualizarTotales(items);
    }

    contenedorProductosCarrito.addEventListener('click', async (e) => {
      const item = e.target.closest('.producto-agregado');
      if (!item) return;

      const nombre = item.dataset.nombre;
      const input = item.querySelector('.numero-productos');
      let cantidad = parseInt(input?.value) || 1;

      if (e.target.closest('.sumar-producto')) {
        cantidad += 1;
        await actualizarCantidadItem(nombre, cantidad);
        await renderizarCarrito();
        return;
      }

      if (e.target.closest('.restar-producto')) {
        if (cantidad <= 1) return;
        cantidad -= 1;
        await actualizarCantidadItem(nombre, cantidad);
        await renderizarCarrito();
        return;
      }

      if (e.target.closest('.eliminar-producto')) {
        await eliminarItemCarrito(nombre);
        await renderizarCarrito();
      }
    });

    contenedorProductosCarrito.addEventListener('change', async (e) => {
      if (!e.target.classList.contains('numero-productos')) return;

      const item = e.target.closest('.producto-agregado');
      const nombre = item.dataset.nombre;
      let cantidad = parseInt(e.target.value) || 1;
      if (cantidad < 1) cantidad = 1;

      await actualizarCantidadItem(nombre, cantidad);
      await renderizarCarrito();
    });

    renderizarCarrito();
  }

  // ==========================================
  // VISUALIZADOR 3D (visualizador.html)
  // ==========================================
  const itemsVisualizador = document.querySelectorAll('.item-3d');
  const lienzo = document.querySelector('.lienzo-3d');

  if (itemsVisualizador.length > 0 && lienzo) {
    itemsVisualizador.forEach(item => {
      item.addEventListener('click', () => {
        itemsVisualizador.forEach(i => i.classList.remove('activo'));
        item.classList.add('activo');

        const nombre = item.querySelector('h3')?.textContent || '';
        const precio = item.querySelector('.item-info span')?.textContent || '';
        const imgSrc = item.querySelector('img')?.getAttribute('src') || '';

        lienzo.innerHTML = `
          <div class="datos-visualizacion">
            <img src="${imgSrc}" alt="${nombre}" class="preview-3d">
            <h3>${nombre}</h3>
            <p>${precio}</p>
          </div>
        `;
      });
    });
  }

  // ==========================================
  // 1. LÓGICA DE REGISTRO (SPA)
  // ==========================================
  const formRegistro = document.getElementById('form-registro');
  if (formRegistro) {
    formRegistro.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const nombre = document.getElementById('nombre')?.value.trim();
      const correo = document.getElementById('correo')?.value.trim();
      const password = document.getElementById('password')?.value;
      const confirmInput = document.getElementById('confirmar-password') || document.getElementById('confirm-password');
      const confirmPassword = confirmInput?.value;

      if (!nombre || !correo || !password) {
        return alert('Por favor completa todos los campos requeridos.');
      }

      if (password !== confirmPassword) {
        return alert('Las contraseñas no coinciden. Por favor verifícalas.');
      }

      try {
        const respuesta = await fetch(`${API_URL}/auth/registro`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre, correo, password })
        });
        const data = await respuesta.json();
        
        if (respuesta.ok) {
          // Reemplazar la pantalla del formulario por una alerta SPA de éxito
          const contenedorAuth = document.querySelector('.auth-form');
          if (contenedorAuth) {
            contenedorAuth.innerHTML = `
              <div style="text-align: center; padding: 40px 20px; animation: fadeIn 0.4s ease;">
                <div style="width: 76px; height: 76px; background: #EAF2EB; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                  <i class="bi bi-check2-circle" style="font-size: 42px; color: #8BA889;"></i>
                </div>
                <h2 style="font-size: 24px; margin-bottom: 12px; color: #111;">¡Cuenta Creada Exitosamente!</h2>
                <p style="color: #666; font-size: 15px; margin-bottom: 30px; line-height: 1.5;">
                  Se creó de manera exitosa la cuenta para <strong>${nombre}</strong>. Haz clic en aceptar para iniciar sesión.
                </p>
                <button id="btn-aceptar-registro" class="btn-principal" style="width: 100%; max-width: 250px; margin: 0 auto; justify-content: center; display: inline-flex; align-items: center; gap: 8px; cursor: pointer;">
                  Aceptar
                  <i class="bi bi-arrow-right"></i>
                </button>
              </div>
            `;

            document.getElementById('btn-aceptar-registro').addEventListener('click', () => {
              window.location.href = 'login.html';
            });
          } else {
            alert('¡Se creó de manera exitosa la cuenta!');
            window.location.href = 'login.html';
          }
        } else {
          alert(data.error || 'Ocurrió un error al registrar la cuenta.');
        }
      } catch (error) {
        console.error('Error en registro:', error);
        alert('Error de conexión con el servidor. Asegúrate de que el backend esté corriendo en http://localhost:3000');
      }
    });
  }

  // ==========================================
  // 2. LÓGICA DE LOGIN
  // ==========================================
  const formLogin = document.getElementById('form-login');
  if (formLogin) {
    if (obtenerUsuarioLogueado()) {
      window.location.href = 'perfil.html';
    }

    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();

      const correo = document.getElementById('correo')?.value.trim();
      const password = document.getElementById('password')?.value;

      if (!correo || !password) {
        return alert('Por favor ingresa tu correo y contraseña.');
      }

      try {
        const respuesta = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ correo, password })
        });
        const data = await respuesta.json();

        if (respuesta.ok) {
          localStorage.setItem('zenspace-usuario', JSON.stringify(data.usuario));
          if (data.token) {
            localStorage.setItem('zenspace-token', data.token);
          }
          
          actualizarHeaderUsuario();
          window.location.href = 'perfil.html';
        } else {
          alert(data.error || 'Credenciales inválidas'); 
        }
      } catch (error) {
        console.error('Error en login:', error);
        alert('Error de conexión con el servidor. Asegúrate de que el backend esté corriendo en http://localhost:3000');
      }
    });
  }

  // ==========================================
  // 3. LÓGICA DE PERFIL (perfil.html)
  // ==========================================
  const seccionPerfil = document.querySelector('.perfil');
  if (seccionPerfil) {
    const usuario = obtenerUsuarioLogueado();
    if (!usuario) {
      window.location.href = 'login.html';
    } else {
      const nombreElem = seccionPerfil.querySelector('.datos-usuario h2');
      const correoElem = seccionPerfil.querySelector('.datos-usuario p');
      const puntosElem = seccionPerfil.querySelector('.contenedor-puntos h2');

      if (nombreElem && usuario.nombre) nombreElem.textContent = usuario.nombre;
      if (correoElem && usuario.correo) correoElem.textContent = usuario.correo;
      if (puntosElem) puntosElem.textContent = usuario.puntos ?? usuario.puntos_zen ?? 0;
    }

    const btnCerrar = seccionPerfil.querySelector('.btn-cerrar');
    if (btnCerrar) {
      btnCerrar.addEventListener('click', () => {
        localStorage.removeItem('zenspace-usuario');
        localStorage.removeItem('zenspace-token');
        actualizarHeaderUsuario();
        window.location.href = 'login.html';
      });
    }
  }

  // ==========================================
  // FINALIZAR COMPRA - SPA (Single Page Application en carrito.html)
  // ==========================================
  const seccionCarritoSPA = document.querySelector('.carrito');
  const headerCarritoTexto = document.querySelector('.header-carrito h3');

  function inicializarBotonFinalizarCarrito() {
    const btnFinalizar = document.querySelector('.btn-finalizar');
    if (!btnFinalizar) return;

    btnFinalizar.addEventListener('click', async (e) => {
      e.preventDefault();

      const usuarioActual = obtenerUsuarioLogueado();
      if (!usuarioActual) {
        alert('Debes iniciar sesión para finalizar tu compra.');
        window.location.href = 'login.html';
        return;
      }

      const itemsCarrito = await obtenerCarrito();
      if (!itemsCarrito || itemsCarrito.length === 0) {
        alert('Tu carrito está vacío. Agrega productos desde el catálogo.');
        return;
      }

      // Renderizar el formulario de compra en modo SPA
      renderizarCheckoutSPA(usuarioActual, itemsCarrito);
    });
  }

  function renderizarCheckoutSPA(usuarioActual, items) {
    if (!seccionCarritoSPA) return;

    if (headerCarritoTexto) {
      headerCarritoTexto.textContent = 'Finalizar compra';
    }

    const subtotal = items.reduce((acc, p) => acc + (p.precio * p.cantidad), 0);
    const envio = subtotal > 0 ? 19.99 : 0;
    const descuento = subtotal > 0 ? 15.00 : 0;
    const totalCompra = subtotal > 0 ? (subtotal + envio - descuento) : 0;

    // Cambiar grilla a formato checkout
    seccionCarritoSPA.style.gridTemplateColumns = '1fr';
    seccionCarritoSPA.innerHTML = `
      <div style="width: 100%; max-width: 1200px; margin: 0 auto; animation: fadeIn 0.3s ease;">
        <div class="pasos-compra" style="margin-bottom: 30px;">
          <div class="paso activo">
            <span>1</span>
            <div>
              <strong>Información</strong>
              <small>Datos personales</small>
            </div>
          </div>
          <div class="linea-paso"></div>
          <div class="paso activo">
            <span>2</span>
            <div>
              <strong>Entrega</strong>
              <small>Dirección</small>
            </div>
          </div>
          <div class="linea-paso"></div>
          <div class="paso activo">
            <span>3</span>
            <div>
              <strong>Pago</strong>
              <small>Método de pago</small>
            </div>
          </div>
        </div>

        <div class="contenido-compra">
          <main class="formulario-compra">
            <!-- SECCIÓN 1: DATOS PERSONALES -->
            <section class="seccion-compra">
              <div class="titulo-seccion-compra">
                <div class="icono-seccion">
                  <i class="bi bi-person"></i>
                </div>
                <div>
                  <h2>Información personal</h2>
                  <p>Confirma tus datos para continuar.</p>
                </div>
              </div>

              <div class="formulario-datos">
                <div class="campo-compra">
                  <label for="checkout-nombre">Nombre completo</label>
                  <div class="input-icono">
                    <i class="bi bi-person"></i>
                    <input type="text" id="checkout-nombre" value="${usuarioActual.nombre || ''}" placeholder="Nombre completo" required>
                  </div>
                </div>

                <div class="campo-compra">
                  <label for="checkout-correo">Correo electrónico</label>
                  <div class="input-icono">
                    <i class="bi bi-envelope"></i>
                    <input type="email" id="checkout-correo" value="${usuarioActual.correo || ''}" placeholder="usuario@zenspace.com" required>
                  </div>
                </div>

                <div class="campo-compra" style="grid-column: span 2;">
                  <label for="checkout-telefono">Teléfono de contacto</label>
                  <div class="input-icono">
                    <i class="bi bi-telephone"></i>
                    <input type="tel" id="checkout-telefono" placeholder="Ej: 300 123 4567" required>
                  </div>
                </div>
              </div>
            </section>

            <!-- SECCIÓN 2: DIRECCIÓN DE ENTREGA -->
            <section class="seccion-compra">
              <div class="titulo-seccion-compra">
                <div class="icono-seccion">
                  <i class="bi bi-geo-alt"></i>
                </div>
                <div>
                  <h2>Dirección de entrega</h2>
                  <p>Ingresa dónde deseas recibir tu pedido.</p>
                </div>
              </div>

              <div class="formulario-datos" style="margin-bottom: 10px;">
                <div class="campo-compra" style="grid-column: span 2;">
                  <label for="checkout-direccion">Dirección completa</label>
                  <div class="input-icono">
                    <i class="bi bi-house"></i>
                    <input type="text" id="checkout-direccion" placeholder="Ej: Calle 50 # 45 - 20, Apto 301" required>
                  </div>
                </div>

                <div class="campo-compra">
                  <label for="checkout-ciudad">Ciudad</label>
                  <div class="input-icono">
                    <i class="bi bi-building"></i>
                    <input type="text" id="checkout-ciudad" placeholder="Medellín" required>
                  </div>
                </div>

                <div class="campo-compra">
                  <label for="checkout-depto">Departamento / Región</label>
                  <div class="input-icono">
                    <i class="bi bi-map"></i>
                    <input type="text" id="checkout-depto" placeholder="Antioquia" required>
                  </div>
                </div>
              </div>
            </section>

            <!-- SECCIÓN 3: MÉTODO DE PAGO -->
            <section class="seccion-compra">
              <div class="titulo-seccion-compra">
                <div class="icono-seccion">
                  <i class="bi bi-credit-card"></i>
                </div>
                <div>
                  <h2>Método de pago</h2>
                  <p>Selecciona tu forma de pago preferida.</p>
                </div>
              </div>

              <div class="metodos-pago">
                <label class="metodo-card metodo-tarjeta activo" style="cursor: pointer;"> 
                  <input type="radio" name="metodo_pago_spa" value="Tarjeta" checked>
                  <div class="icono-pago">
                    <i class="bi bi-credit-card"></i>
                  </div>
                  <div>
                    <strong>Tarjeta débito o crédito</strong>
                    <p>Visa, Mastercard y otras tarjetas</p>
                  </div>
                  <i class="bi bi-check-circle check-pago"></i>
                </label>

                <label class="metodo-card metodo-epayco" style="cursor: pointer;">
                  <input type="radio" name="metodo_pago_spa" value="ePayco">
                  <div class="icono-pago">
                    <i class="bi bi-wallet2"></i>
                  </div>
                  <div>
                    <strong>ePayco / PSE / Efectivo</strong>
                    <p>Transferencia bancaria o efectivo</p>
                  </div>
                  <i class="bi bi-circle check-pago"></i>
                </label>
              </div>

              <div class="datos-tarjeta" id="contenedor-datos-tarjeta-spa" style="margin-top: 20px;">
                <div class="campo-compra campo-completo">
                  <label for="numero-tarjeta-spa">Número de tarjeta</label>
                  <div class="input-icono">
                    <i class="bi bi-credit-card"></i>
                    <input type="text" id="numero-tarjeta-spa" placeholder="0000 0000 0000 0000" maxlength="19">
                  </div>
                </div>

                <div class="fila-campos">
                  <div class="campo-compra">
                    <label for="titular-spa">Nombre del titular</label>
                    <div class="input-icono">
                      <i class="bi bi-person"></i>
                      <input type="text" id="titular-spa" placeholder="Como aparece en la tarjeta">
                    </div>
                  </div>

                  <div class="campo-compra">
                    <label for="vencimiento-spa">Vencimiento (MM/AA)</label>
                    <div class="input-icono">
                      <i class="bi bi-calendar"></i>
                      <input type="text" id="vencimiento-spa" placeholder="MM / AA" maxlength="5">
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div class="acciones-compra" style="margin-top: 15px;">
              <button type="button" id="btn-volver-a-carrito" class="btn-volver" style="border: none; cursor: pointer;">
                <i class="bi bi-arrow-left"></i> Volver al carrito
              </button>
            </div>
          </main>

          <!-- RESUMEN LATERAL DERECHO -->
          <aside class="resumen-compra">
            <div class="titulo-resumen">
              <h2>Resumen del pedido</h2>
              <span>${items.length} ${items.length === 1 ? 'producto' : 'productos'}</span>
            </div>

            <div class="productos-resumen">
              ${items.map(p => `
                <div class="producto-resumen">
                  <img src="${p.imagen || './images/logo.png'}" alt="${p.nombre}">
                  <div class="info-producto-resumen">
                    <h3>${p.nombre}</h3>
                    <span>Cantidad: ${p.cantidad}</span>
                    <strong>$${(p.precio * p.cantidad).toFixed(2)}</strong>
                  </div>
                </div>
              `).join('')}
            </div>

            <div class="detalle-precio">
              <div>
                <span>Subtotal</span>
                <span>$${subtotal.toFixed(2)}</span>
              </div>
              <div>
                <span>Envío</span>
                <span>$${envio.toFixed(2)}</span>
              </div>
              <div>
                <span>Descuento</span>
                <span style="color: #2e7d32;">-$${descuento.toFixed(2)}</span>
              </div>
            </div>

            <div class="total-compra">
              <span>Total a Pagar</span>
              <strong>$${totalCompra.toFixed(2)}</strong>
            </div>

            <button class="btn-pagar" id="btn-confirmar-pago-spa" style="cursor: pointer;">
              <i class="bi bi-lock"></i> Pagar Ahora
            </button>

            <p class="pago-seguro">
              <i class="bi bi-shield-check"></i> Pago seguro y cifrado con SSL
            </p>
          </aside>
        </div>
      </div>
    `;

    // 1. Manejo del botón "Volver al carrito"
    document.getElementById('btn-volver-a-carrito')?.addEventListener('click', () => {
      restaurarVistaCarrito();
    });

    // 2. Manejo de métodos de pago (mostrar/ocultar tarjeta)
    const contenedorTarjetaSPA = document.getElementById('contenedor-datos-tarjeta-spa');
    const radiosPagoSPA = document.querySelectorAll('input[name="metodo_pago_spa"]');
    radiosPagoSPA.forEach(radio => {
      radio.addEventListener('change', () => {
        const cards = document.querySelectorAll('.metodo-card');
        cards.forEach(c => {
          c.classList.remove('activo');
          const icono = c.querySelector('.check-pago');
          if (icono) {
            icono.classList.remove('bi-check-circle');
            icono.classList.add('bi-circle');
          }
        });
        
        const cardSeleccionada = radio.closest('.metodo-card');
        if (cardSeleccionada) {
          cardSeleccionada.classList.add('activo');
          const icono = cardSeleccionada.querySelector('.check-pago');
          if (icono) {
            icono.classList.remove('bi-circle');
            icono.classList.add('bi-check-circle');
          }
        }

        if (contenedorTarjetaSPA) {
          contenedorTarjetaSPA.style.display = radio.value === 'Tarjeta' ? 'block' : 'none';
        }
      });
    });

    // 3. Procesar compra al hacer clic en "Pagar Ahora"
    document.getElementById('btn-confirmar-pago-spa')?.addEventListener('click', async (e) => {
      e.preventDefault();

      const nombre = document.getElementById('checkout-nombre')?.value.trim();
      const correo = document.getElementById('checkout-correo')?.value.trim();
      const telefono = document.getElementById('checkout-telefono')?.value.trim();
      const direccion = document.getElementById('checkout-direccion')?.value.trim();
      const ciudad = document.getElementById('checkout-ciudad')?.value.trim();
      const depto = document.getElementById('checkout-depto')?.value.trim();
      const metodoSeleccionado = document.querySelector('input[name="metodo_pago_spa"]:checked')?.value || 'Tarjeta';

      if (!nombre || !correo || !telefono || !direccion || !ciudad || !depto) {
        return alert('Por favor completa todos los datos de contacto y entrega requeridos.');
      }

      const btnPagar = document.getElementById('btn-confirmar-pago-spa');
      btnPagar.innerHTML = '<i class="bi bi-arrow-repeat" style="animation: spin 1s linear infinite;"></i> Procesando pago...';
      btnPagar.disabled = true;

      try {
        const itemsPedido = items.map(item => ({
          producto: item.nombre,
          cantidad: item.cantidad,
          precio_unitario: item.precio
        }));

        const datosPedido = {
          usuario: usuarioActual._id || usuarioActual.id,
          items: itemsPedido,
          total: totalCompra,
          pago: {
            metodo: metodoSeleccionado,
            estado: 'Completado'
          },
          envio: {
            estado: 'Pendiente',
            direccion: `${direccion}, ${ciudad} (${depto})`,
            telefono: telefono
          }
        };

        const res = await fetch(`${API_URL}/pedidos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(datosPedido)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Error al procesar el pedido');
        }

        const resData = await res.json();
        const idPedido = resData.idPedido || resData._id || 'ZEN-' + Date.now();

        // Vaciar carrito en MongoDB
        try {
          await fetch(`${API_URL}/carrito/${usuarioActual._id || usuarioActual.id}/vaciar`, { method: 'DELETE' });
        } catch (errVaciar) {
          console.warn('Error al vaciar carrito:', errVaciar);
        }

        // Sumar puntos Zen
        try {
          const puntosGanados = Math.floor(totalCompra * 0.1);
          if (puntosGanados > 0) {
            await fetch(`${API_URL}/puntos/sumar`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id_usuario: usuarioActual._id || usuarioActual.id, puntos: puntosGanados })
            });
            if (usuarioActual.puntos !== undefined) usuarioActual.puntos += puntosGanados;
            else if (usuarioActual.puntos_zen !== undefined) usuarioActual.puntos_zen += puntosGanados;
            else usuarioActual.puntos = puntosGanados;
            localStorage.setItem('zenspace-usuario', JSON.stringify(usuarioActual));
          }
        } catch (errPuntos) {
          console.warn('Error al sumar puntos:', errPuntos);
        }

        // Mostrar pantalla de éxito SPA
        mostrarExitoCheckoutSPA(nombre, correo, idPedido, totalCompra, metodoSeleccionado);

      } catch (err) {
        console.error('Error al pagar:', err);
        alert(err.message || 'Error al procesar el pago. Inténtalo nuevamente.');
        btnPagar.innerHTML = '<i class="bi bi-lock"></i> Pagar Ahora';
        btnPagar.disabled = false;
      }
    });
  }

  function mostrarExitoCheckoutSPA(nombre, correo, idPedido, totalCompra, metodo) {
    if (!seccionCarritoSPA) return;
    if (headerCarritoTexto) headerCarritoTexto.textContent = 'Pedido Confirmado';

    seccionCarritoSPA.style.gridTemplateColumns = '1fr';
    seccionCarritoSPA.innerHTML = `
      <div style="background: #ffffff; border-radius: 24px; padding: 60px 40px; text-align: center; max-width: 650px; margin: 30px auto; box-shadow: 0 4px 20px rgba(0,0,0,0.06); animation: fadeIn 0.4s ease;">
        <div style="width: 80px; height: 80px; background: #EAF2EB; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
          <i class="bi bi-check2-circle" style="font-size: 46px; color: #8BA889;"></i>
        </div>
        <h2 style="font-size: 28px; color: #111; margin-bottom: 10px; font-weight: 700;">¡Pago Realizado con Éxito!</h2>
        <p style="color: #666; font-size: 15px; margin-bottom: 25px; line-height: 1.5;">
          Gracias <strong>${nombre}</strong>, tu pedido ha sido procesado de manera exitosa y enviaremos la confirmación a <strong>${correo}</strong>.
        </p>
        
        <div style="background: #FAF8F5; border: 1px solid #ECE7E1; border-radius: 16px; padding: 20px 25px; margin-bottom: 30px; display: flex; justify-content: space-around; align-items: center; flex-wrap: wrap; gap: 15px;">
          <div>
            <span style="color: #888; font-size: 13px; display: block;">Número de Pedido</span>
            <strong style="color: #111; font-size: 16px; font-family: monospace;">#${String(idPedido).slice(-8).toUpperCase()}</strong>
          </div>
          <div>
            <span style="color: #888; font-size: 13px; display: block;">Total Pagado</span>
            <strong style="color: #2e7d32; font-size: 18px;">$${Number(totalCompra).toFixed(2)}</strong>
          </div>
          <div>
            <span style="color: #888; font-size: 13px; display: block;">Método</span>
            <strong style="color: #444; font-size: 14px;">${metodo}</strong>
          </div>
        </div>

        <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
          <a href="perfil.html" class="btn-principal" style="padding: 14px 28px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; border-radius: 12px; font-weight: 600;">
            <i class="bi bi-person"></i> Ver en mi Perfil
          </a>
          <a href="catalogo.html" style="padding: 14px 28px; text-decoration: none; background: #f0ede8; color: #333; border-radius: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 8px;">
            <i class="bi bi-bag"></i> Seguir comprando
          </a>
        </div>
      </div>
    `;
  }

  function restaurarVistaCarrito() {
    if (!seccionCarritoSPA) return;
    if (headerCarritoTexto) headerCarritoTexto.textContent = 'Carrito de compras';

    seccionCarritoSPA.style.gridTemplateColumns = 'minmax(0, 1fr) minmax(320px, 380px)';
    seccionCarritoSPA.innerHTML = `
      <aside class="productos-carrito">
        <p style="text-align: center; color: #888;">Cargando tu carrito...</p>
      </aside>

      <div class="resumen-columna">
        <div class="resumen-carrito">
          <div class="resumen-pedido">
            <h3>Resumen del pedido</h3>
            <div class="fila-resumen">
              <span>Subtotal</span>
              <span>$0.00</span>
            </div>
            <div class="fila-resumen">
              <span>Envío</span>
              <span>$0.00</span>
            </div>
            <div class="fila-resumen">
              <span>Descuento</span>
              <span class="descuento">-$0.00</span>
            </div>
          </div>

          <div class="finalizar-compra">
            <div class="fila-total">
              <h2>Total</h2>
              <span>$0.00</span>
            </div>
            <p class="impuestos">Impuestos incluidos</p>
            <button class="btn-finalizar">
              <i class="bi bi-lock"></i> Finalizar compra
            </button>
            <button class="btn-envio">
              Calcular envío <i class="bi bi-truck"></i>
            </button>
          </div>
        </div>

        <div class="confianza-compra">
          <div class="fila-confianza">
            <i class="bi bi-shield-check"></i>
            <div class="texto-confianza">
              <h4>Pago seguro</h4>
              <p>Tus datos están protegidos</p>
            </div>
          </div>
          <div class="fila-confianza">
            <i class="bi bi-truck"></i>
            <div class="texto-confianza">
              <h4>Envío rápido</h4>
              <p>Recibe tu pedido en 3-5 días hábiles</p>
            </div>
          </div>
          <div class="fila-confianza">
            <i class="bi bi-headset"></i>
            <div class="texto-confianza">
              <h4>Atención al cliente</h4>
              <p>Estamos aquí para ayudarte</p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Re-renderizar productos del carrito
    const nuevoContenedor = seccionCarritoSPA.querySelector('.productos-carrito');
    if (nuevoContenedor) {
      // Re-ejecutar renderizado
      renderizarCarrito();
    }
    inicializarBotonFinalizarCarrito();
  }

  inicializarBotonFinalizarCarrito();

});