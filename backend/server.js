require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const conectarDB = require('./config/db');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Servir la interfaz del Cliente y Admin
app.use('/', express.static(path.join(__dirname, '../Cliente')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// Rutas de la API
app.use('/api', apiRoutes);

// Conectar a MongoDB y levantar servidor
const iniciarServidor = async () => {
  try {
    await conectarDB();
    app.listen(PORT, () => {
      console.log(` Servidor ZenSpace corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(' Error fatal al iniciar el servidor:', error.message);
  }
};

iniciarServidor();
