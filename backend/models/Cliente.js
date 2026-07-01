const mongoose = require('mongoose');

const ClienteSchema = new mongoose.Schema(
  {
    id_cliente: { type: String, required: true, unique: true, trim: true },
    nombre: { type: String, required: true, trim: true },
    dni: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^\d{7,9}$/, 'DNI invalido (debe tener entre 7 y 9 digitos)'],
    },
    correo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Correo invalido'],
    },
    telefono: { type: String, required: true, trim: true, unique: true },
    direccion: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' } }
);

module.exports = mongoose.model('Cliente', ClienteSchema);
