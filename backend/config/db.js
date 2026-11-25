const mongoose = require('mongoose');

const conectarDB = async () => { 
  try { 
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/zenspacebd';
    console.log(`Intentando conectar a MongoDB en: ${uri}...`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000, // Atlas necesita más tiempo que local
      connectTimeoutMS: 10000
    });
    console.log(' Conectado exitosamente a MongoDB - ZenSpace');
  } catch (error) {
    console.error(' Error detallado de conexión a MongoDB:', error.message);
    throw error;
  }
};

module.exports = conectarDB;