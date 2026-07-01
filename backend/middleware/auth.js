const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ferrostock_clave_secreta_dev';

function verificarToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No autenticado: falta el token de acceso' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.usuario = payload; // { id, username, rol }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión inválida o expirada. Iniciá sesión nuevamente.' });
  }
}

module.exports = { verificarToken, JWT_SECRET };
