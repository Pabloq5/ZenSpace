const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  correo: { type: String, required: true, unique: true },
  contraseña: { type: String, required: true },
  fecha_ingreso: { type: Date, default: Date.now },
  puntos_zen: { type: Number, default: 0 }
}, {
  timestamps: true
});

module.exports = mongoose.model('Usuario', usuarioSchema);