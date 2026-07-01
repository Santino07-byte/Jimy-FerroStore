const express = require('express');
const Producto = require('../models/Producto');
const router = express.Router();

// GET /api/productos - listar todos (con filtro opcional por categoria o texto)
router.get('/', async (req, res) => {
  try {
    const { categoria, buscar } = req.query;
    const filtro = {};
    if (categoria) filtro.categoria = categoria;
    if (buscar) filtro.nombre = { $regex: buscar, $options: 'i' };

    const productos = await Producto.find(filtro).sort({ fecha_creacion: -1 });
    res.json(productos);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener productos', detalle: err.message });
  }
});

// GET /api/productos/:id - obtener uno por _id de Mongo
router.get('/:id', async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(producto);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener el producto', detalle: err.message });
  }
});

// POST /api/productos - crear
router.post('/', async (req, res) => {
  try {
    const { id_producto, nombre, descripcion, precio, stock, categoria } = req.body;
    const nuevoProducto = new Producto({ id_producto, nombre, descripcion, precio, stock, categoria });
    await nuevoProducto.save();
    res.status(201).json(nuevoProducto);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Ya existe un producto con ese id_producto' });
    }
    res.status(400).json({ error: 'Error al crear el producto', detalle: err.message });
  }
});

// PUT /api/productos/:id - actualizar
router.put('/:id', async (req, res) => {
  try {
    const producto = await Producto.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(producto);
  } catch (err) {
    res.status(400).json({ error: 'Error al actualizar el producto', detalle: err.message });
  }
});

// DELETE /api/productos/:id - eliminar
router.delete('/:id', async (req, res) => {
  try {
    const producto = await Producto.findByIdAndDelete(req.params.id);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ mensaje: 'Producto eliminado', producto });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar el producto', detalle: err.message });
  }
});

module.exports = router;
