// ---------- Estado global en memoria ----------
const state = {
  productos: [],
  clientes: [],
  pedidos: [],
};
let usuarioActual = null;

const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const fmtMoney = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: 'numeric' });

// ---------- Toast ----------
function toast(message, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.toggle('error', isError);
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 3200);
}

// ---------- Navegacion ----------
const viewTitles = {
  dashboard: 'Panel general',
  productos: 'Productos',
  clientes: 'Clientes',
  pedidos: 'Pedidos',
  informes: 'Informes',
};

function goToView(view) {
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach((s) => s.classList.toggle('active', s.id === `view-${view}`));
  document.getElementById('view-title').textContent = viewTitles[view];
  renderTopbarActions(view);
  loadView(view);
}

function renderTopbarActions(view) {
  const box = document.getElementById('topbar-actions');
  box.innerHTML = '';
  if (view === 'productos') box.appendChild(makeBtn('+ Nuevo producto', 'primary', () => openProductoModal()));
  if (view === 'clientes') box.appendChild(makeBtn('+ Nuevo cliente', 'primary', () => openClienteModal()));
  if (view === 'pedidos') box.appendChild(makeBtn('+ Nuevo pedido', 'primary', () => openPedidoModal()));
}

function makeBtn(text, cls, onClick) {
  const b = document.createElement('button');
  b.className = `btn ${cls}`;
  b.textContent = text;
  b.onclick = onClick;
  return b;
}

document.getElementById('nav').addEventListener('click', (e) => {
  const btn = e.target.closest('.nav-item');
  if (btn) goToView(btn.dataset.view);
});

// ---------- Tema claro / oscuro ----------
const THEME_KEY = 'ferrostock-theme';
const themeToggleBtn = document.getElementById('theme-toggle');
const themeToggleIcon = document.getElementById('theme-toggle-icon');

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggleIcon.textContent = theme === 'light' ? '🌙' : '☀️';
  themeToggleBtn.title = theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(saved || (prefersLight ? 'light' : 'dark'));
}

themeToggleBtn.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  const next = current === 'light' ? 'dark' : 'light';
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
  if (window.ultimosDatosVentasPorMes) renderChartVentasMes(window.ultimosDatosVentasPorMes);
});

initTheme();

function loadView(view) {
  if (view === 'dashboard') loadDashboard();
  if (view === 'productos') loadProductos();
  if (view === 'clientes') loadClientes();
  if (view === 'pedidos') loadPedidos();
  if (view === 'informes') loadInformes();
}

// ---------- Modal helper ----------
const backdrop = document.getElementById('modal-backdrop');
const modalEl = document.getElementById('modal');
function openModal(html) {
  modalEl.innerHTML = html;
  backdrop.classList.add('active');
}
function closeModal() {
  backdrop.classList.remove('active');
  modalEl.innerHTML = '';
}
backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });

// ==================================================
// DASHBOARD
// ==================================================
async function loadDashboard() {
  try {
    const [resumen] = await Promise.all([Api.resumen()]);
    document.getElementById('stat-pedidos').textContent = resumen.totalPedidos ?? 0;
    document.getElementById('stat-ingresos').textContent = fmtMoney(resumen.totalIngresos);
    document.getElementById('stat-pendientes').textContent = resumen.pendientes ?? 0;
    document.getElementById('stat-entregados').textContent = resumen.entregados ?? 0;
  } catch (err) {
    toast(err.message, true);
  }

  try {
    const productos = await Api.listarProductos();
    state.productos = productos;
    const maxStock = Math.max(...productos.map((p) => p.stock), 1);
    const pulseBox = document.getElementById('stock-pulse-list');
    pulseBox.innerHTML = productos
      .slice()
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 6)
      .map((p) => {
        const pct = Math.round((p.stock / maxStock) * 100);
        const cls = p.stock === 0 ? 'empty' : p.stock <= 5 ? 'low' : '';
        return `<div class="pulse-row">
          <span class="pulse-name">${escapeHtml(p.nombre)}</span>
          <span class="pulse-track"><span class="pulse-fill ${cls}" style="width:${pct}%"></span></span>
          <span class="pulse-val mono">${p.stock}</span>
        </div>`;
      })
      .join('') || '<span class="panel-hint">Sin productos cargados todavía.</span>';
  } catch (err) {
    toast(err.message, true);
  }

  try {
    const pedidos = await Api.listarPedidos();
    const box = document.getElementById('pedidos-recientes');
    box.innerHTML = pedidos
      .slice(0, 6)
      .map(
        (p) => `<div class="mini-row">
          <span>${escapeHtml(p.cliente.nombre)} <span class="pill ${p.estado}">${p.estado}</span></span>
          <span class="mono">${fmtMoney(p.total)}</span>
        </div>`
      )
      .join('') || '<span class="panel-hint">Todavía no hay pedidos registrados.</span>';
  } catch (err) {
    toast(err.message, true);
  }
}

