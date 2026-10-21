const mongoose = require('mongoose');

const pedidoSchema = new mongoose.Schema({
  // Relacionamos el pedido con el usuario que lo compró
  usuario: { type: mongoose.Schema.Types.ObjectId,  ref: 'Usuario', required: true },
  
  // Reemplaza a la tabla "detalle_pedido" (incrustamos los productos en un arreglo)
  items: [{
    producto: { type: String, required: true }, // Ej: "Mesa de Comedor"
    cantidad: { type: Number, required: true, min: 1 },
    precio_unitario: { type: Number, required: true }
  }],
  
  total: { type: Number, required: true },
  
  // Reemplaza al modelo "Pago.js"
  pago: {
    metodo: { type: String, default: 'ePayco' },
    estado: { type: String, default: 'Pendiente' },
    referencia_epayco: { type: String }
  },

  // Reemplaza al modelo "Envio.js"
  envio: {
    estado: { type: String, default: 'Pendiente' }, // Pendiente, En camino, Entregado
    numero_guia: { type: String },
    fecha_despacho: { type: Date }
  }
}, { 
  timestamps: true 
});



module.exports = mongoose.model('Pedido', pedidoSchema);