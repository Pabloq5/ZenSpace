const mongoose = require('mongoose');

const itemCarritoSchema = new mongoose.Schema({
  producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto' },
  nombre: { type: String, required: true },
  precio: { type: Number, required: true },
  imagen: { type: String },
  categoria: { type: String },
  cantidad: { type: Number, required: true, default: 1, min: 1 }
});

const carritoSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, unique: true },
  items: [itemCarritoSchema]
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Carrito', carritoSchema);
