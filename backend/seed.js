require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const Producto = require('./models/Producto');
const Cliente = require('./models/Cliente');
const Pedido = require('./models/Pedido');
const Usuario = require('./models/Usuario');
const { Counter, siguienteNumero } = require('./models/Counter');

const productos = [
  { id_producto: 'F001', nombre: 'Taladro Percutor Bosch 1/2"', descripcion: '650W, incluye maletín', precio: 160000, stock: 12, categoria: 'Herramientas Electricas' },
  { id_producto: 'F002', nombre: 'Martillo de Carpintero 16oz', descripcion: 'Mango de fibra de vidrio', precio: 28000, stock: 30, categoria: 'Herramientas Manuales' },
  { id_producto: 'F003', nombre: 'Bolsa de Cemento 25kg', descripcion: 'Cemento Avellaneda', precio: 8900, stock: 80, categoria: 'Materiales de Construccion' },
  { id_producto: 'F004', nombre: 'Cable Electrico 2.5mm (rollo x 100m)', descripcion: 'Cable unipolar THHN', precio: 40000, stock: 18, categoria: 'Electricidad' },
  { id_producto: 'F005', nombre: 'Caño PVC 1/2" x 4m', descripcion: 'Para instalaciones de agua fría', precio: 26000, stock: 60, categoria: 'Plomeria' },
  { id_producto: 'F006', nombre: 'Pintura Latex Interior 4L', descripcion: 'Blanco mate, lavable', precio: 170000, stock: 25, categoria: 'Pintura' },
  { id_producto: 'F007', nombre: 'Casco de Seguridad', descripcion: 'Ajustable, certificado', precio: 40000, stock: 40, categoria: 'Seguridad e Higiene' },
  { id_producto: 'F008', nombre: 'Caja Tornillos Autoperforantes (x100)', descripcion: '1 1/4", punta broca', precio: 11000, stock: 100, categoria: 'Tornillos y Fijaciones' },
  { id_producto: 'F009', nombre: 'Amoladora Angular 4.5"', descripcion: '750W, incluye disco de corte', precio: 65000, stock: 14, categoria: 'Herramientas Electricas' },
  { id_producto: 'F010', nombre: 'Destornillador Set x6', descripcion: 'Planos y phillips, mango ergonómico', precio: 42000, stock: 35, categoria: 'Herramientas Manuales' },
];

const clientes = [
  { id_cliente: 'C001', nombre: 'Roberto Fernandez', dni: '28456123', correo: 'roberto@example.com', telefono: '3811234567', direccion: 'Ruta 9 Km 12' },
  { id_cliente: 'C002', nombre: 'Constructora Del Valle SRL', dni: '30789456', correo: 'compras@delvalle.com', telefono: '3819876543', direccion: 'Parque Industrial, Lote 4' },
];

// Pedidos de ejemplo distribuidos en distintos meses, para que el grafico
// de ventas del panel de informes tenga datos de sobra para mostrar.
const pedidosEjemplo = [
  { cliente: 'C001', items: [['F001', 1], ['F008', 2]], mesesAtras: 3, estado: 'entregado' },
  { cliente: 'C002', items: [['F003', 10], ['F004', 2]], mesesAtras: 3, estado: 'entregado' },
  { cliente: 'C001', items: [['F002', 3], ['F010', 1]], mesesAtras: 2, estado: 'entregado' },
  { cliente: 'C002', items: [['F005', 8], ['F006', 4]], mesesAtras: 2, estado: 'enviado' },
  { cliente: 'C001', items: [['F009', 1]], mesesAtras: 1, estado: 'entregado' },
  { cliente: 'C002', items: [['F007', 6], ['F008', 5]], mesesAtras: 1, estado: 'pendiente' },
  { cliente: 'C001', items: [['F006', 2], ['F002', 1]], mesesAtras: 0, estado: 'pendiente' },
];

async function seed() {
  await connectDB();

  await Promise.all([
    Producto.deleteMany({}),
    Cliente.deleteMany({}),
    Pedido.deleteMany({}),
    Counter.deleteMany({}),
  ]);

  const productosInsertados = await Producto.insertMany(productos);
  await Cliente.insertMany(clientes);

  const productosPorId = Object.fromEntries(productosInsertados.map((p) => [p.id_producto, p]));
  const clientesGuardados = await Cliente.find();
  const clientesPorId = Object.fromEntries(clientesGuardados.map((c) => [c.id_cliente, c]));

  for (const ejemplo of pedidosEjemplo) {
    const cliente = clientesPorId[ejemplo.cliente];
    const itemsPedido = ejemplo.items.map(([id_producto, cantidad]) => {
      const producto = productosPorId[id_producto];
      return {
        id_producto: producto.id_producto,
        nombre: producto.nombre,
        precio_unitario: producto.precio,
        cantidad,
      };
    });
    const total = itemsPedido.reduce((acc, it) => acc + it.precio_unitario * it.cantidad, 0);

    const fecha = new Date();
    fecha.setMonth(fecha.getMonth() - ejemplo.mesesAtras);

    await Pedido.create({
      numero_factura: await siguienteNumero('factura'),
      cliente: {
        id_cliente: cliente.id_cliente,
        nombre: cliente.nombre,
        dni: cliente.dni,
        correo: cliente.correo,
        telefono: cliente.telefono,
        direccion: cliente.direccion,
      },
      productos: itemsPedido,
      estado: ejemplo.estado,
      total,
      fecha_pedido: fecha,
    });
  }

  // Usuario administrador por defecto (no se borra en cada seed para no perder
  // la contraseña si ya fue cambiada desde el perfil).
  const existeAdmin = await Usuario.findOne({ username: 'admin' });
  if (!existeAdmin) {
    await Usuario.create({
      username: 'admin',
      nombre: 'Administrador',
      correo: 'admin@ferrostock.local',
      passwordHash: await bcrypt.hash('admin123', 10),
      rol: 'admin',
    });
    console.log('Usuario administrador creado -> usuario: admin / contraseña: admin123');
  } else {
    console.log('El usuario administrador ya existía, no se modificó.');
  }

  console.log('Datos de ejemplo insertados correctamente.');
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
