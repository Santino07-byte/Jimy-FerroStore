const express = require('express');
const mongoose = require('mongoose');
const Pedido = require('../models/Pedido');
const Producto = require('../models/Producto');
const Cliente = require('../models/Cliente');
const { siguienteNumero } = require('../models/Counter');
const { generarFacturaPDF } = require('../utils/facturaPdf');
const router = express.Router();

// GET /api/pedidos - listar todos, con filtro opcional por cliente_id o estado
router.get('/', async (req, res) => {
  try {
    const { cliente_id, estado } = req.query;
    const filtro = {};
    if (cliente_id) filtro['cliente.id_cliente'] = cliente_id;
    if (estado) filtro.estado = estado;

    const pedidos = await Pedido.find(filtro).sort({ fecha_pedido: -1 });
    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener pedidos', detalle: err.message });
  }
});

// GET /api/pedidos/:id
router.get('/:id', async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id);
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(pedido);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener el pedido', detalle: err.message });
  }
});

// POST /api/pedidos - crear pedido: valida stock, arma snapshot y descuenta inventario
router.post('/', async (req, res) => {
  const { id_cliente, productos } = req.body;

  if (!id_cliente || !Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({ error: 'id_cliente y una lista de productos son obligatorios' });
  }

  try {
    const cliente = await Cliente.findOne({ id_cliente });
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    const itemsPedido = [];
    let total = 0;

    // Verificar stock y armar detalle antes de confirmar nada
    for (const item of productos) {
      const producto = await Producto.findOne({ id_producto: item.id_producto });
      if (!producto) {
        return res.status(404).json({ error: `Producto ${item.id_producto} no encontrado` });
      }
      if (producto.stock < item.cantidad) {
        return res.status(409).json({
          error: `Stock insuficiente para ${producto.nombre} (disponible: ${producto.stock})`,
        });
      }
      itemsPedido.push({
        id_producto: producto.id_producto,
        nombre: producto.nombre,
        precio_unitario: producto.precio,
        cantidad: item.cantidad,
      });
      total += producto.precio * item.cantidad;
    }

    // Descontar stock (Gestion de Inventario: actualizacion automatica tras cada venta)
    for (const item of itemsPedido) {
      await Producto.updateOne(
        { id_producto: item.id_producto },
        { $inc: { stock: -item.cantidad } }
      );
    }

    const numero_factura = await siguienteNumero('factura');

    const nuevoPedido = new Pedido({
      numero_factura,
      cliente: {
        id_cliente: cliente.id_cliente,
        nombre: cliente.nombre,
        dni: cliente.dni || '',
        correo: cliente.correo,
        telefono: cliente.telefono,
        direccion: cliente.direccion,
      },
      productos: itemsPedido,
      total,
      estado: 'pendiente',
    });

    await nuevoPedido.save();
    res.status(201).json(nuevoPedido);
  } catch (err) {
    res.status(400).json({ error: 'Error al crear el pedido', detalle: err.message });
  }
});

// PATCH /api/pedidos/:id/estado - actualizar el estado (pendiente, enviado, entregado, cancelado)
router.patch('/:id/estado', async (req, res) => {
  try {
    const { estado } = req.body;
    const estadosValidos = ['pendiente', 'enviado', 'entregado', 'cancelado'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: `Estado invalido. Use uno de: ${estadosValidos.join(', ')}` });
    }

    const pedido = await Pedido.findByIdAndUpdate(
      req.params.id,
      { estado },
      { new: true, runValidators: true }
    );
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(pedido);
  } catch (err) {
    res.status(400).json({ error: 'Error al actualizar el estado', detalle: err.message });
  }
});

// DELETE /api/pedidos/:id
router.delete('/:id', async (req, res) => {
  try {
    const pedido = await Pedido.findByIdAndDelete(req.params.id);
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json({ mensaje: 'Pedido eliminado', pedido });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar el pedido', detalle: err.message });
  }
});

// GET /api/pedidos/:id/factura - genera y devuelve el PDF de la factura
router.get('/:id/factura', async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id);
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    generarFacturaPDF(pedido, res);
  } catch (err) {
    res.status(500).json({ error: 'Error al generar la factura', detalle: err.message });
  }
});

module.exports = router;
