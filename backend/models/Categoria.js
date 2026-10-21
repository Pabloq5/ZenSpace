const mongoose = require('mongoose');

const categoriaSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  descripcion: { type: String, trim: true }
}, { 
  timestamps: true // Esto crea automáticamente 'createdAt' y 'updatedAt'
});

module.exports = mongoose.model('Categoria', categoriaSchema);