// ==================================================
// PRODUCTOS
// ==================================================
async function loadProductos() {
  const buscar = document.getElementById('buscar-producto').value.trim();
  const categoria = document.getElementById('filtro-categoria').value;
  const params = new URLSearchParams();
  if (buscar) params.set('buscar', buscar);
  if (categoria) params.set('categoria', categoria);
  const qs = params.toString() ? `?${params}` : '';

  try {
    const productos = await Api.listarProductos(qs);
    state.productos = productos;
    const tbody = document.getElementById('tabla-productos');
    tbody.innerHTML =
      productos
        .map(
          (p) => `<tr>
        <td class="mono">${escapeHtml(p.id_producto)}</td>
        <td>${escapeHtml(p.nombre)}</td>
        <td>${escapeHtml(p.categoria)}</td>
        <td class="mono">${fmtMoney(p.precio)}</td>
        <td class="mono">${p.stock}</td>
        <td class="row-actions">
          <button class="btn small" onclick="openProductoModal('${p._id}')">Editar</button>
          <button class="btn small danger" onclick="borrarProducto('${p._id}')">Eliminar</button>
        </td>
      </tr>`
        )
        .join('') || `<tr class="empty-row"><td colspan="6">No hay productos que coincidan con la búsqueda.</td></tr>`;
  } catch (err) {
    toast(err.message, true);
  }
}
document.getElementById('buscar-producto').addEventListener('input', debounce(loadProductos, 300));
document.getElementById('filtro-categoria').addEventListener('change', loadProductos);

function openProductoModal(id) {
  const producto = id ? state.productos.find((p) => p._id === id) : null;
  openModal(`
    <h2>${producto ? 'Editar producto' : 'Nuevo producto'}</h2>
    <form id="form-producto">
      <div class="form-row">
        <div class="form-field">
          <label>ID de producto</label>
          <input name="id_producto" value="${producto ? escapeHtml(producto.id_producto) : ''}" ${producto ? 'readonly' : ''} required />
        </div>
        <div class="form-field">
          <label>Categoría</label>
          <select name="categoria" required>
            ${[
              'Herramientas Manuales',
              'Herramientas Electricas',
              'Materiales de Construccion',
              'Electricidad',
              'Plomeria',
              'Pintura',
              'Seguridad e Higiene',
              'Tornillos y Fijaciones',
              'Otros',
            ]
              .map((c) => `<option value="${c}" ${producto && producto.categoria === c ? 'selected' : ''}>${c}</option>`)
              .join('')}
          </select>
        </div>
      </div>
      <div class="form-field">
        <label>Nombre</label>
        <input name="nombre" value="${producto ? escapeHtml(producto.nombre) : ''}" required />
      </div>
      <div class="form-field">
        <label>Descripción</label>
        <input name="descripcion" value="${producto ? escapeHtml(producto.descripcion || '') : ''}" />
      </div>
      <div class="form-row">
        <div class="form-field">
          <label>Precio (ARS)</label>
          <input name="precio" type="number" min="0" step="0.01" value="${producto ? producto.precio : ''}" required />
        </div>
        <div class="form-field">
          <label>Stock</label>
          <input name="stock" type="number" min="0" step="1" value="${producto ? producto.stock : 0}" required />
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn primary">${producto ? 'Guardar cambios' : 'Crear producto'}</button>
      </div>
    </form>
  `);

  document.getElementById('form-producto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      id_producto: fd.get('id_producto').trim(),
      nombre: fd.get('nombre').trim(),
      descripcion: fd.get('descripcion').trim(),
      precio: parseFloat(fd.get('precio')),
      stock: parseInt(fd.get('stock'), 10),
      categoria: fd.get('categoria'),
    };
    try {
      if (producto) await Api.actualizarProducto(producto._id, body);
      else await Api.crearProducto(body);
      toast(producto ? 'Producto actualizado' : 'Producto creado');
      closeModal();
      loadProductos();
    } catch (err) {
      toast(err.message, true);
    }
  });
}

