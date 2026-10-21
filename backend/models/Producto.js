const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: { type: String },
  precio: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  estado: { type: Boolean, default: true },
  imagen_url: { type: String }, // Ej: "./images/silla.png"
  
  // Apunta al ObjectId de la colección Categoria
  categoria: { type: mongoose.Schema.Types.ObjectId, ref: 'Categoria' } 
}, { timestamps: true });


module.exports = mongoose.model('Producto', productoSchema);