document.addEventListener('DOMContentLoaded', () => {
  const API_URL = (window.location.hostname === 'localhost' && window.location.port === '3000')
    ? '/api'
    : 'http://localhost:3000/api';

  const tablaCuerpo = document.getElementById('cuerpo-tabla-productos');
  const modalCrear = document.getElementById('modal-crear-producto');
  const btnAbrirModal = document.getElementById('btn-abrir-modal-crear');
  const btnCerrarModal = document.getElementById('btn-cerrar-modal');
  const btnCancelarModal = document.getElementById('btn-cancelar-modal');
  const formCrear = document.getElementById('form-crear-producto');
  const selectCategoria = document.getElementById('campo-categoria');
  const inputBuscador = document.getElementById('buscador-admin-prods');

  let productosLista = [];

  // Mostrar datos del usuario tienda en la cabecera del dashboard
  try {
    const usuarioRaw = localStorage.getItem('zenspace-usuario');
    if (usuarioRaw) {
      const u = JSON.parse(usuarioRaw);
      const spanUsr = document.querySelector('.usario span');
      if (spanUsr && u.nombre) {
        spanUsr.textContent = u.nombre + (u.rol === 'tienda' ? ' (Tienda)' : '');
      }
    }
  } catch (e) {}

  // Helper para normalizar ruta de imagen
  function normalizarImagenAdmin(url) {
    if (!url) return '../Cliente/images/silla.png';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    let limpia = url.replace(/^(\.\.\/)+Cliente\//, '').replace(/^(\.\/)+/, '').replace(/^\/+/, '');
    return '../Cliente/' + limpia;
  }

  // Cargar categorías disponibles en el selector
  async function cargarCategorias() {
    if (!selectCategoria) return;
    try {
      const res = await fetch(`${API_URL}/categorias`);
      if (!res.ok) return;
      const categorias = await res.json();
      selectCategoria.innerHTML = '<option value="">Selecciona una categoría</option>';
      categorias.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat._id;
        opt.textContent = cat.nombre;
        selectCategoria.appendChild(opt);
      });
    } catch (err) {
      console.error('Error al cargar categorías en admin:', err);
    }
  }

  // Renderizar la tabla de productos
  function renderizarTabla(productos) {
    if (!tablaCuerpo) return;

    if (productos.length === 0) {
      tablaCuerpo.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:30px; color:#888;">
            No se encontraron productos registrados en la base de datos.
          </td>
        </tr>
      `;
      return;
    }

    tablaCuerpo.innerHTML = productos.map(prod => {
      const img = normalizarImagenAdmin(prod.imagen_url);
      const catNombre = prod.categoria?.nombre || 'General';
      const precio = Number(prod.precio || 0).toFixed(2);
      const estado = prod.estado !== false;
      const stock = prod.stock ?? 0;

      return `
        <tr style="border-bottom:1px solid #F0ECE4; transition:background 0.15s;">
          <td style="padding:10px;">
            <img src="${img}" alt="${prod.nombre}" style="width:44px; height:44px; object-fit:contain; border-radius:6px; background:#F8F6F2; padding:2px;">
          </td>
          <td style="padding:10px; font-weight:600; color:#1a1a1a;">
            ${prod.nombre}
            <div style="font-size:11px; color:#888; font-weight:normal;">SKU: ${prod._id}</div>
          </td>
          <td style="padding:10px; color:#555;">
            <span style="background:#F2EFE9; padding:3px 8px; border-radius:12px; font-size:12px;">${catNombre}</span>
          </td>
          <td style="padding:10px; font-weight:700; color:#2D3E33;">$${precio}</td>
          <td style="padding:10px; color:${stock > 0 ? '#137333':'#C5221F'}; font-weight:600;">${stock} uds</td>
          <td style="padding:10px;">
            <span style="background:${estado ? '#E6F4EA':'#FCE8E6'}; color:${estado ? '#137333':'#C5221F'}; padding:3px 8px; border-radius:12px; font-size:12px; font-weight:600;">
              ${estado ? 'Activo' : 'Inactivo'}
            </span>
          </td>
          <td style="padding:10px; text-align:center;">
            <button class="btn-eliminar-prod" data-id="${prod._id}" style="border:none; background:#FCE8E6; color:#C5221F; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:13px;" title="Eliminar producto">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Eventos de eliminación
    tablaCuerpo.querySelectorAll('.btn-eliminar-prod').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) return;

        try {
          const res = await fetch(`${API_URL}/productos/${id}`, { method: 'DELETE' });
          if (res.ok) {
            cargarProductosAdmin();
          } else {
            alert('Error al eliminar el producto.');
          }
        } catch (err) {
          console.error(err);
          alert('Error de conexión.');
        }
      };
    });
  }

  // Cargar productos desde la API
  async function cargarProductosAdmin() {
    if (!tablaCuerpo) return;
    try {
      const res = await fetch(`${API_URL}/productos`);
      if (!res.ok) throw new Error('Error al consultar productos');
      productosLista = await res.json();
      renderizarTabla(productosLista);
    } catch (err) {
      console.error('Error al cargar productos en admin:', err);
      tablaCuerpo.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:30px; color:#C5221F;">
            Error al conectar con la base de datos MongoDB. Asegúrate de que el servidor Node esté activo.
          </td>
        </tr>
      `;
    }
  }

  // Filtrado en vivo del buscador
  if (inputBuscador) {
    inputBuscador.oninput = () => {
      const q = inputBuscador.value.trim().toLowerCase();
      const filtrados = productosLista.filter(p =>
        (p.nombre || '').toLowerCase().includes(q) ||
        (p._id || '').toLowerCase().includes(q) ||
        (p.categoria?.nombre || '').toLowerCase().includes(q)
      );
      renderizarTabla(filtrados);
    };
  }

  // Apertura y Cierre del modal
  if (btnAbrirModal && modalCrear) {
    btnAbrirModal.onclick = () => {
      modalCrear.style.display = 'flex';
      cargarCategorias();
    };
  }

  function cerrarModal() {
    if (modalCrear) {
      modalCrear.style.display = 'none';
      if (formCrear) formCrear.reset();
    }
  }

  if (btnCerrarModal) btnCerrarModal.onclick = cerrarModal;
  if (btnCancelarModal) btnCancelarModal.onclick = cerrarModal;

  // Sugerencias rápidas de imagen
  document.querySelectorAll('.btn-img-sug').forEach(btn => {
    btn.onclick = () => {
      const campoImg = document.getElementById('campo-imagen');
      if (campoImg) campoImg.value = btn.dataset.val;
    };
  });

  // Guardar nuevo producto (POST /api/productos)
  if (formCrear) {
    formCrear.onsubmit = async (e) => {
      e.preventDefault();

      const nombre = document.getElementById('campo-nombre')?.value.trim();
      const categoria = document.getElementById('campo-categoria')?.value;
      const precio = parseFloat(document.getElementById('campo-precio')?.value) || 0;
      const stock = parseInt(document.getElementById('campo-stock')?.value, 10) || 0;
      const estado = document.getElementById('campo-estado')?.value === 'true';
      const imagen_url = document.getElementById('campo-imagen')?.value.trim() || 'images/silla.png';
      const descripcion = document.getElementById('campo-descripcion')?.value.trim();

      if (!nombre || !categoria) {
        alert('Por favor completa todos los campos obligatorios (*)');
        return;
      }

      const nuevoProd = {
        nombre,
        categoria,
        precio,
        stock,
        estado,
        imagen_url,
        descripcion
      };

      try {
        const res = await fetch(`${API_URL}/productos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nuevoProd)
        });

        if (!res.ok) {
          const errData = await res.json();
          alert(errData.error || 'Error al crear el producto');
          return;
        }

        alert('¡Producto creado exitosamente!');
        cerrarModal();
        cargarProductosAdmin();
      } catch (err) {
        console.error('Error al guardar producto:', err);
        alert('Error al conectar con el servidor.');
      }
    };
  }

  // Inicialización
  cargarCategorias();
  cargarProductosAdmin();
});
