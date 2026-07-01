function notFound(req, res, next) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: 'Error interno del servidor', detalle: err.message });
}

module.exports = { notFound, errorHandler };
