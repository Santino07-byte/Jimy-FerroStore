const mongoose = require('mongoose');

const ProductoPedidoSchema = new mongoose.Schema(
  {
    id_producto: { type: String, required: true },
    nombre: { type: String, required: true },
    precio_unitario: { type: Number, required: true, min: 0 },
    cantidad: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const ClienteSnapshotSchema = new mongoose.Schema(
  {
    id_cliente: { type: String, required: true },
    nombre: { type: String, required: true },
    dni: { type: String, default: '' },
    correo: { type: String, required: true },
    telefono: { type: String },
    direccion: { type: String },
  },
  { _id: false }
);

const PedidoSchema = new mongoose.Schema(
  {
    numero_factura: { type: Number, required: true, unique: true },
    cliente: { type: ClienteSnapshotSchema, required: true },
    productos: {
      type: [ProductoPedidoSchema],
      required: true,
      validate: (v) => Array.isArray(v) && v.length > 0,
    },
    fecha_pedido: { type: Date, default: Date.now },
    estado: {
      type: String,
      enum: ['pendiente', 'enviado', 'entregado', 'cancelado'],
      default: 'pendiente',
    },
    total: { type: Number, required: true, min: 0 },
  },
  { timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' } }
);

module.exports = mongoose.model('Pedido', PedidoSchema);