async function borrarProducto(id) {
  if (!confirm('¿Eliminar este producto del inventario?')) return;
  try {
    await Api.eliminarProducto(id);
    toast('Producto eliminado');
    loadProductos();
  } catch (err) {
    toast(err.message, true);
  }
}

// ==================================================
// CLIENTES
// ==================================================
async function loadClientes() {
  const buscar = document.getElementById('buscar-cliente').value.trim();
  const qs = buscar ? `?buscar=${encodeURIComponent(buscar)}` : '';
  try {
    const clientes = await Api.listarClientes(qs);
    state.clientes = clientes;
    const tbody = document.getElementById('tabla-clientes');
    tbody.innerHTML =
      clientes
        .map(
          (c) => `<tr>
        <td class="mono">${escapeHtml(c.id_cliente)}</td>
        <td>${escapeHtml(c.nombre)}</td>
        <td class="mono">${escapeHtml(c.dni || '')}</td>
        <td>${escapeHtml(c.correo)}</td>
        <td class="mono">${escapeHtml(c.telefono)}</td>
        <td>${escapeHtml(c.direccion || '')}</td>
        <td class="row-actions">
          <button class="btn small" onclick="openClienteModal('${c._id}')">Editar</button>
          <button class="btn small danger" onclick="borrarCliente('${c._id}')">Eliminar</button>
        </td>
      </tr>`
        )
        .join('') || `<tr class="empty-row"><td colspan="7">No hay clientes que coincidan con la búsqueda.</td></tr>`;
  } catch (err) {
    toast(err.message, true);
  }
}
document.getElementById('buscar-cliente').addEventListener('input', debounce(loadClientes, 300));

function openClienteModal(id) {
  const cliente = id ? state.clientes.find((c) => c._id === id) : null;
  openModal(`
    <h2>${cliente ? 'Editar cliente' : 'Nuevo cliente'}</h2>
    <form id="form-cliente">
      <div class="form-field">
        <label>ID de cliente</label>
        <input name="id_cliente" value="${cliente ? escapeHtml(cliente.id_cliente) : ''}" ${cliente ? 'readonly' : ''} required />
      </div>
      <div class="form-field">
        <label>Nombre</label>
        <input name="nombre" value="${cliente ? escapeHtml(cliente.nombre) : ''}" required />
      </div>
      <div class="form-field">
        <label>DNI</label>
        <input name="dni" value="${cliente ? escapeHtml(cliente.dni || '') : ''}" pattern="\\d{7,9}" title="Entre 7 y 9 dígitos numéricos" required />
      </div>
      <div class="form-field">
        <label>Correo electrónico</label>
        <input name="correo" type="email" value="${cliente ? escapeHtml(cliente.correo) : ''}" required />
      </div>
      <div class="form-field">
        <label>Teléfono</label>
        <input name="telefono" value="${cliente ? escapeHtml(cliente.telefono) : ''}" required />
      </div>
      <div class="form-field">
        <label>Dirección</label>
        <input name="direccion" value="${cliente ? escapeHtml(cliente.direccion || '') : ''}" />
      </div>
      <div class="modal-actions">
        <button type="button" class="btn" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn primary">${cliente ? 'Guardar cambios' : 'Crear cliente'}</button>
      </div>
    </form>
  `);

  document.getElementById('form-cliente').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      id_cliente: fd.get('id_cliente').trim(),
      nombre: fd.get('nombre').trim(),
      dni: fd.get('dni').trim(),
      correo: fd.get('correo').trim(),
      telefono: fd.get('telefono').trim(),
      direccion: fd.get('direccion').trim(),
    };
    try {
      if (cliente) await Api.actualizarCliente(cliente._id, body);
      else await Api.crearCliente(body);
      toast(cliente ? 'Cliente actualizado' : 'Cliente creado');
      closeModal();
      loadClientes();
    } catch (err) {
      toast(err.message, true);
    }
  });
}

