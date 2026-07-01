const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  valor: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', CounterSchema);

// Devuelve el proximo numero correlativo para la clave dada (ej: 'factura'),
// incrementando el contador de forma atomica para evitar numeros repetidos.
async function siguienteNumero(clave) {
  const contador = await Counter.findByIdAndUpdate(
    clave,
    { $inc: { valor: 1 } },
    { new: true, upsert: true }
  );
  return contador.valor;
}

module.exports = { Counter, siguienteNumero };
