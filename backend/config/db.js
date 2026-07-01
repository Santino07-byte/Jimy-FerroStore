const mongoose = require('mongoose');
const dns = require('dns');

// Algunas redes (routers hogareños, redes de universidades, ciertos antivirus)
// bloquean o fallan al resolver las consultas DNS tipo SRV/TXT que necesita
// "mongodb+srv://". Forzamos a Node a usar el DNS publico de Google para
// evitar el error "querySrv ECONNREFUSED" en esos casos.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB conectado -> ${mongoose.connection.name}`);
  } catch (err) {
    console.error('Error al conectar a MongoDB:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
