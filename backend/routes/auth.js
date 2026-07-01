const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const { verificarToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();
const JWT_EXPIRA = '8h';

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    const usuario = await Usuario.findOne({ username: username.trim().toLowerCase() });
    if (!usuario) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const coincide = await bcrypt.compare(password, usuario.passwordHash);
    if (!coincide) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const token = jwt.sign(
      { id: usuario._id, username: usuario.username, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRA }
    );

    res.json({
      token,
      usuario: {
        id: usuario._id,
        username: usuario.username,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me  -> datos del usuario autenticado (para validar sesión / perfil)
router.get('/me', verificarToken, async (req, res, next) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/perfil -> actualizar nombre / correo del usuario autenticado
router.put('/perfil', verificarToken, async (req, res, next) => {
  try {
    const { nombre, correo } = req.body;
    const usuario = await Usuario.findById(req.usuario.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (nombre !== undefined) usuario.nombre = nombre.trim();
    if (correo !== undefined) usuario.correo = correo.trim();
    await usuario.save();

    res.json(usuario);
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/password -> cambiar contraseña del usuario autenticado
router.put('/password', verificarToken, async (req, res, next) => {
  try {
    const { passwordActual, passwordNueva } = req.body;

    if (!passwordActual || !passwordNueva) {
      return res.status(400).json({ error: 'Completá la contraseña actual y la nueva' });
    }
    if (passwordNueva.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const usuario = await Usuario.findById(req.usuario.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const coincide = await bcrypt.compare(passwordActual, usuario.passwordHash);
    if (!coincide) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    }

    usuario.passwordHash = await bcrypt.hash(passwordNueva, 10);
    await usuario.save();

    res.json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
