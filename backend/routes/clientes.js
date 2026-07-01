const express = require('express');
const Cliente = require('../models/Cliente');
const router = express.Router();

// GET /api/clientes
router.get('/', async (req, res) => {
  try {
    const { buscar } = req.query;
    const filtro = buscar ? { nombre: { $regex: buscar, $options: 'i' } } : {};
    const clientes = await Cliente.find(filtro).sort({ fecha_creacion: -1 });
    res.json(clientes);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener clientes', detalle: err.message });
  }
});

// GET /api/clientes/:id
router.get('/:id', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(cliente);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener el cliente', detalle: err.message });
  }
});

// POST /api/clientes
router.post('/', async (req, res) => {
  try {
    const { id_cliente, nombre, dni, correo, telefono, direccion } = req.body;
    const nuevoCliente = new Cliente({ id_cliente, nombre, dni, correo, telefono, direccion });
    await nuevoCliente.save();
    res.status(201).json(nuevoCliente);
  } catch (err) {
    if (err.code === 11000) {
      const campo = Object.keys(err.keyPattern || {})[0] || 'id_cliente, dni, correo o telefono';
      return res.status(409).json({ error: `Ya existe un cliente con ese ${campo}` });
    }
    res.status(400).json({ error: 'Error al crear el cliente', detalle: err.message });
  }
});

// PUT /api/clientes/:id
router.put('/:id', async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(cliente);
  } catch (err) {
    if (err.code === 11000) {
      const campo = Object.keys(err.keyPattern || {})[0] || 'id_cliente, dni, correo o telefono';
      return res.status(409).json({ error: `Ya existe un cliente con ese ${campo}` });
    }
    res.status(400).json({ error: 'Error al actualizar el cliente', detalle: err.message });
  }
});

// DELETE /api/clientes/:id
router.delete('/:id', async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndDelete(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ mensaje: 'Cliente eliminado', cliente });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar el cliente', detalle: err.message });
  }
});

module.exports = router;