async function borrarCliente(id) {
  if (!confirm('¿Eliminar este cliente?')) return;
  try {
    await Api.eliminarCliente(id);
    toast('Cliente eliminado');
    loadClientes();
  } catch (err) {
    toast(err.message, true);
  }
}

// ==================================================
// PEDIDOS
// ==================================================
async function loadPedidos() {
  const estado = document.getElementById('filtro-estado').value;
  const qs = estado ? `?estado=${estado}` : '';
  try {
    const pedidos = await Api.listarPedidos(qs);
    state.pedidos = pedidos;
    const tbody = document.getElementById('tabla-pedidos');
    tbody.innerHTML =
      pedidos
        .map((p) => {
          const resumenProductos = p.productos.map((it) => `${it.nombre} x${it.cantidad}`).join(', ');
          const numeroStr = String(p.numero_factura ?? '').padStart(8, '0');
          return `<tr>
        <td class="mono">${numeroStr}</td>
        <td>${escapeHtml(p.cliente.nombre)}</td>
        <td>${escapeHtml(resumenProductos)}</td>
        <td class="mono">${fmtMoney(p.total)}</td>
        <td>${fmtDate(p.fecha_pedido)}</td>
        <td>
          <select onchange="cambiarEstadoPedido('${p._id}', this.value)" class="pill ${p.estado}">
            ${['pendiente', 'enviado', 'entregado', 'cancelado']
              .map((e) => `<option value="${e}" ${e === p.estado ? 'selected' : ''}>${e}</option>`)
              .join('')}
          </select>
        </td>
        <td class="row-actions">
          <button class="btn small" onclick="verFactura('${p._id}')">Factura</button>
          <button class="btn small danger" onclick="borrarPedido('${p._id}')">Eliminar</button>
        </td>
      </tr>`;
        })
        .join('') || `<tr class="empty-row"><td colspan="7">Todavía no hay pedidos registrados.</td></tr>`;
  } catch (err) {
    toast(err.message, true);
  }
}
document.getElementById('filtro-estado').addEventListener('change', loadPedidos);

async function cambiarEstadoPedido(id, estado) {
  try {
    await Api.actualizarEstadoPedido(id, estado);
    toast('Estado del pedido actualizado');
    loadPedidos();
  } catch (err) {
    toast(err.message, true);
    loadPedidos();
  }
}

