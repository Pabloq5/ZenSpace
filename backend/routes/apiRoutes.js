const express = require('express');
const router = express.Router();

// Controladores y Modelos
const authCtrl = require('../controllers/authController');
const Producto = require('../models/Producto');
const Pedido = require('../models/Pedido');
const Categoria = require('../models/Categoria');
const Usuario = require('../models/Usuario');
const Carrito = require('../models/Carrito');

// ==========================================
// 1. AUTENTICACIÓN Y USUARIOS
// ==========================================
router.post('/auth/registro', authCtrl.registrar);
router.post('/auth/login', authCtrl.login);

router.get('/usuarios', async (req, res) => {
  try {
    const usuarios = await Usuario.find().select('-contraseña');
    res.json(usuarios);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/usuarios/:id/perfil', async (req, res) => {
  try {
const perfil = await Usuario.findById(req.params.id).select('-contraseña'); 
    if (!perfil) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(perfil);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/usuarios/:id', async (req, res) => {
  try {
    const { nombre, correo, avatar } = req.body;
    const camposActualizar = {};
    if (nombre !== undefined) camposActualizar.nombre = nombre;
    if (correo !== undefined) camposActualizar.correo = correo;
    if (avatar !== undefined) camposActualizar.avatar = avatar;

    const actualizado = await Usuario.findByIdAndUpdate(
      req.params.id, 
      camposActualizar, 
      { new: true, runValidators: true }
    ).select('-contraseña');
    res.json({ mensaje: 'Perfil actualizado', usuario: actualizado });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/usuarios/:id', async (req, res) => {
  try {
    await Usuario.findByIdAndDelete(req.params.id);
    await Carrito.findOneAndDelete({ usuario: req.params.id }); // Limpia su carrito
    res.json({ mensaje: 'Cuenta de usuario eliminada' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==========================================
// 2. CATEGORÍAS
// ==========================================
router.get('/categorias', async (req, res) => {
  try {
    const categorias = await Categoria.find(); 
    res.json(categorias);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/categorias/:id', async (req, res) => {
  try {
    const categoria = await Categoria.findById(req.params.id);
    if (!categoria) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json(categoria);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/categorias', async (req, res) => {
  try {
    const nuevaCategoria = await Categoria.create(req.body);
    res.status(201).json({ id: nuevaCategoria._id, mensaje: 'Categoría creada' });
  } catch (error) { res.status(500).json({ error: error.message }); }
}); 

router.delete('/categorias/:id', async (req, res) => {
  try {
    await Categoria.findByIdAndDelete(req.params.id);
    res.json({ mensaje: 'Categoría eliminada' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==========================================
// 3. PRODUCTOS / CATÁLOGO
// ==========================================
router.get('/productos', async (req, res) => {
  try {
    // .populate() es el equivalente de Mongoose para hacer un LEFT JOIN
    // Reemplaza el id_categoria por el objeto completo de la categoría
    const productos = await Producto.find().populate('categoria');
    res.json(productos);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/productos/:id', async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id).populate('categoria');
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(producto);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/productos', async (req, res) => {
  try {
    const nuevoProducto = await Producto.create(req.body);
    res.status(201).json({ id: nuevoProducto._id, mensaje: 'Producto creado exitosamente' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/productos/:id', async (req, res) => {
  try {
    const actualizado = await Producto.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('categoria');
    res.json({ mensaje: 'Producto modificado', producto: actualizado });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/productos/:id', async (req, res) => {
  try {
    await Producto.findByIdAndDelete(req.params.id);
    res.json({ mensaje: 'Producto eliminado' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});router.get('/pedidos', async (req, res) => {
  try { res.json(await Pedido.find().populate('usuario', 'nombre correo')); } 
  catch (error) { res.status(500).json({ error: error.message }); }
});

// ==========================================
// 4. PEDIDOS / CARRITO (La mayor simplificación)
// ==========================================
router.post('/pedidos', async (req, res) => {
  try {
    // ¡Adiós a las transacciones SQL complejas! 
    // Un solo .create() guarda el pedido, los items, el envío y el pago juntos.
    const nuevoPedido = await Pedido.create(req.body);
    res.status(201).json({ idPedido: nuevoPedido._id, mensaje: 'Pedido procesado correctamente' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/pedidos', async (req, res) => {
  try { res.json(await Pedido.find().populate('usuario', 'nombre correo')); } 
  catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/pedidos/usuario/:id', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.json([]);
    }
    const pedidos = await Pedido.find({ usuario: req.params.id }).sort({ createdAt: -1 });
    res.json(pedidos);
  } catch (error) { res.status(500).json({ error: error.message }); }
});



// ==========================================
// 5. ACTUALIZACIONES INTEGRADAS (Pagos y Envíos)
// ==========================================
// Como ya no hay tablas separadas, actualizamos propiedades del mismo Pedido

router.put('/pedidos/:id/pago', async (req, res) => {
  try {
    const { estado_pago, referencia } = req.body;
    // Actualizamos solo los campos anidados dentro del objeto "pago"
    await Pedido.findByIdAndUpdate(req.params.id, { 
      'pago.estado': estado_pago,
      'pago.referencia_epayco': referencia
    });
    res.json({ mensaje: 'Estado del pago actualizado' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/pedidos/:id/envio', async (req, res) => {
  try {
    const { estado_envio, numero_guia } = req.body;
    await Pedido.findByIdAndUpdate(req.params.id, { 
      'envio.estado': estado_envio,
      'envio.numero_guia': numero_guia,
      'envio.fecha_despacho': Date.now()
    });
    res.json({ mensaje: 'Información de envío actualizada' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==========================================
// 6. PUNTOS FIDELIDAD
// ==========================================
router.put('/puntos/sumar', async (req, res) => {
  try {
    const { id_usuario, puntos } = req.body;
    // $inc es un operador mágico de Mongo que incrementa un valor numérico
    await Usuario.findByIdAndUpdate(id_usuario, {
      $inc: { puntos_zen: puntos }
    });
    res.json({ mensaje: `Se sumaron ${puntos} puntos Zen al usuario` });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==========================================
// 7. CARRITO DE COMPRAS POR USUARIO
// ==========================================
router.get('/carrito/:idUsuario', async (req, res) => {
  try {
    let carrito = await Carrito.findOne({ usuario: req.params.idUsuario });
    if (!carrito) {
      carrito = await Carrito.create({ usuario: req.params.idUsuario, items: [] });
    }
    res.json(carrito);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/carrito/:idUsuario/agregar', async (req, res) => {
  try {
    const { nombre, precio, imagen, categoria, cantidad, producto } = req.body;
    let carrito = await Carrito.findOne({ usuario: req.params.idUsuario });
    if (!carrito) {
      carrito = await Carrito.create({ usuario: req.params.idUsuario, items: [] });
    }

    const itemIndex = carrito.items.findIndex(item => item.nombre === nombre);
    if (itemIndex > -1) {
      carrito.items[itemIndex].cantidad += (parseInt(cantidad) || 1);
    } else {
      carrito.items.push({
        producto,
        nombre,
        precio: parseFloat(precio) || 0,
        imagen,
        categoria,
        cantidad: parseInt(cantidad) || 1
      });
    }

    await carrito.save();
    res.json(carrito);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/carrito/:idUsuario/item', async (req, res) => {
  try {
    const { nombre, cantidad } = req.body;
    let carrito = await Carrito.findOne({ usuario: req.params.idUsuario });
    if (!carrito) return res.status(404).json({ error: 'Carrito no encontrado' });

    const itemIndex = carrito.items.findIndex(item => item.nombre === nombre);
    if (itemIndex > -1) {
      const nuevaCantidad = parseInt(cantidad);
      if (nuevaCantidad <= 0) {
        carrito.items.splice(itemIndex, 1);
      } else {
        carrito.items[itemIndex].cantidad = nuevaCantidad;
      }
      await carrito.save();
      return res.json(carrito);
    } else {
      return res.status(404).json({ error: 'Producto no encontrado en el carrito' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/carrito/:idUsuario/item/:nombre', async (req, res) => {
  try {
    let carrito = await Carrito.findOne({ usuario: req.params.idUsuario });
    if (!carrito) return res.status(404).json({ error: 'Carrito no encontrado' });

    const nombreDecodificado = decodeURIComponent(req.params.nombre);
    carrito.items = carrito.items.filter(item => item.nombre !== nombreDecodificado);
    await carrito.save();
    res.json(carrito);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/carrito/:idUsuario/vaciar', async (req, res) => {
  try {
    let carrito = await Carrito.findOne({ usuario: req.params.idUsuario });
    if (!carrito) {
      carrito = await Carrito.create({ usuario: req.params.idUsuario, items: [] });
    } else {
      carrito.items = [];
      await carrito.save();
    }
    res.json({ mensaje: 'Carrito vaciado exitosamente', carrito });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;