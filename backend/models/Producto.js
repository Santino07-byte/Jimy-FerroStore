const mongoose = require('mongoose');

const ProductoSchema = new mongoose.Schema(
  {
    id_producto: { type: String, required: true, unique: true, trim: true },
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '' },
    precio: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    categoria: {
      type: String,
      required: true,
      enum: [
        'Herramientas Manuales',
        'Herramientas Electricas',
        'Materiales de Construccion',
        'Electricidad',
        'Plomeria',
        'Pintura',
        'Seguridad e Higiene',
        'Tornillos y Fijaciones',
        'Otros',
      ],
    },
  },
  { timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' } }
);

module.exports = mongoose.model('Producto', ProductoSchema);