async function verFactura(id) {
  try {
    const blob = await Api.obtenerFacturaPDF(id);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Libera la memoria del blob luego de que el navegador tuvo tiempo de abrirlo
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (err) {
    toast(err.message, true);
  }
}

async function borrarPedido(id) {
  if (!confirm('¿Eliminar este pedido? Esta acción no repone el stock automáticamente.')) return;
  try {
    await Api.eliminarPedido(id);
    toast('Pedido eliminado');
    loadPedidos();
  } catch (err) {
    toast(err.message, true);
  }
}

async function openPedidoModal() {
  if (!state.clientes.length) state.clientes = await Api.listarClientes().catch(() => []);
  if (!state.productos.length) state.productos = await Api.listarProductos().catch(() => []);

  openModal(`
    <h2>Nuevo pedido</h2>
    <form id="form-pedido">
      <div class="form-field">
        <label>Cliente</label>
        <select name="id_cliente" required>
          <option value="">Seleccionar cliente&hellip;</option>
          ${state.clientes.map((c) => `<option value="${c.id_cliente}">${escapeHtml(c.nombre)} (${c.id_cliente})</option>`).join('')}
        </select>
      </div>
      <label style="font-size:12px;color:var(--text-muted);">Productos del pedido</label>
      <div class="line-item-list" id="line-items"></div>
      <button type="button" class="btn small" id="btn-add-line">+ Agregar producto</button>
      <div class="order-total" id="order-total">Total: $0.00</div>
      <div class="modal-actions">
        <button type="button" class="btn" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn primary">Registrar pedido</button>
      </div>
    </form>
  `);

  const lineList = document.getElementById('line-items');

  function addLine() {
    const row = document.createElement('div');
    row.className = 'line-item';
    row.innerHTML = `
      <select class="line-producto">
        <option value="">Producto&hellip;</option>
        ${state.productos.map((p) => `<option value="${p.id_producto}" data-precio="${p.precio}" data-stock="${p.stock}">${escapeHtml(p.nombre)} &mdash; ${fmtMoney(p.precio)} (stock ${p.stock})</option>`).join('')}
      </select>
      <input class="line-cantidad" type="number" min="1" value="1" />
      <button type="button" class="line-item-remove" title="Quitar">&times;</button>
    `;
    row.querySelector('.line-item-remove').onclick = () => { row.remove(); recalcTotal(); };
    row.querySelector('.line-producto').addEventListener('change', recalcTotal);
    row.querySelector('.line-cantidad').addEventListener('input', recalcTotal);
    lineList.appendChild(row);
  }

  function recalcTotal() {
    let total = 0;
    lineList.querySelectorAll('.line-item').forEach((row) => {
      const sel = row.querySelector('.line-producto');
      const opt = sel.selectedOptions[0];
      const cantidad = parseInt(row.querySelector('.line-cantidad').value, 10) || 0;
      if (opt && opt.value) total += parseFloat(opt.dataset.precio) * cantidad;
    });
    document.getElementById('order-total').textContent = `Total: ${fmtMoney(total)}`;
  }

  document.getElementById('btn-add-line').onclick = addLine;
  addLine();

  document.getElementById('form-pedido').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const id_cliente = fd.get('id_cliente');
    const productos = [];
    lineList.querySelectorAll('.line-item').forEach((row) => {
      const id_producto = row.querySelector('.line-producto').value;
      const cantidad = parseInt(row.querySelector('.line-cantidad').value, 10);
      if (id_producto && cantidad > 0) productos.push({ id_producto, cantidad });
    });
    if (!id_cliente || productos.length === 0) {
      toast('Seleccioná un cliente y al menos un producto', true);
      return;
    }
    try {
      await Api.crearPedido({ id_cliente, productos });
      toast('Pedido registrado y stock actualizado');
      closeModal();
      loadPedidos();
    } catch (err) {
      toast(err.message, true);
    }
  });
}

// ==================================================
// INFORMES
// ==================================================
function renderBarList(container, items, labelKey, valueKey, formatValue) {
  if (!items.length) {
    container.innerHTML = '<span class="panel-hint">Todavía no hay datos suficientes.</span>';
    return;
  }
  const max = Math.max(...items.map((i) => i[valueKey]), 1);
  container.innerHTML = items
    .map((i) => {
      const pct = Math.round((i[valueKey] / max) * 100);
      return `<div class="bar-row">
        <span class="bar-label">${escapeHtml(String(i[labelKey]))}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${pct}%"></span></span>
        <span class="bar-value mono">${formatValue(i[valueKey])}</span>
      </div>`;
    })
    .join('');
}

let ventasChart = null;

