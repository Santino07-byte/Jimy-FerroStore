require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { verificarToken } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const productosRoutes = require('./routes/productos');
const clientesRoutes = require('./routes/clientes');
const pedidosRoutes = require('./routes/pedidos');
const informesRoutes = require('./routes/informes');

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/salud', (req, res) => res.json({ estado: 'ok', servicio: 'tienda-virtual-backend' }));

// Autenticacion (publica: login. El resto de sus rutas ya exigen token adentro)
app.use('/api/auth', authRoutes);

// API protegida: requiere sesion iniciada (token JWT)
app.use('/api/productos', verificarToken, productosRoutes);
app.use('/api/clientes', verificarToken, clientesRoutes);
app.use('/api/pedidos', verificarToken, pedidosRoutes);
app.use('/api/informes', verificarToken, informesRoutes);

// Sirve el frontend estatico (../frontend) para no depender de un segundo servidor
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor en el puerto ${PORT}`));
