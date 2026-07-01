const mongoose = require('mongoose');

const UsuarioSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    nombre: { type: String, required: true, trim: true },
    correo: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    passwordHash: { type: String, required: true },
    rol: { type: String, enum: ['admin', 'usuario'], default: 'usuario' },
  },
  { timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' } }
);

// Nunca exponer el hash de la contraseña al convertir a JSON
UsuarioSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = mongoose.model('Usuario', UsuarioSchema);