function renderChartVentasMes(datos) {
  window.ultimosDatosVentasPorMes = datos;
  const canvas = document.getElementById('chart-ventas-mes');
  const contenedor = canvas ? canvas.parentElement : null;
  if (!canvas) return;

  if (typeof Chart === 'undefined') {
    if (contenedor) {
      contenedor.innerHTML =
        '<span class="panel-hint">No se pudo cargar la librería del gráfico (Chart.js). Verificá tu conexión a internet o si el navegador está bloqueando el CDN.</span>';
    }
    return;
  }

  const estilos = getComputedStyle(document.documentElement);
  const colorAccent = estilos.getPropertyValue('--accent').trim();
  const colorAccentDim = estilos.getPropertyValue('--accent-dim').trim();
  const colorTexto = estilos.getPropertyValue('--text-muted').trim();
  const colorBorde = estilos.getPropertyValue('--border').trim();

  if (ventasChart) {
    ventasChart.destroy();
    ventasChart = null;
  }

  if (!datos.length) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  ventasChart = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: datos.map((d) => d.nombre),
      datasets: [
        {
          label: 'Ingresos',
          data: datos.map((d) => d.ingresos),
          backgroundColor: colorAccentDim,
          hoverBackgroundColor: colorAccent,
          borderRadius: 4,
          maxBarThickness: 46,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${fmtMoney(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: colorTexto, font: { family: 'Inter' } },
          grid: { display: false },
        },
        y: {
          ticks: {
            color: colorTexto,
            font: { family: 'JetBrains Mono' },
            callback: (val) => fmtMoney(val),
          },
          grid: { color: colorBorde },
        },
      },
    },
  });
}

async function loadInformes() {
  try {
    const porProducto = await Api.ventasPorProducto();
    renderBarList(
      document.getElementById('informe-producto'),
      porProducto.map((p) => ({ nombre: p.nombre || p._id, ingresos: p.totalIngresos })),
      'nombre',
      'ingresos',
      fmtMoney
    );
  } catch (err) { toast(err.message, true); }

  try {
    const porCategoria = await Api.ventasPorCategoria();
    renderBarList(
      document.getElementById('informe-categoria'),
      porCategoria.map((c) => ({ nombre: c._id, ingresos: c.totalIngresos })),
      'nombre',
      'ingresos',
      fmtMoney
    );
  } catch (err) { toast(err.message, true); }

  try {
    const porMes = await Api.ventasPorMes();
    const datosMes = porMes.map((m) => ({ nombre: `${meses[m._id.mes - 1]} ${m._id.anio}`, ingresos: m.totalIngresos }));
    renderBarList(document.getElementById('informe-mes'), datosMes, 'nombre', 'ingresos', fmtMoney);
    renderChartVentasMes(datosMes);
  } catch (err) { toast(err.message, true); }
}

// ---------- Utilidades ----------
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ---------- Chequeo de conexion con la API ----------
async function checkApi() {
  const dot = document.getElementById('conn-dot');
  const label = document.getElementById('conn-label');
  try {
    await Api.salud();
    dot.className = 'conn-dot ok';
    label.textContent = 'API conectada';
  } catch {
    dot.className = 'conn-dot fail';
    label.textContent = 'API no disponible';
  }
}

// ==================================================
// AUTENTICACION (login / sesión / perfil)
// ==================================================
const authScreen = document.getElementById('auth-screen');
const appRoot = document.getElementById('app');

function mostrarLogin() {
  usuarioActual = null;
  appRoot.style.display = 'none';
  authScreen.style.display = 'flex';
  document.getElementById('login-password').value = '';
  document.getElementById('auth-error').textContent = '';
  document.getElementById('login-username').focus();
}

function mostrarApp(usuario) {
  usuarioActual = usuario;
  authScreen.style.display = 'none';
  appRoot.style.display = ''; // vuelve al "display:flex" definido en el CSS
  actualizarSidebarUsuario();
  checkApi();
  loadDashboard();
}

function actualizarSidebarUsuario() {
  if (!usuarioActual) return;
  const nombreVisible = usuarioActual.nombre || usuarioActual.username || '?';
  document.getElementById('user-avatar').textContent = nombreVisible.trim().charAt(0).toUpperCase();
  document.getElementById('user-name-label').textContent = nombreVisible;
  document.getElementById('user-role-label').textContent = usuarioActual.rol || '';
}

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-submit');
  const errBox = document.getElementById('auth-error');
  errBox.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Ingresando…';
  try {
    const { token, usuario } = await Api.login(username, password);
    Auth.setToken(token);
    mostrarApp(usuario);
  } catch (err) {
    errBox.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Ingresar';
  }
});

