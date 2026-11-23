const mongoose = require('mongoose');
const Categoria = require('../models/Categoria');
const Producto = require('../models/Producto');

const categoriasIniciales = [
  { nombre: 'Sala', descripcion: 'Mobiliario y decoración para salas de estar estilo Japandi' },
  { nombre: 'Dormitorio', descripcion: 'Camas, mesas de noche y complementos para el descanso' },
  { nombre: 'Iluminación', descripcion: 'Lámparas cálidas y difusas de papel, bambú y madera' },
  { nombre: 'Decoración', descripcion: 'Accesorios, jarrones y adornos con filosofía Wabi-Sabi' },
  { nombre: 'Comedor', descripcion: 'Mesas, asientos y vajilla para compartir en armonía' }
];

const productosIniciales = [
  {
    nombre: 'Silla Ergonómica Japandi',
    descripcion: 'Silla ergonómica diseñada con líneas limpias de madera clara y tapizado en lino natural. Brinda comodidad y soporte para largas jornadas de trabajo o descanso en armonía.',
    precio: 199.99,
    stock: 15,
    estado: true,
    imagen_url: 'images/silla.png',
    categoriaNombre: 'Sala'
  },
  {
    nombre: 'Mesa de Comedor Zen',
    descripcion: 'Mesa de comedor amplia de roble macizo con acabado al aceite natural. Ideal para compartir reuniones familiares con serenidad y estilo Wabi-Sabi.',
    precio: 299.99,
    stock: 8,
    estado: true,
    imagen_url: 'images/comedor.png',
    categoriaNombre: 'Comedor'
  },
  {
    nombre: 'Adornos Decorativos Modernos',
    descripcion: 'Set de jarrones de cerámica texturizada y formas orgánicas artesanales. El complemento perfecto para equilibrar cualquier estancia.',
    precio: 79.99,
    stock: 25,
    estado: true,
    imagen_url: 'images/adornos.png',
    categoriaNombre: 'Decoración'
  },
  {
    nombre: 'Organizador de Baño Wabi',
    descripcion: 'Organizador práctico en bambú y resina mate resistente a la humedad. Optimiza el espacio de tu baño manteniendo una sensación de orden y calma.',
    precio: 149.99,
    stock: 12,
    estado: true,
    imagen_url: 'images/aseo.png',
    categoriaNombre: 'Decoración'
  },
  {
    nombre: 'Lámpara de Pie Akari',
    descripcion: 'Lámpara de pie con pantalla difusa inspirada en papel washi y estructura de bambú oscuro. Emite una luz cálida y acogedora para cualquier espacio.',
    precio: 89.99,
    stock: 18,
    estado: true,
    imagen_url: 'images/lampara.png',
    categoriaNombre: 'Iluminación'
  },
  {
    nombre: 'Horno Microondas Minimalista',
    descripcion: 'Calienta, cocina y descongela tus alimentos de forma rápida y uniforme. Panel digital táctil y diseño sobrio y compacto en negro mate.',
    precio: 219.99,
    stock: 10,
    estado: true,
    imagen_url: 'images/microondas.png',
    categoriaNombre: 'Comedor'
  },
  {
    nombre: 'Mesa de Noche Nórdica',
    descripcion: 'Mesa de noche funcional con amplio espacio de almacenamiento y gaveta silenciosa. Fabricada en madera natural tratada para complementar dormitorios Japandi.',
    precio: 149.99,
    stock: 14,
    estado: true,
    imagen_url: 'images/mesa_noche.png',
    categoriaNombre: 'Dormitorio'
  }
];

async function seedDB() {
  try {
    const totalProductos = await Producto.countDocuments();
    if (totalProductos > 0) {
      console.log(`La base de datos ya cuenta con ${totalProductos} productos.`);
      return;
    }

    console.log('Sembrando categorías y productos iniciales en MongoDB...');

    // Mapa de categorías
    const catMap = {};
    for (const cat of categoriasIniciales) {
      let doc = await Categoria.findOne({ nombre: cat.nombre });
      if (!doc) {
        doc = await Categoria.create(cat);
      }
      catMap[cat.nombre] = doc._id;
    }

    // Insertar productos
    for (const prod of productosIniciales) {
      const catId = catMap[prod.categoriaNombre] || Object.values(catMap)[0];
      await Producto.create({
        nombre: prod.nombre,
        descripcion: prod.descripcion,
        precio: prod.precio,
        stock: prod.stock,
        estado: prod.estado,
        imagen_url: prod.imagen_url,
        categoria: catId
      });
    }

    console.log(` Se han insertado ${productosIniciales.length} productos iniciales en ZenSpace.`);
  } catch (error) {
    console.error('Error al sembrar la base de datos:', error.message);
  }
}

module.exports = seedDB;
