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
    const urlDashboard = window.location.protocol.startsWith('http') ? '/admin/dashboard.html' : '../admin/dashboard.html';

    btnsPerfil.forEach(btn => {
      if (usuario) {
        if (usuario.rol === 'tienda') {
          btn.setAttribute('href', urlDashboard);
          btn.setAttribute('title', `Panel Tienda: ${usuario.nombre || 'Tienda'}`);
          if (usuario.avatar) {
            btn.innerHTML = `<img src="${usuario.avatar}" alt="Tienda" style="width:28px; height:28px; border-radius:50%; object-fit:cover; border:2px solid #6E8E6C; vertical-align:middle;">`;
          } else {
            btn.innerHTML = '<i class="bi bi-shop" style="color: #6E8E6C; font-size: 1.15rem;"></i>';
          }
          btn.onclick = (e) => {
            e.preventDefault();
            window.location.href = urlDashboard;
          };
        } else {
          btn.setAttribute('href', 'perfil.html');
          btn.setAttribute('title', `Perfil de ${usuario.nombre || 'Usuario'}`);
          if (usuario.avatar) {
            btn.innerHTML = `<img src="${usuario.avatar}" alt="Perfil" style="width:28px; height:28px; border-radius:50%; object-fit:cover; border:1px solid #8BA889; vertical-align:middle;">`;
          } else {
            btn.innerHTML = '<i class="bi bi-person"></i>';
          }
          btn.onclick = null;
        }
      } else {
        btn.setAttribute('href', 'login.html');
        btn.setAttribute('title', 'Iniciar Sesión');
        btn.innerHTML = '<i class="bi bi-person"></i>';
        btn.onclick = null;
      }
    });
    actualizarBadgeFavoritos();
  }

  actualizarHeaderUsuario();

  // ==========================================
  // FAVORITOS Y VISUALIZADOR 3D HELPERS
  // ==========================================
  function obtenerFavoritos() {
    const usuario = obtenerUsuarioLogueado();
    if (!usuario || !usuario.id) return [];
    try {
      // Migración automática de favoritos legacy
      const keyUsuario = `zenspace_favoritos_${usuario.id}`;
      if (!localStorage.getItem(keyUsuario)) {
        const legacy = localStorage.getItem('zenspace-favoritos');
        if (legacy) {
          localStorage.setItem(keyUsuario, legacy);
          localStorage.removeItem('zenspace-favoritos');
        }
      }

      const guardado = localStorage.getItem(keyUsuario);
      if (!guardado) return [];
      const parsed = JSON.parse(guardado);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error al leer favoritos:', e);
      return [];
    }
  }

  function guardarFavoritos(favoritos) {
    const usuario = obtenerUsuarioLogueado();
    if (!usuario || !usuario.id) return;
    try {
      localStorage.setItem(`zenspace_favoritos_${usuario.id}`, JSON.stringify(favoritos));
    } catch (e) {
      console.error('Error al guardar favoritos:', e);
    }
  }

  function esFavorito(prodONombre) {
    const favs = obtenerFavoritos();
    if (!favs || favs.length === 0) return false;
    let targetNombre = '';
    let targetId = '';
    if (typeof prodONombre === 'string') {
      targetNombre = normalizarNombre(prodONombre);
    } else if (prodONombre && typeof prodONombre === 'object') {
      targetNombre = normalizarNombre(prodONombre.nombre || '');
      targetId = String(prodONombre._id || prodONombre.id || '');
    }
    return favs.some(item => {
      if (typeof item === 'string') {
        return normalizarNombre(item) === targetNombre;
      }
      if (targetId && item.id && String(item.id) === targetId) return true;
      return normalizarNombre(item.nombre || '') === targetNombre;
    });
  }

  function alternarFavorito(prod) {
    const usuario = obtenerUsuarioLogueado();
    if (!usuario || !usuario.id) {
      alert('Debes iniciar sesión para guardar productos en tus favoritos.');
      window.location.href = 'login.html';
      return false;
    }

    let favs = obtenerFavoritos();
    const ya = esFavorito(prod);
    const targetNombre = normalizarNombre(typeof prod === 'string' ? prod : (prod.nombre || ''));
    const targetId = String(prod?._id || prod?.id || '');

    if (ya) {
      favs = favs.filter(item => {
        if (typeof item === 'string') return normalizarNombre(item) !== targetNombre;
        if (targetId && item.id && String(item.id) === targetId) return false;
        return normalizarNombre(item.nombre || '') !== targetNombre;
      });
      guardarFavoritos(favs);
      return false;
    } else {
      let fullProd = (typeof prod === 'object' && prod !== null) ? prod : null;
      if (!fullProd && productosGlobales.length > 0) {
        fullProd = productosGlobales.find(p => normalizarNombre(p.nombre) === targetNombre);
      }

      // Buscar coincidencia exacta en productosGlobales para asegurar el precio real de MongoDB
      const matchGlobal = productosGlobales.find(p => 
        (fullProd && (fullProd._id || fullProd.id) && String(p._id) === String(fullProd._id || fullProd.id)) ||
        normalizarNombre(p.nombre) === targetNombre
      );

      const prodFinal = matchGlobal || fullProd || {};
      const precioExacto = typeof prodFinal.precio === 'number' ? prodFinal.precio : parseFloat(prodFinal.precio) || 0;

      favs.push({
        id: String(prodFinal._id || prodFinal.id || Date.now()),
        nombre: prodFinal.nombre || (typeof prod === 'string' ? prod : 'Producto Zen'),
        precio: precioExacto,
        imagen: obtenerRutaImagen(prodFinal.imagen_url || prodFinal.imagen),
        categoria: obtenerNombreCategoria(prodFinal.categoria)
      });
      guardarFavoritos(favs);
      return true;
    }
  }

  function obtenerVisualizadorUsuario() {
    const usuario = obtenerUsuarioLogueado();
    if (!usuario || !usuario.id) return [];
    try {
      const guardado = localStorage.getItem(`zenspace_visualizador_${usuario.id}`);
      return guardado ? JSON.parse(guardado) : [];
    } catch (e) {
      console.error('Error al leer visualizador de localStorage:', e);
      return [];
    }
  }

  function guardarVisualizadorUsuario(items) {
    const usuario = obtenerUsuarioLogueado();
    if (!usuario || !usuario.id) return;
    try {
      localStorage.setItem(`zenspace_visualizador_${usuario.id}`, JSON.stringify(items));
    } catch (e) {
      console.error('Error al guardar visualizador en localStorage:', e);
    }
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

  // Variable para almacenar la vista original de la SPA
  let vistaOriginalHTML = null;
  let productosGlobales = [];

  async function asegurarProductosGlobales() {
    if (productosGlobales && productosGlobales.length > 0) {
      return productosGlobales;
    }
    try {
      const res = await fetch(`${API_URL}/productos`);
      if (res.ok) {
        productosGlobales = await res.json();
      }
    } catch (err) {
      console.warn('Error al consultar /api/productos en segundo plano:', err);
    }
    return productosGlobales || [];
  }
  // Carga preventiva de productos globales
  asegurarProductosGlobales();

  function asociarEventosFavoritos(contenedor, listaProductos) {
    const target = contenedor || document;
    target.querySelectorAll('.favorito').forEach(btn => {
      const card = btn.closest('.card-producto');
      if (!card) return;
      const cardId = card.dataset.id;
      const nombreProducto = card.querySelector('h3')?.textContent.trim() || '';

      const prodEncontrado = (listaProductos || productosGlobales).find(p => 
        (cardId && String(p._id) === String(cardId)) || 
        normalizarNombre(p.nombre) === normalizarNombre(nombreProducto)
      ) || {
        _id: cardId,
        nombre: nombreProducto,
        precio: parseFloat(card.querySelector('.precio-catalogo')?.textContent.replace(/[^0-9.]+/g, '') || 0),
        imagen_url: card.querySelector('img')?.getAttribute('src') || '',
        categoria: card.querySelector('.marcar-categoria')?.textContent.trim() || ''
      };

      aplicarEstadoIcono(btn, esFavorito(prodEncontrado));

      btn.onclick = (e) => {
        e.stopPropagation();
        const usuario = obtenerUsuarioLogueado();
        if (!usuario || !usuario.id) {
          alert('Debes iniciar sesión para agregar productos a tus favoritos.');
          window.location.href = 'login.html';
          return;
        }

        const nuevoEstado = alternarFavorito(prodEncontrado);
        aplicarEstadoIcono(btn, nuevoEstado);
        actualizarBadgeFavoritos();
      };
    });
  }

  // ==========================================
  // PANEL / DRAWER DE FAVORITOS (NOVEDOSO)
  // ==========================================
  function actualizarBadgeFavoritos() {
    const usuario = obtenerUsuarioLogueado();
    const badges = document.querySelectorAll('.badge-favoritos-contador');
    if (!usuario || !usuario.id) {
      badges.forEach(badge => {
        badge.textContent = '0';
        badge.classList.add('oculto');
        badge.style.display = 'none';
      });
      return;
    }

    const favs = obtenerFavoritos();
    badges.forEach(badge => {
      badge.textContent = favs.length;
      if (favs.length > 0) {
        badge.classList.remove('oculto');
        badge.style.display = 'flex';
      } else {
        badge.classList.add('oculto');
        badge.style.display = 'none';
      }
    });
  }

  function asegurarDrawerFavoritosEnDOM() {
    if (document.getElementById('drawer-favoritos-panel')) return;

    const overlay = document.createElement('div');
    overlay.className = 'drawer-favoritos-overlay';
    overlay.id = 'drawer-favoritos-overlay';

    const drawer = document.createElement('div');
    drawer.className = 'drawer-favoritos';
    drawer.id = 'drawer-favoritos-panel';
    drawer.innerHTML = `
      <div class="drawer-header">
        <h3><i class="bi bi-heart-fill" style="color:#C5221F;"></i> Mis Favoritos (<span id="drawer-contador-num">0</span>)</h3>
        <button type="button" class="btn-cerrar-drawer" id="btn-cerrar-drawer-fav">&times;</button>
      </div>
      <div class="drawer-body" id="drawer-favoritos-body"></div>
      <div class="drawer-footer" id="drawer-favoritos-footer">
        <a href="catalogo.html" class="btn-drawer-explorar" id="btn-drawer-ir-catalogo">
          <i class="bi bi-compass"></i> Explorar Más en Catálogo
        </a>
        <button type="button" class="btn-drawer-vaciar" id="btn-vaciar-favoritos">
          <i class="bi bi-trash"></i> Vaciar Favoritos
        </button>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    overlay.onclick = cerrarDrawerFavoritos;
    drawer.querySelector('#btn-cerrar-drawer-fav').onclick = cerrarDrawerFavoritos;

    const btnVaciar = drawer.querySelector('#btn-vaciar-favoritos');
    if (btnVaciar) {
      btnVaciar.onclick = () => {
        if (confirm('¿Deseas vaciar tu lista de favoritos?')) {
          guardarFavoritos([]);
          actualizarBadgeFavoritos();
          renderizarContenidoDrawerFavoritos();
          document.querySelectorAll('.favorito').forEach(btn => aplicarEstadoIcono(btn, false));
        }
      };
    }
  }

  function abrirDrawerFavoritos() {
    asegurarDrawerFavoritosEnDOM();
    renderizarContenidoDrawerFavoritos();
    const overlay = document.getElementById('drawer-favoritos-overlay');
    const drawer = document.getElementById('drawer-favoritos-panel');
    if (overlay && drawer) {
      overlay.classList.add('abierto');
      drawer.classList.add('abierto');
    }
  }

  function cerrarDrawerFavoritos() {
    const overlay = document.getElementById('drawer-favoritos-overlay');
    const drawer = document.getElementById('drawer-favoritos-panel');
    if (overlay && drawer) {
      overlay.classList.remove('abierto');
      drawer.classList.remove('abierto');
    }
  }

  async function renderizarContenidoDrawerFavoritos() {
    const body = document.getElementById('drawer-favoritos-body');
    const contadorNum = document.getElementById('drawer-contador-num');
    const footer = document.getElementById('drawer-favoritos-footer');
    if (!body) return;

    const usuario = obtenerUsuarioLogueado();
    if (!usuario || !usuario.id) {
      if (contadorNum) contadorNum.textContent = '0';
      body.innerHTML = `
        <div class="drawer-fav-vacio">
          <i class="bi bi-person-lock"></i>
          <h4>Inicia Sesión</h4>
          <p>Debes iniciar sesión para consultar y gestionar tus piezas favoritas.</p>
          <a href="login.html" class="btn-drawer-explorar" style="margin-top:10px;">
            <i class="bi bi-box-arrow-in-right"></i> Iniciar Sesión
          </a>
        </div>
      `;
      if (footer) footer.style.display = 'none';
      return;
    }

    if (footer) footer.style.display = 'flex';

    await asegurarProductosGlobales();

    const favs = obtenerFavoritos();
    if (contadorNum) contadorNum.textContent = favs.length;

    if (favs.length === 0) {
      body.innerHTML = `
        <div class="drawer-fav-vacio">
          <i class="bi bi-heart"></i>
          <h4>Tu lista de favoritos está en calma</h4>
          <p>Haz clic en el corazón de cualquier pieza para guardarla aquí y tenerla siempre a mano.</p>
        </div>
      `;
      if (footer) {
        const btnV = footer.querySelector('.btn-drawer-vaciar');
        if (btnV) btnV.style.display = 'none';
      }
      return;
    }

    if (footer) {
      const btnV = footer.querySelector('.btn-drawer-vaciar');
      if (btnV) btnV.style.display = 'block';
    }

    const prodsFav = favs.map(item => {
      const id = typeof item === 'object' && item !== null ? item.id : '';
      const nombre = typeof item === 'object' && item !== null ? item.nombre : item;
      const targetNombre = normalizarNombre(nombre || '');

      // Buscar si existe en la base de datos (productosGlobales)
      const match = productosGlobales.find(p => 
        (id && String(p._id) === String(id)) || 
        normalizarNombre(p.nombre) === targetNombre
      );

      if (match) {
        return {
          _id: match._id,
          nombre: match.nombre,
          precio: Number(match.precio) || 0,
          imagen_url: match.imagen_url,
          categoria: match.categoria
        };
      }

      // Si aún no está en productosGlobales, usar datos persistidos con el precio guardado
      return {
        _id: id || ('fav-' + encodeURIComponent(targetNombre)),
        nombre: nombre,
        precio: typeof item === 'object' && item.precio !== undefined ? Number(item.precio) : 0,
        imagen_url: typeof item === 'object' && item.imagen ? item.imagen : 'images/silla.png',
        categoria: typeof item === 'object' && item.categoria ? item.categoria : 'Japandi'
      };
    });

    body.innerHTML = prodsFav.map(prod => {
      const img = obtenerRutaImagen(prod.imagen_url);
      const precio = Number(prod.precio || 0).toFixed(2);
      const catNombre = obtenerNombreCategoria(prod.categoria);

      return `
        <div class="item-favorito-card" data-nombre="${normalizarNombre(prod.nombre)}">
          <img src="${img}" alt="${prod.nombre}" class="img-item-fav" data-id="${prod._id}">
          <div class="info-item-fav">
            <h4 data-id="${prod._id}">${prod.nombre}</h4>
            <span style="font-size:11px; background:#F4F1EA; color:#666; padding:2px 7px; border-radius:10px;">${catNombre}</span>
            <p class="precio-item-fav">$${precio}</p>
          </div>
          <div class="acciones-item-fav">
            <button type="button" class="btn-fav-add-cart" title="Añadir al carrito" data-nombre="${prod.nombre}" data-precio="${prod.precio}" data-imagen="${img}" data-categoria="${catNombre}">
              <i class="bi bi-bag-plus"></i>
            </button>
            <button type="button" class="btn-fav-remove" title="Quitar de favoritos" data-nombre="${normalizarNombre(prod.nombre)}" data-id="${prod._id}">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    body.querySelectorAll('.btn-fav-add-cart').forEach(btn => {
      btn.onclick = async () => {
        const nombre = btn.dataset.nombre;
        const imagen = btn.dataset.imagen;
        const categoria = btn.dataset.categoria;

        // Asegurar que el precio sea idéntico al de la base de datos
        const match = productosGlobales.find(p => normalizarNombre(p.nombre) === normalizarNombre(nombre));
        const precioExacto = match ? Number(match.precio) : (parseFloat(btn.dataset.precio) || 0);

        const agregado = await agregarAlCarrito({
          nombre: match ? match.nombre : nombre,
          categoria: match ? obtenerNombreCategoria(match.categoria) : categoria,
          precio: precioExacto,
          imagen: match ? obtenerRutaImagen(match.imagen_url) : imagen,
          cantidad: 1
        });

        if (agregado) {
          const original = btn.innerHTML;
          btn.innerHTML = '<i class="bi bi-check2"></i>';
          btn.style.background = '#6E8E6C';
          setTimeout(() => {
            btn.innerHTML = original;
            btn.style.background = '';
          }, 1200);
        }
      };
    });

    body.querySelectorAll('.btn-fav-remove').forEach(btn => {
      btn.onclick = () => {
        const nombreQuitar = btn.dataset.nombre;
        const idQuitar = btn.dataset.id;
        alternarFavorito({ _id: idQuitar, nombre: nombreQuitar });
        actualizarBadgeFavoritos();
        renderizarContenidoDrawerFavoritos();

        document.querySelectorAll('.card-producto').forEach(card => {
          const cardNombre = normalizarNombre(card.querySelector('h3')?.textContent || '');
          if (cardNombre === nombreQuitar) {
            const btnFav = card.querySelector('.favorito');
            if (btnFav) aplicarEstadoIcono(btnFav, false);
          }
        });
      };
    });

    body.querySelectorAll('.img-item-fav, .info-item-fav h4').forEach(elem => {
      elem.onclick = () => {
        const id = elem.dataset.id;
        const prod = productosGlobales.find(p => String(p._id) === String(id));
        cerrarDrawerFavoritos();
        if (prod && typeof abrirDetalleProductoSPA === 'function') {
          abrirDetalleProductoSPA(prod);
        } else {
          window.location.href = 'catalogo.html';
        }
      };
    });
  }

  function inicializarBotonesFavoritosNav() {
    document.querySelectorAll('.btn-favoritos-nav').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const usuario = obtenerUsuarioLogueado();
        if (!usuario || !usuario.id) {
          alert('Debes iniciar sesión para ver tus favoritos.');
          window.location.href = 'login.html';
          return;
        }
        abrirDrawerFavoritos();
      };
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') cerrarDrawerFavoritos();
    });
    actualizarBadgeFavoritos();
  }

  asociarEventosFavoritos();
  inicializarBotonesFavoritosNav();

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

  // ==========================================
  // CARGA DE PRODUCTOS DESDE BASE DE DATOS Y SPA
  // ==========================================

  function obtenerRutaImagen(url) {
    if (!url) return 'images/silla.png';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    // Normalizar rutas relativas a la carpeta images/
    let limpia = url.replace(/^(\.\.\/)+Cliente\//, '').replace(/^(\.\/)+/, '').replace(/^\/+/, '');
    if (!limpia.startsWith('images/')) {
      limpia = 'images/' + limpia.replace(/^images\//, '');
    }
    return limpia;
  }

  function obtenerNombreCategoria(cat) {
    if (!cat) return 'Japandi';
    if (typeof cat === 'object') return cat.nombre || 'Japandi';
    return String(cat);
  }

  function crearCardProductoHTML(prod) {
    const catNombre = obtenerNombreCategoria(prod.categoria);
    const img = obtenerRutaImagen(prod.imagen_url);
    const precio = Number(prod.precio || 0).toFixed(2);
    const desc = prod.descripcion || 'Pieza artesanal de diseño Japandi con acabados de alta calidad.';
    const esFav = esFavorito(prod);
    const agotado = prod.stock <= 0 || prod.estado === false;

    return `
      <article class="card-producto" data-id="${prod._id}" style="cursor: pointer;">
        <div class="img-producto">
          <img src="${img}" alt="${prod.nombre}" loading="lazy">
          <button class="favorito ${esFav ? 'activo' : ''}" type="button" title="Favorito">
            <i class="bi ${esFav ? 'bi-heart-fill' : 'bi-heart'}"></i>
          </button>
        </div>

        <div class="contenido-producto">
          <div class="encabezado">
            <span class="marcar-categoria">${catNombre}</span>
            <span class="btn-estrella"><i class="bi bi-star"> 4.9</i></span>
          </div>
          <h3>${prod.nombre}</h3>
          <p>${desc}</p>     
          <div class="footer-producto">
            <strong class="precio-catalogo">$${precio}</strong>
            <button class="btn-agregar-carrito ${agotado ? 'disabled' : ''}" type="button" title="${agotado ? 'Agotado' : 'Añadir al carrito'}" ${agotado ? 'disabled' : ''}>
              <i class="bi ${agotado ? 'bi-x-circle' : 'bi-bag-plus'}"></i>
            </button>
          </div>
        </div>
      </article>
    `;
  }

  function asociarEventosCards(contenedor, listaProductos) {
    if (!contenedor) return;

    // 1. Favoritos
    asociarEventosFavoritos(contenedor, listaProductos);

    // 2. Botón rápido "Agregar al carrito"
    contenedor.querySelectorAll('.btn-agregar-carrito, .btn-aggcarrito').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const card = btn.closest('.card-producto');
        const id = card?.dataset.id;
        const prod = (listaProductos || productosGlobales).find(p => String(p._id) === String(id));

        const nombre = prod ? prod.nombre : card.querySelector('h3').textContent.trim();
        const categoria = prod ? obtenerNombreCategoria(prod.categoria) : card.querySelector('.marcar-categoria')?.textContent.trim() || '';
        const precio = prod ? Number(prod.precio) : parseFloat(card.querySelector('.precio-catalogo')?.textContent.replace(/[^0-9.]+/g, '') || 0);
        const imagen = prod ? obtenerRutaImagen(prod.imagen_url) : card.querySelector('img')?.getAttribute('src') || '';

        const agregado = await agregarAlCarrito({ nombre, categoria, precio, imagen, cantidad: 1 });
        if (!agregado) return;

        if (btn.classList.contains('agregado')) return;
        const iconoOriginal = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-check2"></i>';
        btn.classList.add('agregado');
        setTimeout(() => {
          btn.innerHTML = iconoOriginal;
          btn.classList.remove('agregado');
        }, 1200);
      };
    });

    // 3. Clic en la tarjeta -> SPA: Abre la plantilla estándar del producto
    contenedor.querySelectorAll('.card-producto').forEach(card => {
      card.onclick = (e) => {
        if (e.target.closest('button')) return;
        const id = card.dataset.id;
        const producto = (listaProductos || productosGlobales).find(p => String(p._id) === String(id));
        if (producto) {
          abrirDetalleProductoSPA(producto);
        }
      };
    });
  }

  // ==========================================
  // PLANTILLA ESTÁNDAR DE DETALLE DE PRODUCTO (SPA)
  // ==========================================

  function generarPlantillaEstandarProducto(prod) {
    const catNombre = obtenerNombreCategoria(prod.categoria);
    const img = obtenerRutaImagen(prod.imagen_url);
    const precio = Number(prod.precio || 0).toFixed(2);
    const stock = typeof prod.stock === 'number' ? prod.stock : 10;
    const estado = prod.estado !== false;
    const desc = prod.descripcion || 'Pieza creada con devoción y sencillez bajo la filosofía Japandi, equilibrando madera natural y estética serena.';
    const puntosZen = Math.floor(prod.precio / 10);
    const esFav = esFavorito(prod);
    const enStock = stock > 0 && estado;

    return `
      <section class="detalle-producto-spa">
        <!-- Barra de navegación SPA / Breadcrumb -->
        <div class="detalle-spa-topbar">
          <button class="btn-volver-spa" id="btn-volver-spa" type="button">
            <i class="bi bi-arrow-left"></i> Volver al Catálogo
          </button>
          <nav class="breadcrumb-spa">
            <span>Inicio</span>
            <i class="bi bi-chevron-right"></i>
            <span>${catNombre}</span>
            <i class="bi bi-chevron-right"></i>
            <span class="activo">${prod.nombre}</span>
          </nav>
        </div>

        <!-- Contenedor principal en 2 columnas -->
        <div class="detalle-grid">
          <!-- Columna izquierda: Imagen del producto -->
          <div class="detalle-col-imagen">
            <div class="detalle-imagen-card">
              <img src="${img}" alt="${prod.nombre}" id="detalle-img-principal">
              ${enStock ? '' : '<span class="badge-agotado-flotante">Agotado</span>'}
            </div>
          </div>

          <!-- Columna derecha: Datos del producto (solicitados en creación) -->
          <div class="detalle-col-info">
            <div class="detalle-header-info">
              <span class="marcar-categoria">${catNombre}</span>
              <div class="detalle-calificacion">
                <i class="bi bi-star-fill"></i>
                <i class="bi bi-star-fill"></i>
                <i class="bi bi-star-fill"></i>
                <i class="bi bi-star-fill"></i>
                <i class="bi bi-star-half"></i>
                <span>4.9 (42 reseñas)</span>
              </div>
            </div>

            <h1 class="detalle-titulo">${prod.nombre}</h1>

            <div class="detalle-precio-box">
              <span class="detalle-precio-simbolo">$</span>
              <span class="detalle-precio-valor">${precio}</span>
              <span class="detalle-puntos-zen"><i class="bi bi-stars"></i> +${puntosZen} Puntos Zen</span>
            </div>

            <!-- Disponibilidad / Stock -->
            <div class="detalle-disponibilidad">
              ${enStock ? `
                <span class="badge-stock en-stock">
                  <i class="bi bi-check-circle-fill"></i> En stock (${stock} unidades disponibles)
                </span>
              ` : `
                <span class="badge-stock agotado">
                  <i class="bi bi-x-circle-fill"></i> Agotado temporalmente
                </span>
              `}
            </div>

            <!-- Descripción -->
            <div class="detalle-seccion-desc">
              <h3>Descripción</h3>
              <p>${desc}</p>
            </div>

            <!-- Acciones de compra / Cantidad -->
            <div class="detalle-acciones">
              <div class="selector-cantidad-spa">
                <button type="button" class="btn-cant" id="btn-restar-cant" ${!enStock ? 'disabled' : ''}>-</button>
                <input type="number" id="input-cantidad-spa" value="1" min="1" max="${Math.max(stock, 1)}" ${!enStock ? 'disabled' : ''} readonly>
                <button type="button" class="btn-cant" id="btn-sumar-cant" ${!enStock ? 'disabled' : ''}>+</button>
              </div>

              <button class="btn-spa-agregar-carrito" id="btn-spa-agregar" ${!enStock ? 'disabled' : ''}>
                <i class="bi bi-bag-plus"></i> Añadir al Carrito
              </button>

              <button class="btn-spa-favorito ${esFav ? 'activo' : ''}" id="btn-spa-fav" type="button" title="Favorito">
                <i class="bi ${esFav ? 'bi-heart-fill' : 'bi-heart'}"></i>
              </button>
            </div>

            <!-- Botón sutil para Visualizador 3D -->
            <div class="detalle-accion-visualizador">
              <button type="button" class="btn-spa-visualizador" id="btn-spa-visualizador">
                <i class="bi bi-box"></i> Agregar a Visualizador 3D
              </button>
            </div>

            <!-- Características Japandi ZenSpace -->
            <div class="detalle-caracteristicas-zen">
              <div class="zen-item">
                <i class="bi bi-truck"></i>
                <div>
                  <strong>Envío Seguro & Rastreado</strong>
                  <p>Entrega en 3 a 5 días hábiles a nivel nacional</p>
                </div>
              </div>
              <div class="zen-item">
                <i class="bi bi-shield-check"></i>
                <div>
                  <strong>Garantía ZenSpace de 12 meses</strong>
                  <p>Cobertura ante defectos de fábrica en materiales y estructura</p>
                </div>
              </div>
              <div class="zen-item">
                <i class="bi bi-tree"></i>
                <div>
                  <strong>Materiales Sostenibles Certificados</strong>
                  <p>Maderas con certificación FSC y tejidos 100% orgánicos</p>
                </div>
              </div>
            </div>

            <!-- Ficha técnica estándar -->
            <div class="detalle-ficha-tecnica">
              <h3>Ficha Técnica</h3>
              <div class="tabla-ficha">
                <div class="fila-ficha"><span>Categoría:</span> <strong>${catNombre}</strong></div>
                <div class="fila-ficha"><span>Stock actual:</span> <strong>${stock} unidades</strong></div>
                <div class="fila-ficha"><span>Estado de venta:</span> <strong>${estado ? 'Activo en tienda' : 'Inactivo'}</strong></div>
                <div class="fila-ficha"><span>Estilo de diseño:</span> <strong>Japandi / Wabi-Sabi</strong></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function configurarEventosPlantillaDetalle(producto) {
    const btnVolver = document.getElementById('btn-volver-spa');
    if (btnVolver) {
      btnVolver.onclick = () => cerrarDetalleProductoSPA();
    }

    const inputCant = document.getElementById('input-cantidad-spa');
    const btnRestar = document.getElementById('btn-restar-cant');
    const btnSumar = document.getElementById('btn-sumar-cant');
    const maxStock = typeof producto.stock === 'number' ? producto.stock : 10;

    if (btnRestar && inputCant) {
      btnRestar.onclick = () => {
        let actual = parseInt(inputCant.value, 10) || 1;
        if (actual > 1) inputCant.value = actual - 1;
      };
    }

    if (btnSumar && inputCant) {
      btnSumar.onclick = () => {
        let actual = parseInt(inputCant.value, 10) || 1;
        if (actual < maxStock) inputCant.value = actual + 1;
      };
    }

    const btnAgregar = document.getElementById('btn-spa-agregar');
    if (btnAgregar) {
      btnAgregar.onclick = async () => {
        const cantidad = parseInt(inputCant?.value, 10) || 1;
        const catNombre = obtenerNombreCategoria(producto.categoria);
        const img = obtenerRutaImagen(producto.imagen_url);

        const ok = await agregarAlCarrito({
          nombre: producto.nombre,
          categoria: catNombre,
          precio: producto.precio,
          imagen: img,
          cantidad: cantidad
        });

        if (ok) {
          const originalHTML = btnAgregar.innerHTML;
          btnAgregar.innerHTML = '<i class="bi bi-check2"></i> ¡Añadido al Carrito!';
          btnAgregar.style.background = '#6D8A6B';
          setTimeout(() => {
            btnAgregar.innerHTML = originalHTML;
            btnAgregar.style.background = '';
          }, 1500);
        }
      };
    }

    const btnFav = document.getElementById('btn-spa-fav');
    if (btnFav) {
      aplicarEstadoIcono(btnFav, esFavorito(producto));
      btnFav.onclick = () => {
        const usuario = obtenerUsuarioLogueado();
        if (!usuario || !usuario.id) {
          alert('Debes iniciar sesión para guardar productos en tus favoritos.');
          window.location.href = 'login.html';
          return;
        }

        const nuevoEstado = alternarFavorito(producto);
        aplicarEstadoIcono(btnFav, nuevoEstado);
        actualizarBadgeFavoritos();
      };
    }

    const btnVisualizador = document.getElementById('btn-spa-visualizador');
    if (btnVisualizador) {
      btnVisualizador.onclick = () => {
        const usuario = obtenerUsuarioLogueado();
        if (!usuario || !usuario.id) {
          alert('Debes iniciar sesión para agregar productos a tu Visualizador 3D.');
          window.location.href = 'login.html';
          return;
        }

        const catNombre = obtenerNombreCategoria(producto.categoria);
        const img = obtenerRutaImagen(producto.imagen_url);
        let items = obtenerVisualizadorUsuario();

        const yaExiste = items.find(it => it.nombre.toLowerCase() === producto.nombre.toLowerCase());
        if (yaExiste) {
          btnVisualizador.classList.add('agregado');
          btnVisualizador.innerHTML = '<i class="bi bi-check2"></i> Ya está en tu Visualizador 3D';
          setTimeout(() => {
            btnVisualizador.innerHTML = '<i class="bi bi-box"></i> Agregar a Visualizador 3D';
            btnVisualizador.classList.remove('agregado');
          }, 2000);
          return;
        }

        items.push({
          id: producto._id || producto.id || Date.now().toString(),
          nombre: producto.nombre,
          precio: Number(producto.precio) || 0,
          imagen: img,
          categoria: catNombre,
          cantidad: 1
        });

        guardarVisualizadorUsuario(items);

        btnVisualizador.classList.add('agregado');
        btnVisualizador.innerHTML = '<i class="bi bi-check2"></i> ¡Agregado a Visualizador 3D!';
        setTimeout(() => {
          btnVisualizador.innerHTML = '<i class="bi bi-box"></i> Agregar a Visualizador 3D';
          btnVisualizador.classList.remove('agregado');
        }, 2000);
      };
    }
  }

  function abrirDetalleProductoSPA(producto) {
    const appContenido = document.getElementById('app-contenido') || document.querySelector('main');
    if (!appContenido || !producto) return;

    if (vistaOriginalHTML === null) {
      vistaOriginalHTML = appContenido.innerHTML;
    }

    // Se elimina todo el HTML previo (concepto Single Page Application)
    appContenido.innerHTML = '';

    // Se renderiza la plantilla estándar con los datos del producto
    appContenido.innerHTML = generarPlantillaEstandarProducto(producto);

    // Actualiza URL hash para permitir volver con el botón del navegador
    if (window.location.hash !== `#producto=${producto._id}`) {
      window.location.hash = `producto=${producto._id}`;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    configurarEventosPlantillaDetalle(producto);
  }

  function cerrarDetalleProductoSPA() {
    const appContenido = document.getElementById('app-contenido') || document.querySelector('main');
    if (!appContenido || vistaOriginalHTML === null) return;

    // Restaura la vista original
    appContenido.innerHTML = vistaOriginalHTML;
    vistaOriginalHTML = null;

    // Limpia el hash
    if (window.location.hash.includes('producto=')) {
      history.pushState('', document.title, window.location.pathname + window.location.search);
    }

    // Reasocia eventos en la vista restaurada
    const gridDestacados = document.getElementById('grid-productos-destacados');
    const gridCatalogo = document.getElementById('grid-productos-catalogo');

    if (gridDestacados) {
      asociarEventosCards(gridDestacados, productosGlobales);
    }
    if (gridCatalogo) {
      asociarEventosCards(gridCatalogo, productosGlobales);
      inicializarFiltrosCatalogo(productosGlobales);
    }
  }

  // Escuchar cambios de hash en la ventana (navegación atrás / adelante SPA)
  window.addEventListener('hashchange', () => {
    const matchProd = window.location.hash.match(/^#producto=(.+)$/);
    const matchSeg = window.location.hash.match(/^#seguimiento=(.+)$/);

    if (matchProd) {
      const prodId = matchProd[1];
      const prod = productosGlobales.find(p => String(p._id) === String(prodId));
      if (prod) abrirDetalleProductoSPA(prod);
    } else if (matchSeg) {
      const idSeg = matchSeg[1];
      const ped = (typeof pedidosUsuarioActual !== 'undefined' ? pedidosUsuarioActual.find(p => String(p._id) === String(idSeg)) : null) || (typeof pedidoDemoSeguimiento !== 'undefined' ? pedidoDemoSeguimiento : null);
      if (ped && typeof abrirVisualizadorSeguimientoSPA === 'function') {
        abrirVisualizadorSeguimientoSPA(ped);
      }
    } else if (vistaOriginalHTML !== null) {
      if (document.getElementById('btn-volver-perfil') && typeof cerrarVisualizadorSeguimientoSPA === 'function') {
        cerrarVisualizadorSeguimientoSPA();
      } else {
        cerrarDetalleProductoSPA();
      }
    }
  });

  // Si se pulsa Inicio, Catálogo o Perfil en el menú mientras estamos en una vista SPA
  document.querySelectorAll('.logo a, .menu a, .menu_1 a').forEach(enlace => {
    enlace.addEventListener('click', (e) => {
      if (vistaOriginalHTML !== null) {
        const href = enlace.getAttribute('href');
        const paginaActual = window.location.pathname.split('/').pop() || 'index.html';
        if (href === paginaActual || (href === 'index.html' && (paginaActual === '' || paginaActual === '/'))) {
          e.preventDefault();
          if (document.getElementById('btn-volver-perfil') && typeof cerrarVisualizadorSeguimientoSPA === 'function') {
            cerrarVisualizadorSeguimientoSPA();
          } else {
            cerrarDetalleProductoSPA();
          }
        }
      }
    });
  });

  // ==========================================
  // FILTRADO DINÁMICO EN CATÁLOGO
  // ==========================================

  function inicializarFiltrosCatalogo(productos) {
    const chips = document.querySelectorAll('#filtros-categorias .chip');
    const buscador = document.getElementById('buscador-catalogo') || document.querySelector('.busqueda input');
    const grid = document.getElementById('grid-productos-catalogo');
    if (!grid) return;

    const normalizar = (texto) =>
      texto.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const filtrar = () => {
      const chipActivo = document.querySelector('#filtros-categorias .chip.activo');
      const categoriaFiltro = chipActivo ? normalizar(chipActivo.textContent) : 'todos';
      const terminoBusqueda = buscador ? normalizar(buscador.value) : '';

      const filtrados = productos.filter(prod => {
        const catProd = normalizar(obtenerNombreCategoria(prod.categoria));
        const nombreProd = normalizar(prod.nombre || '');
        const descProd = normalizar(prod.descripcion || '');

        const coincideCategoria = categoriaFiltro === 'todos' || catProd === categoriaFiltro;
        const coincideBusqueda = !terminoBusqueda || nombreProd.includes(terminoBusqueda) || descProd.includes(terminoBusqueda);

        return coincideCategoria && coincideBusqueda;
      });

      if (filtrados.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #777;">
            <i class="bi bi-search" style="font-size: 32px; display: block; margin-bottom: 12px; color: #C5BAA8;"></i>
            <h3>No encontramos piezas para esta búsqueda</h3>
            <p style="margin-top: 6px;">Prueba seleccionando otra categoría o palabra clave.</p>
          </div>
        `;
      } else {
        grid.innerHTML = filtrados.map(crearCardProductoHTML).join('');
        asociarEventosCards(grid, filtrados);
      }
    };

    chips.forEach(chip => {
      chip.onclick = () => {
        chips.forEach(c => c.classList.remove('activo'));
        chip.classList.add('activo');
        filtrar();
      };
    });

    if (buscador) {
      buscador.oninput = filtrar;
    }
  }

  // ==========================================
  // CARGA PRINCIPAL DESDE API
  // ==========================================

  async function cargarYRenderearProductos() {
    const gridDestacados = document.getElementById('grid-productos-destacados');
    const gridCatalogo = document.getElementById('grid-productos-catalogo');
    const gridFavoritos = document.getElementById('grid-productos-favoritos');

    if (!gridDestacados && !gridCatalogo && !gridFavoritos) return;

    try {
      const res = await fetch(`${API_URL}/productos`);
      if (!res.ok) throw new Error('Error al consultar /api/productos');
      productosGlobales = await res.json();
    } catch (err) {
      console.warn('No se pudo conectar a la API de MongoDB, usando respaldo local:', err.message);
      // Respaldo preventivo por si el servidor no está encendido en ese momento
      productosGlobales = [
        { _id: '1', nombre: 'Silla Ergonómica Japandi', categoria: { nombre: 'Sala' }, precio: 199.99, stock: 15, imagen_url: 'images/silla.png', descripcion: 'Silla ergonómica diseñada con líneas limpias de madera clara y tapizado en lino natural.' },
        { _id: '2', nombre: 'Mesa de Comedor Zen', categoria: { nombre: 'Comedor' }, precio: 299.99, stock: 8, imagen_url: 'images/comedor.png', descripcion: 'Mesa de comedor amplia de roble macizo con acabado al aceite natural.' },
        { _id: '3', nombre: 'Adornos Decorativos Modernos', categoria: { nombre: 'Decoración' }, precio: 79.99, stock: 25, imagen_url: 'images/adornos.png', descripcion: 'Set de jarrones de cerámica texturizada y formas orgánicas artesanales.' },
        { _id: '4', nombre: 'Organizador de Baño Wabi', categoria: { nombre: 'Decoración' }, precio: 149.99, stock: 12, imagen_url: 'images/aseo.png', descripcion: 'Organizador en bambú y resina mate resistente al agua.' },
        { _id: '5', nombre: 'Lámpara de Pie Akari', categoria: { nombre: 'Iluminación' }, precio: 89.99, stock: 18, imagen_url: 'images/lampara.png', descripcion: 'Lámpara de pie de papel washi y estructura de bambú oscuro.' },
        { _id: '6', nombre: 'Horno Microondas Minimalista', categoria: { nombre: 'Comedor' }, precio: 219.99, stock: 10, imagen_url: 'images/microondas.png', descripcion: 'Diseño compacto en acabado mate con panel táctil oculto.' },
        { _id: '7', nombre: 'Mesa de Noche Nórdica', categoria: { nombre: 'Dormitorio' }, precio: 149.99, stock: 14, imagen_url: 'images/mesa_noche.png', descripcion: 'Mesa de noche funcional con cajón silencioso y repisa inferior.' }
      ];
    }

    if (gridDestacados) {
      gridDestacados.innerHTML = productosGlobales.map(crearCardProductoHTML).join('');
      asociarEventosCards(gridDestacados, productosGlobales);
    }

    if (gridCatalogo) {
      gridCatalogo.innerHTML = productosGlobales.map(crearCardProductoHTML).join('');
      asociarEventosCards(gridCatalogo, productosGlobales);
      inicializarFiltrosCatalogo(productosGlobales);
    }

    if (gridFavoritos) {
      const usuario = obtenerUsuarioLogueado();
      if (!usuario || !usuario.id) {
        gridFavoritos.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #777;">
            <i class="bi bi-person-lock" style="font-size: 38px; color: #C5BAA8; display: block; margin-bottom: 12px;"></i>
            <h3>Inicia sesión para ver tus favoritos</h3>
            <p style="margin-top: 6px;">Guarda tus piezas favoritas de diseño Japandi en tu cuenta personal.</p>
            <a href="login.html" class="btn-ir-catalogo-zen" style="margin-top: 15px;">Iniciar Sesión</a>
          </div>
        `;
        return;
      }

      const favs = obtenerFavoritos();
      const prodsFav = favs.map(item => {
        const id = typeof item === 'object' && item !== null ? item.id : '';
        const nombre = typeof item === 'object' && item !== null ? item.nombre : item;
        const targetNombre = normalizarNombre(nombre || '');

        const match = productosGlobales.find(p => 
          (id && String(p._id) === String(id)) || 
          normalizarNombre(p.nombre) === targetNombre
        );

        if (match) return match;

        return {
          _id: id || ('fav-' + encodeURIComponent(targetNombre)),
          nombre: nombre,
          precio: typeof item === 'object' && item.precio !== undefined ? Number(item.precio) : 0,
          stock: 10,
          estado: true,
          imagen_url: typeof item === 'object' && item.imagen ? item.imagen : 'images/silla.png',
          categoria: typeof item === 'object' && item.categoria ? item.categoria : 'Japandi',
          descripcion: 'Pieza artesanal Japandi guardada en tus favoritos.'
        };
      }).filter(Boolean);

      if (prodsFav.length === 0) {
        gridFavoritos.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #777;">
            <i class="bi bi-heart" style="font-size: 38px; color: #C5BAA8; display: block; margin-bottom: 12px;"></i>
            <h3>No tienes favoritos guardados aún</h3>
            <p style="margin-top: 6px;">Explora el catálogo y toca el corazón en tus piezas favoritas.</p>
            <a href="catalogo.html" class="btn-ir-catalogo-zen" style="margin-top: 15px;">Explorar Catálogo</a>
          </div>
        `;
      } else {
        gridFavoritos.innerHTML = prodsFav.map(crearCardProductoHTML).join('');
        asociarEventosCards(gridFavoritos, prodsFav);
      }
    }

    // Si la URL ya trae un hash de producto al cargar
    const match = window.location.hash.match(/^#producto=(.+)$/);
    if (match) {
      const prod = productosGlobales.find(p => String(p._id) === String(match[1]));
      if (prod) {
        abrirDetalleProductoSPA(prod);
      }
    }
  }

  cargarYRenderearProductos();



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
  // VISUALIZADOR 3D DINÁMICO (visualizador.html)
  // ==========================================
  const seccionVisualizador = document.querySelector('.visualizador');
  const contenedorLista3D = document.getElementById('lista-productos-3d');
  const subtituloPiezas3D = document.getElementById('subtitulo-piezas-3d');
  const totalLook3D = document.getElementById('total-look-3d');
  const btnComprarLook = document.getElementById('btn-comprar-look');
  const lienzo3DEscena = document.getElementById('lienzo-3d-escena');

  if (seccionVisualizador && contenedorLista3D && lienzo3DEscena) {
    let itemActivoIndex = 0;

    function renderizarVisualizador3D() {
      const usuario = obtenerUsuarioLogueado();

      if (!usuario || !usuario.id) {
        if (subtituloPiezas3D) subtituloPiezas3D.textContent = 'Inicia sesión para ver tu look';
        if (totalLook3D) totalLook3D.textContent = '$0.00';
        if (btnComprarLook) {
          btnComprarLook.disabled = true;
          btnComprarLook.style.opacity = '0.6';
          btnComprarLook.style.cursor = 'not-allowed';
        }

        contenedorLista3D.innerHTML = `
          <div class="visualizador-vacio">
            <i class="bi bi-person-lock"></i>
            <h4>Inicia Sesión</h4>
            <p>Debes iniciar sesión para guardar y armar tus looks 3D personalizados.</p>
            <a href="login.html" class="btn-ir-catalogo-visualizador">
              <i class="bi bi-box-arrow-in-right"></i> Iniciar Sesión
            </a>
          </div>
        `;

        lienzo3DEscena.innerHTML = `
          <div class="visualizacion">
            <i class="bi bi-box"></i>
            <h3>Visualizador 3D Personalizado</h3>
            <p>Inicia sesión y agrega piezas desde el catálogo o desde el detalle de cada producto para componer tu look.</p>
          </div>
        `;
        return;
      }

      const items = obtenerVisualizadorUsuario();

      if (items.length === 0) {
        if (subtituloPiezas3D) subtituloPiezas3D.textContent = '0 piezas en este look';
        if (totalLook3D) totalLook3D.textContent = '$0.00';
        if (btnComprarLook) {
          btnComprarLook.disabled = true;
          btnComprarLook.style.opacity = '0.6';
          btnComprarLook.style.cursor = 'not-allowed';
        }

        contenedorLista3D.innerHTML = `
          <div class="visualizador-vacio">
            <i class="bi bi-box-seam"></i>
            <h4>Tu look está vacío</h4>
            <p>Aún no has agregado productos a tu Visualizador 3D.</p>
            <a href="catalogo.html" class="btn-ir-catalogo-visualizador">
              <i class="bi bi-grid"></i> Explorar Catálogo
            </a>
          </div>
        `;

        lienzo3DEscena.innerHTML = `
          <div class="visualizacion">
            <i class="bi bi-box"></i>
            <h3>Espacio en blanco</h3>
            <p>Entra a cualquier producto en el catálogo y haz clic en "Agregar a Visualizador 3D" para componer tu ambiente personalizado.</p>
          </div>
        `;
        return;
      }

      // Habilitar botón de compra y calcular total dinámico
      if (btnComprarLook) {
        btnComprarLook.disabled = false;
        btnComprarLook.style.opacity = '1';
        btnComprarLook.style.cursor = 'pointer';
      }

      const total = items.reduce((acc, it) => acc + (Number(it.precio || 0) * (it.cantidad || 1)), 0);
      if (totalLook3D) totalLook3D.textContent = `$${total.toFixed(2)}`;
      if (subtituloPiezas3D) {
        subtituloPiezas3D.textContent = `${items.length} ${items.length === 1 ? 'pieza en este look' : 'piezas en este look'}`;
      }

      // Asegurar que el índice activo esté dentro del rango
      if (itemActivoIndex >= items.length) {
        itemActivoIndex = items.length - 1;
      }
      if (itemActivoIndex < 0) {
        itemActivoIndex = 0;
      }

      // Renderizar lista en aside
      contenedorLista3D.innerHTML = items.map((item, index) => `
        <div class="item-3d ${index === itemActivoIndex ? 'activo' : ''}" data-index="${index}">
          <img src="${item.imagen}" alt="${item.nombre}">
          <div class="item-info">
            <h3>${item.nombre}</h3>
            <span>$${Number(item.precio || 0).toFixed(2)}</span>
          </div>
          <button type="button" class="btn-eliminar-item-3d" data-index="${index}" title="Quitar del look">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      `).join('');

      // Renderizar lienzo 3D con el producto activo
      const activo = items[itemActivoIndex];
      lienzo3DEscena.innerHTML = `
        <div class="escena-3d-activa">
          <div class="controles-3d-flotantes">
            <span class="badge-3d-live"><i class="bi bi-view-in-ar"></i> En exhibición 3D</span>
          </div>
          <div class="escena-3d-podio">
            <img src="${activo.imagen}" alt="${activo.nombre}" class="img-producto-3d">
            <div class="sombra-piso-3d"></div>
          </div>
          <div class="escena-3d-info">
            <span class="categoria-tag-3d">${activo.categoria || 'Colección Zen'}</span>
            <h3>${activo.nombre}</h3>
            <p class="precio-3d">$${Number(activo.precio || 0).toFixed(2)}</p>
          </div>
        </div>
      `;

      // Eventos para seleccionar producto activo
      const elementosItems = contenedorLista3D.querySelectorAll('.item-3d');
      elementosItems.forEach(elem => {
        elem.addEventListener('click', (e) => {
          if (e.target.closest('.btn-eliminar-item-3d')) return;
          const idx = parseInt(elem.dataset.index, 10);
          if (!isNaN(idx)) {
            itemActivoIndex = idx;
            renderizarVisualizador3D();
          }
        });
      });

      // Eventos para eliminar producto del look
      const botonesEliminar = contenedorLista3D.querySelectorAll('.btn-eliminar-item-3d');
      botonesEliminar.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.index, 10);
          if (!isNaN(idx)) {
            let actualizados = obtenerVisualizadorUsuario();
            actualizados.splice(idx, 1);
            guardarVisualizadorUsuario(actualizados);
            if (itemActivoIndex >= actualizados.length) {
              itemActivoIndex = Math.max(0, actualizados.length - 1);
            }
            renderizarVisualizador3D();
          }
        });
      });
    }

    // Inicializar visualizador
    renderizarVisualizador3D();

    // Evento Comprar este look
    if (btnComprarLook) {
      btnComprarLook.addEventListener('click', async () => {
        const usuario = obtenerUsuarioLogueado();
        if (!usuario || !usuario.id) {
          alert('Debes iniciar sesión para comprar este look.');
          window.location.href = 'login.html';
          return;
        }

        const items = obtenerVisualizadorUsuario();
        if (items.length === 0) {
          alert('Agrega al menos un producto a tu look para comprarlo.');
          return;
        }

        const originalText = btnComprarLook.innerHTML;
        btnComprarLook.disabled = true;
        btnComprarLook.innerHTML = '<i class="bi bi-hourglass-split"></i> Añadiendo look al carrito...';

        try {
          for (const item of items) {
            await agregarAlCarrito({
              nombre: item.nombre,
              categoria: item.categoria || 'Colección Zen',
              precio: item.precio,
              imagen: item.imagen,
              cantidad: item.cantidad || 1
            });
          }

          btnComprarLook.innerHTML = '<i class="bi bi-check2"></i> ¡Look añadido al carrito!';
          btnComprarLook.style.background = '#6D8A6B';

          setTimeout(() => {
            window.location.href = 'carrito.html';
          }, 800);
        } catch (err) {
          console.error('Error al agregar el look al carrito:', err);
          alert('Hubo un problema al agregar algunas piezas del look al carrito.');
          btnComprarLook.disabled = false;
          btnComprarLook.innerHTML = originalText;
        }
      });
    }
  }

  // ==========================================
  // 1. LÓGICA DE REGISTRO (SPA)
  // ==========================================
  const radiosTipo = document.querySelectorAll('input[name="tipo_cuenta"]');
  if (radiosTipo.length > 0) {
    radiosTipo.forEach(radio => {
      radio.addEventListener('change', () => {
        document.querySelectorAll('.opcion-tipo-cuenta').forEach(op => op.classList.remove('activa'));
        const wrapper = radio.closest('.opcion-tipo-cuenta');
        if (wrapper) wrapper.classList.add('activa');
      });
    });
  }

  const formRegistro = document.getElementById('form-registro');
  if (formRegistro) {
    formRegistro.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const nombre = document.getElementById('nombre')?.value.trim();
      const correo = document.getElementById('correo')?.value.trim();
      const password = document.getElementById('password')?.value;
      const confirmInput = document.getElementById('confirmar-password') || document.getElementById('confirm-password');
      const confirmPassword = confirmInput?.value;
      const tipoRadio = document.querySelector('input[name="tipo_cuenta"]:checked');
      const rol = tipoRadio ? tipoRadio.value : 'cliente';

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
          body: JSON.stringify({ nombre, correo, password, rol })
        });
        const data = await respuesta.json();
        
        if (respuesta.ok) {
          const esTienda = rol === 'tienda';
          // Reemplazar la pantalla del formulario por una alerta SPA de éxito
          const contenedorAuth = document.querySelector('.auth-form');
          if (contenedorAuth) {
            contenedorAuth.innerHTML = `
              <div style="text-align: center; padding: 40px 20px; animation: fadeIn 0.4s ease;">
                <div style="width: 76px; height: 76px; background: #EAF2EB; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                  <i class="bi ${esTienda ? 'bi-shop' : 'bi-check2-circle'}" style="font-size: 42px; color: #8BA889;"></i>
                </div>
                <h2 style="font-size: 24px; margin-bottom: 12px; color: #111;">
                  ${esTienda ? '¡Cuenta de Tienda Creada!' : '¡Cuenta Creada Exitosamente!'}
                </h2>
                <p style="color: #666; font-size: 15px; margin-bottom: 30px; line-height: 1.5;">
                  ${esTienda 
                    ? `Se creó con éxito la cuenta de tienda para <strong>${nombre}</strong>. Al iniciar sesión podrás acceder a tu panel de control y dashboard para gestionar tu catálogo y pedidos.` 
                    : `Se creó de manera exitosa la cuenta para <strong>${nombre}</strong>. Haz clic en aceptar para iniciar sesión.`}
                </p>
                <button id="btn-aceptar-registro" class="btn-principal" style="width: 100%; max-width: 250px; margin: 0 auto; justify-content: center; display: inline-flex; align-items: center; gap: 8px; cursor: pointer;">
                  Aceptar e Iniciar Sesión
                  <i class="bi bi-arrow-right"></i>
                </button>
              </div>
            `;

            document.getElementById('btn-aceptar-registro').addEventListener('click', () => {
              window.location.href = 'login.html';
            });
          } else {
            alert(esTienda ? '¡Cuenta de tienda creada con éxito!' : '¡Se creó de manera exitosa la cuenta!');
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
    const usuarioLogueado = obtenerUsuarioLogueado();
    if (usuarioLogueado) {
      if (usuarioLogueado.rol === 'tienda') {
        const urlDash = window.location.protocol.startsWith('http') ? '/admin/dashboard.html' : '../admin/dashboard.html';
        window.location.href = urlDash;
      } else {
        window.location.href = 'perfil.html';
      }
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

          // Migrar favoritos legacy si existen
          const legacyFavs = localStorage.getItem('zenspace-favoritos');
          if (legacyFavs && !localStorage.getItem(`zenspace_favoritos_${data.usuario.id}`)) {
            try {
              localStorage.setItem(`zenspace_favoritos_${data.usuario.id}`, legacyFavs);
              localStorage.removeItem('zenspace-favoritos');
            } catch (e) {}
          }
          
          actualizarHeaderUsuario();

          // Si el usuario es de tipo tienda, redirigir directamente al inicio del dashboard
          if (data.usuario && data.usuario.rol === 'tienda') {
            const urlDashboard = window.location.protocol.startsWith('http') ? '/admin/dashboard.html' : '../admin/dashboard.html';
            window.location.href = urlDashboard;
          } else {
            window.location.href = 'perfil.html';
          }
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
  // 3. LÓGICA DE PERFIL E HISTORIAL DE PEDIDOS (perfil.html)
  // ==========================================
  const seccionPerfil = document.querySelector('.perfil');
  let pedidosUsuarioActual = [];

  const pedidoDemoSeguimiento = {
    _id: 'ZEN-DEMO-2026',
    createdAt: new Date().toISOString(),
    total: 289.98,
    pago: { metodo: 'Tarjeta / ePayco' },
    envio: {
      estado: 'En camino',
      numero_guia: 'GUIA-ZEN-784920',
      direccion: 'Carrera 7 # 120-45, Apto 502, Bogotá'
    },
    items: [
      { producto: 'Silla Ergonómica Japandi', cantidad: 1, precio_unitario: 199.99 },
      { producto: 'Lámpara de Pie Akari', cantidad: 1, precio_unitario: 89.99 }
    ]
  };

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

      // Si es cuenta tienda, mostrar banner con acceso directo al dashboard
      if (usuario.rol === 'tienda') {
        const wrapDatos = seccionPerfil.querySelector('.datos-usuario');
        if (wrapDatos && !document.getElementById('banner-tienda-perfil')) {
          const urlDash = window.location.protocol.startsWith('http') ? '/admin/dashboard.html' : '../admin/dashboard.html';
          const banner = document.createElement('div');
          banner.id = 'banner-tienda-perfil';
          banner.className = 'banner-cuenta-tienda';
          banner.innerHTML = `
            <span><i class="bi bi-shop" style="font-size:20px; color:#6E8E6C;"></i> Cuenta de Tienda ZenSpace Activa</span>
            <a href="${urlDash}" class="btn-ir-dashboard-perfil">
              <i class="bi bi-speedometer2"></i> Ir al Dashboard
            </a>
          `;
          wrapDatos.parentNode.insertBefore(banner, wrapDatos);
        }
      }

      // Cargar foto de perfil si ya existe guardada
      const avatarDisplay = document.getElementById('avatar-zen-display');
      if (avatarDisplay && usuario.avatar) {
        avatarDisplay.innerHTML = `<img src="${usuario.avatar}" alt="${usuario.nombre || 'Usuario'}" class="img-avatar-zen">`;
      }

      // Configuración de la carga interactiva de foto de perfil
      const wrapperAvatar = document.getElementById('avatar-zen-wrapper');
      const inputFoto = document.getElementById('input-foto-perfil');
      const btnCambiarFoto = document.getElementById('btn-cambiar-foto');

      const triggerUpload = () => inputFoto && inputFoto.click();
      if (wrapperAvatar) {
        wrapperAvatar.onclick = (e) => {
          if (e.target !== inputFoto) triggerUpload();
        };
      }
      if (btnCambiarFoto) {
        btnCambiarFoto.onclick = (e) => {
          e.stopPropagation();
          triggerUpload();
        };
      }

      if (inputFoto) {
        inputFoto.onchange = (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona una imagen válida (JPG, PNG, WebP).');
            return;
          }

          const reader = new FileReader();
          reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
              // Optimizar a máximo 260x260 para almacenamiento eficiente
              const canvas = document.createElement('canvas');
              const maxDim = 260;
              let width = img.width;
              let height = img.height;
              if (width > height) {
                if (width > maxDim) {
                  height = Math.round((height * maxDim) / width);
                  width = maxDim;
                }
              } else {
                if (height > maxDim) {
                  width = Math.round((width * maxDim) / height);
                  height = maxDim;
                }
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

              // Actualizar en pantalla
              if (avatarDisplay) {
                avatarDisplay.innerHTML = `<img src="${dataUrl}" alt="Avatar" class="img-avatar-zen">`;
              }

              // Guardar en sesión
              usuario.avatar = dataUrl;
              localStorage.setItem('zenspace-usuario', JSON.stringify(usuario));

              // Sincronizar con backend si hay id
              if (usuario._id || usuario.id) {
                fetch(`${API_URL}/usuarios/${usuario._id || usuario.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ avatar: dataUrl })
                }).catch(err => console.warn('Error al guardar foto en base de datos:', err));
              }

              alert('¡Foto de perfil actualizada con éxito!');
            };
            img.src = ev.target.result;
          };
          reader.readAsDataURL(file);
        };
      }

      // Cargar historial de pedidos desde MongoDB
      cargarHistorialPedidosUsuario(usuario);
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

  async function cargarHistorialPedidosUsuario(usuario) {
    const contenedor = document.getElementById('contenedor-pedidos-lista');
    const contadorElem = document.getElementById('contador-pedidos');
    if (!contenedor) return;

    try {
      const userId = usuario._id || usuario.id;
      const res = await fetch(`${API_URL}/pedidos/usuario/${userId}`);
      if (!res.ok) throw new Error('Error al consultar pedidos');
      pedidosUsuarioActual = await res.json();
      renderizarHistorialPedidos(pedidosUsuarioActual, contenedor, contadorElem);
    } catch (err) {
      console.warn('Error al obtener pedidos de MongoDB:', err.message);
      pedidosUsuarioActual = [];
      renderizarHistorialPedidos([], contenedor, contadorElem);
    }
  }

  function renderizarHistorialPedidos(pedidos, contenedor, contadorElem) {
    if (!contenedor) return;

    if (contadorElem) {
      contadorElem.textContent = pedidos && pedidos.length > 0
        ? `${pedidos.length} pedido${pedidos.length > 1 ? 's' : ''}`
        : '0 pedidos';
    }

    if (!pedidos || pedidos.length === 0) {
      // Estado vacío amigable y estético cuando el usuario no tiene compras aún
      contenedor.innerHTML = `
        <div class="pedidos-vacio-zen">
          <div class="icono-vacio-box">
            <i class="bi bi-box-seam"></i>
          </div>
          <h3>No hay pedidos por mostrar</h3>
          <p>Aún no has realizado ninguna compra en ZenSpace. Explora nuestro catálogo y dale armonía a tu hogar con la serenidad del diseño Japandi.</p>
          <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap; align-items:center;">
            <a href="catalogo.html" class="btn-ir-catalogo-zen">
              <i class="bi bi-compass"></i> Explorar Catálogo
            </a>
          </div>
        </div>
      `;

      const btnDemo = document.getElementById('btn-ver-demo-seguimiento');
      if (btnDemo) {
        btnDemo.onclick = () => abrirVisualizadorSeguimientoSPA(pedidoDemoSeguimiento);
      }
      return;
    }

    // Renderizar tarjetas estéticas de pedidos reales
    contenedor.innerHTML = pedidos.map(ped => {
      const fecha = ped.createdAt
        ? new Date(ped.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Reciente';

      const codigoCorto = ped._id
        ? `#ORD-${ped._id.slice(-6).toUpperCase()}`
        : '#ORD-ZEN';

      const estadoEnvio = ped.envio?.estado || 'En camino';
      let claseEstado = 'camino';
      let iconoEstado = 'bi-truck';

      const estMinus = estadoEnvio.toLowerCase();
      if (estMinus.includes('entregad')) {
        claseEstado = 'entregado';
        iconoEstado = 'bi-check-circle-fill';
      } else if (estMinus.includes('pendient') || estMinus.includes('prepar')) {
        claseEstado = 'pendiente';
        iconoEstado = 'bi-hourglass-split';
      }

      const totalNum = Number(ped.total || 0).toFixed(2);
      const itemsTexto = (ped.items && ped.items.length > 0)
        ? ped.items.map(it => `${it.cantidad}x ${it.producto}`).join(' · ')
        : 'Piezas ZenSpace';

      const metodoPago = ped.pago?.metodo || 'ePayco';

      return `
        <article class="pedido-card-zen" data-id="${ped._id}">
          <div class="pedido-header">
            <div class="pedido-info-principal">
              <div class="icono-pedido-zen">
                <i class="bi bi-box-seam"></i>
              </div>
              <div>
                <div class="pedido-codigo-box">
                  <h3 class="pedido-id">${codigoCorto}</h3>
                  <span class="pedido-fecha"><i class="bi bi-calendar3"></i> ${fecha}</span>
                </div>
                <p class="pedido-articulos-resumen">${itemsTexto}</p>
              </div>
            </div>

            <div class="pedido-estado-box">
              <span class="estado-badge ${claseEstado}">
                <i class="bi ${iconoEstado}"></i> ${estadoEnvio}
              </span>
            </div>
          </div>

          <div class="pedido-footer">
            <div class="pedido-total-info">
              <span class="label-total">Total abonado:</span>
              <strong class="monto-total">$${totalNum}</strong>
              <span class="metodo-badge"><i class="bi bi-credit-card"></i> ${metodoPago}</span>
            </div>

            <button class="btn-seguimiento-spa" type="button" data-id="${ped._id}">
              <i class="bi bi-truck"></i> Hacer Seguimiento
            </button>
          </div>
        </article>
      `;
    }).join('');

    // Eventos para el botón de seguimiento SPA
    contenedor.querySelectorAll('.btn-seguimiento-spa').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const pedido = pedidos.find(p => String(p._id) === String(id)) || pedidoDemoSeguimiento;
        abrirVisualizadorSeguimientoSPA(pedido);
      };
    });
  }

  // ==========================================
  // VISUALIZADOR DE SEGUIMIENTO EN CAMINO (SPA)
  // ==========================================

  function generarPlantillaSeguimientoPedido(ped) {
    const codigoCorto = ped._id
      ? `#ORD-${ped._id.slice(-6).toUpperCase()}`
      : '#ORD-ZEN2026';

    const guia = ped.envio?.numero_guia || ('GUIA-ZEN-' + (ped._id ? ped._id.slice(-6).toUpperCase() : '847291'));
    const direccion = ped.envio?.direccion || 'Carrera 7 # 120-45, Bogotá';
    const totalNum = Number(ped.total || 0).toFixed(2);
    const items = ped.items || [
      { producto: 'Silla Ergonómica Japandi', cantidad: 1, precio_unitario: 199.99 },
      { producto: 'Lámpara de Pie Akari', cantidad: 1, precio_unitario: 89.99 }
    ];

    return `
      <section class="visualizador-seguimiento-spa">
        <!-- Barra de navegación SPA / Breadcrumb -->
        <div class="detalle-spa-topbar">
          <button class="btn-volver-spa" id="btn-volver-perfil" type="button">
            <i class="bi bi-arrow-left"></i> Volver a mi Perfil
          </button>
          <nav class="breadcrumb-spa">
            <span>Mi Perfil</span>
            <i class="bi bi-chevron-right"></i>
            <span>Historial</span>
            <i class="bi bi-chevron-right"></i>
            <span class="activo">Seguimiento ${codigoCorto}</span>
          </nav>
        </div>

        <div class="seguimiento-card-principal">
          <!-- Banner En Camino -->
          <div class="seguimiento-banner-en-camino">
            <div class="banner-izq">
              <div class="icono-camion-animado">
                <i class="bi bi-truck"></i>
              </div>
              <div class="banner-texto">
                <h2>Tu pedido está en camino</h2>
                <p><i class="bi bi-clock-history"></i> Llegada estimada: Hoy antes de las 6:00 PM</p>
              </div>
            </div>
            <div class="banner-der">
              <span class="tag-guia"><i class="bi bi-upc-scan"></i> Guía: ${guia}</span>
            </div>
          </div>

          <!-- Stepper / Línea de tiempo de 4 pasos -->
          <div class="timeline-seguimiento">
            <div class="paso-progreso-barra"></div>

            <div class="paso-seguimiento completado">
              <div class="paso-icono-circulo">
                <i class="bi bi-check2"></i>
              </div>
              <span class="paso-titulo">Confirmado</span>
              <span class="paso-desc">Pago verificado</span>
            </div>

            <div class="paso-seguimiento completado">
              <div class="paso-icono-circulo">
                <i class="bi bi-check2"></i>
              </div>
              <span class="paso-titulo">En Taller Zen</span>
              <span class="paso-desc">Embalaje ecológico</span>
            </div>

            <div class="paso-seguimiento activo">
              <div class="paso-icono-circulo">
                <i class="bi bi-truck"></i>
              </div>
              <span class="paso-titulo">En Camino</span>
              <span class="paso-desc">Repartidor en ruta</span>
            </div>

            <div class="paso-seguimiento">
              <div class="paso-icono-circulo">
                <i class="bi bi-house-check"></i>
              </div>
              <span class="paso-titulo">Entregado</span>
              <span class="paso-desc">Entrega a domicilio</span>
            </div>
          </div>

          <!-- Mapa Visualizador Simulado con estética Japandi -->
          <div class="mapa-simulacion-card">
            <div class="mapa-header">
              <span><i class="bi bi-geo-alt-fill" style="color:#8BA889;"></i> Ruta en tiempo real</span>
              <span style="color:#4A634E; font-size:12px;"><i class="bi bi-broadcast"></i> GPS Activo · Repartidor a 15 min de tu ubicación</span>
            </div>

            <div class="mapa-canvas-visual">
              <div class="linea-ruta-animada"></div>

              <div class="nodo-mapa">
                <div class="nodo-circulo">
                  <i class="bi bi-building"></i>
                </div>
                <span class="nodo-label">Almacén Zen</span>
              </div>

              <div class="nodo-mapa camion">
                <div class="nodo-circulo">
                  <i class="bi bi-truck"></i>
                </div>
                <span class="nodo-label" style="background:#8BA889; color:#fff; border-color:#8BA889;">En Tránsito</span>
              </div>

              <div class="nodo-mapa">
                <div class="nodo-circulo">
                  <i class="bi bi-geo-alt-fill"></i>
                </div>
                <span class="nodo-label">Tu Domicilio</span>
              </div>
            </div>
          </div>

          <!-- Información del Repartidor Oficial -->
          <div class="repartidor-info-card">
            <div class="repartidor-izq">
              <div class="repartidor-avatar">
                <i class="bi bi-person-badge"></i>
              </div>
              <div class="repartidor-datos">
                <h4>Carlos Mendoza · Repartidor Oficial ZenSpace</h4>
                <p><i class="bi bi-shield-check" style="color:#8BA889;"></i> Furgón Eléctrico 100% Cero Emisiones · ⭐ 4.95 (320 entregas)</p>
                <p style="font-size:11px; color:#777; margin-top:2px;"><i class="bi bi-pin-map"></i> Entrega en: ${direccion}</p>
              </div>
            </div>

            <div class="repartidor-acciones">
              <button type="button" class="btn-contactar-soporte" id="btn-contactar-rep">
                <i class="bi bi-telephone"></i> Contactar Repartidor
              </button>
            </div>
          </div>

          <!-- Resumen de Artículos en el Paquete -->
          <div class="seguimiento-paquete-resumen">
            <h4><i class="bi bi-box2"></i> Artículos incluidos en este envío</h4>
            <div class="lista-items-seguimiento">
              ${items.map(it => `
                <div class="item-seguimiento-fila">
                  <span>${it.cantidad}x <strong>${it.producto}</strong></span>
                  <strong>$${(it.precio_unitario * it.cantidad).toFixed(2)}</strong>
                </div>
              `).join('')}
              <div class="item-seguimiento-fila" style="background:#ECE7DC; font-weight:700;">
                <span>Total pagado:</span>
                <strong style="font-size:16px; color:#1A1A1A;">$${totalNum}</strong>
              </div>
            </div>
          </div>

        </div>
      </section>
    `;
  }

  function abrirVisualizadorSeguimientoSPA(pedido) {
    const appContenido = document.getElementById('app-contenido') || document.querySelector('main');
    if (!appContenido || !pedido) return;

    if (vistaOriginalHTML === null) {
      vistaOriginalHTML = appContenido.innerHTML;
    }

    // Se elimina todo el HTML previo (SPA)
    appContenido.innerHTML = '';

    // Se inyecta la plantilla estándar de seguimiento de pedido
    appContenido.innerHTML = generarPlantillaSeguimientoPedido(pedido);

    // Actualiza URL hash
    window.location.hash = `seguimiento=${pedido._id || 'demo'}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Botón volver
    const btnVolver = document.getElementById('btn-volver-perfil');
    if (btnVolver) {
      btnVolver.onclick = () => cerrarVisualizadorSeguimientoSPA();
    }

    // Botón contactar
    const btnContactar = document.getElementById('btn-contactar-rep');
    if (btnContactar) {
      btnContactar.onclick = () => {
        alert('Notificación enviada a Carlos Mendoza (Repartidor ZenSpace). Te contactará a tu teléfono registrado en breves minutos.');
      };
    }
  }

  function cerrarVisualizadorSeguimientoSPA() {
    const appContenido = document.getElementById('app-contenido') || document.querySelector('main');
    if (!appContenido || vistaOriginalHTML === null) return;

    appContenido.innerHTML = vistaOriginalHTML;
    vistaOriginalHTML = null;

    if (window.location.hash.includes('seguimiento=')) {
      history.pushState('', document.title, window.location.pathname + window.location.search);
    }

    // Reasociar eventos en el perfil
    const usuario = obtenerUsuarioLogueado();
    if (usuario) {
      const contenedor = document.getElementById('contenedor-pedidos-lista');
      const contadorElem = document.getElementById('contador-pedidos');
      renderizarHistorialPedidos(pedidosUsuarioActual, contenedor, contadorElem);
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