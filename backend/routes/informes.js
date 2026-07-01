const express = require('express');
const Pedido = require('../models/Pedido');
const router = express.Router();

// GET /api/informes/ventas-por-producto
router.get('/ventas-por-producto', async (req, res) => {
  try {
    const resultado = await Pedido.aggregate([
      { $unwind: '$productos' },
      {
        $group: {
          _id: '$productos.id_producto',
          nombre: { $first: '$productos.nombre' },
          totalUnidades: { $sum: '$productos.cantidad' },
          totalIngresos: { $sum: { $multiply: ['$productos.cantidad', '$productos.precio_unitario'] } },
        },
      },
      { $sort: { totalIngresos: -1 } },
    ]);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: 'Error al generar informe por producto', detalle: err.message });
  }
});

// GET /api/informes/ventas-por-categoria
router.get('/ventas-por-categoria', async (req, res) => {
  try {
    const resultado = await Pedido.aggregate([
      { $unwind: '$productos' },
      {
        $lookup: {
          from: 'productos',
          localField: 'productos.id_producto',
          foreignField: 'id_producto',
          as: 'infoProducto',
        },
      },
      { $unwind: { path: '$infoProducto', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$infoProducto.categoria', 'Sin categoria'] },
          totalUnidades: { $sum: '$productos.cantidad' },
          totalIngresos: { $sum: { $multiply: ['$productos.cantidad', '$productos.precio_unitario'] } },
        },
      },
      { $sort: { totalIngresos: -1 } },
    ]);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: 'Error al generar informe por categoria', detalle: err.message });
  }
});

// GET /api/informes/ventas-por-mes
router.get('/ventas-por-mes', async (req, res) => {
  try {
    const resultado = await Pedido.aggregate([
      {
        $group: {
          _id: { anio: { $year: '$fecha_pedido' }, mes: { $month: '$fecha_pedido' } },
          totalPedidos: { $sum: 1 },
          totalIngresos: { $sum: '$total' },
        },
      },
      { $sort: { '_id.anio': 1, '_id.mes': 1 } },
    ]);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: 'Error al generar informe por mes', detalle: err.message });
  }
});

// GET /api/informes/resumen - metricas generales para el dashboard
router.get('/resumen', async (req, res) => {
  try {
    const [resumen] = await Pedido.aggregate([
      {
        $group: {
          _id: null,
          totalPedidos: { $sum: 1 },
          totalIngresos: { $sum: '$total' },
          pendientes: { $sum: { $cond: [{ $eq: ['$estado', 'pendiente'] }, 1, 0] } },
          enviados: { $sum: { $cond: [{ $eq: ['$estado', 'enviado'] }, 1, 0] } },
          entregados: { $sum: { $cond: [{ $eq: ['$estado', 'entregado'] }, 1, 0] } },
        },
      },
    ]);
    res.json(
      resumen || { totalPedidos: 0, totalIngresos: 0, pendientes: 0, enviados: 0, entregados: 0 }
    );
  } catch (err) {
    res.status(500).json({ error: 'Error al generar resumen', detalle: err.message });
  }
});

module.exports = router;
