const API_BASE = 'http://localhost:5000/api';
const TOKEN_KEY = 'ferrostock-token';

const Auth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
};

// Se dispara cuando el backend responde 401 (sesión vencida o sin token),
// para que app.js pueda mostrar la pantalla de login de nuevo.
const onSesionInvalida = () => document.dispatchEvent(new CustomEvent('sesion-invalida'));

async function apiRequest(path, options = {}) {
  const token = Auth.getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    Auth.clearToken();
    onSesionInvalida();
  }
  if (!res.ok) {
    throw new Error(data.error || `Error ${res.status}`);
  }
  return data;
}

const Api = {
  salud: () => apiRequest('/salud'),

  // Autenticacion / perfil
  login: (username, password) =>
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  perfilActual: () => apiRequest('/auth/me'),
  actualizarPerfil: (body) => apiRequest('/auth/perfil', { method: 'PUT', body: JSON.stringify(body) }),
  cambiarPassword: (passwordActual, passwordNueva) =>
    apiRequest('/auth/password', { method: 'PUT', body: JSON.stringify({ passwordActual, passwordNueva }) }),

  // Productos
  listarProductos: (params = '') => apiRequest(`/productos${params}`),
  crearProducto: (body) => apiRequest('/productos', { method: 'POST', body: JSON.stringify(body) }),
  actualizarProducto: (id, body) => apiRequest(`/productos/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  eliminarProducto: (id) => apiRequest(`/productos/${id}`, { method: 'DELETE' }),

  // Clientes
  listarClientes: (params = '') => apiRequest(`/clientes${params}`),
  crearCliente: (body) => apiRequest('/clientes', { method: 'POST', body: JSON.stringify(body) }),
  actualizarCliente: (id, body) => apiRequest(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  eliminarCliente: (id) => apiRequest(`/clientes/${id}`, { method: 'DELETE' }),

  // Pedidos
  listarPedidos: (params = '') => apiRequest(`/pedidos${params}`),
  crearPedido: (body) => apiRequest('/pedidos', { method: 'POST', body: JSON.stringify(body) }),
  actualizarEstadoPedido: (id, estado) =>
    apiRequest(`/pedidos/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado }) }),
  eliminarPedido: (id) => apiRequest(`/pedidos/${id}`, { method: 'DELETE' }),

  // Factura en PDF: se pide como blob (no como JSON) pero igual necesita el token
  obtenerFacturaPDF: async (id) => {
    const token = Auth.getToken();
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/pedidos/${id}/factura`, { headers });
    if (res.status === 401) {
      Auth.clearToken();
      onSesionInvalida();
      throw new Error('Sesión inválida o expirada');
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Error ${res.status}`);
    }
    return res.blob();
  },

  // Informes
  resumen: () => apiRequest('/informes/resumen'),
  ventasPorProducto: () => apiRequest('/informes/ventas-por-producto'),
  ventasPorCategoria: () => apiRequest('/informes/ventas-por-categoria'),
  ventasPorMes: () => apiRequest('/informes/ventas-por-mes'),
};