// Menú de usuario (perfil / cerrar sesión)
const userMenu = document.getElementById('user-menu');
document.getElementById('user-menu-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  userMenu.classList.toggle('open');
});
document.addEventListener('click', () => userMenu.classList.remove('open'));

document.getElementById('btn-abrir-perfil').addEventListener('click', () => {
  userMenu.classList.remove('open');
  openPerfilModal();
});

document.getElementById('btn-cerrar-sesion').addEventListener('click', () => {
  userMenu.classList.remove('open');
  Auth.clearToken();
  mostrarLogin();
  toast('Sesión cerrada');
});

// Si el backend devuelve 401 en cualquier momento (token vencido/inválido)
document.addEventListener('sesion-invalida', () => {
  mostrarLogin();
  toast('Tu sesión expiró, iniciá sesión nuevamente', true);
});

// ---------- Modal de perfil / cambio de contraseña ----------
function openPerfilModal() {
  if (!usuarioActual) return;
  openModal(`
    <h2>Mi perfil</h2>
    <div class="profile-tabs">
      <button type="button" class="profile-tab active" data-tab="datos">Datos</button>
      <button type="button" class="profile-tab" data-tab="password">Cambiar contraseña</button>
    </div>

    <div class="profile-pane active" id="pane-datos">
      <form id="form-perfil">
        <div class="form-field">
          <label>Usuario</label>
          <input value="${escapeHtml(usuarioActual.username)}" readonly />
        </div>
        <div class="form-field">
          <label>Nombre</label>
          <input name="nombre" value="${escapeHtml(usuarioActual.nombre || '')}" required />
        </div>
        <div class="form-field">
          <label>Correo</label>
          <input name="correo" type="email" value="${escapeHtml(usuarioActual.correo || '')}" />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn primary">Guardar cambios</button>
        </div>
      </form>
    </div>

    <div class="profile-pane" id="pane-password">
      <form id="form-password">
        <div class="form-field">
          <label>Contraseña actual</label>
          <input name="passwordActual" type="password" autocomplete="current-password" required />
        </div>
        <div class="form-field">
          <label>Nueva contraseña</label>
          <input name="passwordNueva" type="password" minlength="6" autocomplete="new-password" required />
        </div>
        <div class="field-hint">Mínimo 6 caracteres.</div>
        <div class="form-field">
          <label>Confirmar nueva contraseña</label>
          <input name="passwordConfirmar" type="password" autocomplete="new-password" required />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn primary">Actualizar contraseña</button>
        </div>
      </form>
    </div>
  `);

  modalEl.querySelectorAll('.profile-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      modalEl.querySelectorAll('.profile-tab').forEach((t) => t.classList.toggle('active', t === tab));
      modalEl
        .querySelectorAll('.profile-pane')
        .forEach((p) => p.classList.toggle('active', p.id === `pane-${tab.dataset.tab}`));
    });
  });

  document.getElementById('form-perfil').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const actualizado = await Api.actualizarPerfil({
        nombre: fd.get('nombre').trim(),
        correo: (fd.get('correo') || '').trim(),
      });
      usuarioActual = actualizado;
      actualizarSidebarUsuario();
      toast('Perfil actualizado');
      closeModal();
    } catch (err) {
      toast(err.message, true);
    }
  });

  document.getElementById('form-password').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const nueva = fd.get('passwordNueva');
    const confirmar = fd.get('passwordConfirmar');
    if (nueva !== confirmar) {
      toast('Las contraseñas nuevas no coinciden', true);
      return;
    }
    try {
      await Api.cambiarPassword(fd.get('passwordActual'), nueva);
      toast('Contraseña actualizada correctamente');
      closeModal();
    } catch (err) {
      toast(err.message, true);
    }
  });
}

// ---------- Inicio: valida sesión existente o muestra el login ----------
(async function initSesion() {
  const token = Auth.getToken();
  if (!token) {
    mostrarLogin();
    return;
  }
  try {
    const usuario = await Api.perfilActual();
    mostrarApp(usuario);
  } catch {
    Auth.clearToken();
    mostrarLogin();
  }
})();
