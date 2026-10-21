const Usuario = require('../models/Usuario');
const bcrypt = require('bcryptjs'); // Mantenemos la librería que ya usabas
const jwt = require('jsonwebtoken'); // 1. Importamos JWT

const registrar = async (req, res) => {
  try {
    const nombre = req.body?.nombre;
    const correo = req.body?.correo;
    const contraseña = req.body?.contraseña || req.body?.password;

    if (!nombre || !correo || !contraseña) {
      return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' });
    }

    // 1. Verificar si el usuario ya existe
    const usuarioExistente = await Usuario.findOne({ correo });
    if (usuarioExistente) {
      return res.status(400).json({ error: 'El correo ya está registrado en ZenSpace' });
    }

    // 2. Encriptar la contraseña
    const salt = await bcrypt.genSalt(10);
    const contraseñaEncriptada = await bcrypt.hash(String(contraseña), salt);

    // 3. Crear y guardar el nuevo usuario en MongoDB
    const nuevoUsuario = await Usuario.create({
      nombre,
      correo,
      contraseña: contraseñaEncriptada
    });

    res.status(201).json({ 
      mensaje: 'Usuario registrado exitosamente',
      idUsuario: nuevoUsuario._id 
    });

  } catch (error) {
    console.error('❌ Error en authController.registrar:', error);
    res.status(500).json({ error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const correo = req.body?.correo;
    const password = req.body?.contraseña || req.body?.password;

    if (!correo || !password) {
      return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
    }

    // 1. Buscar al usuario
    const usuario = await Usuario.findOne({ correo });
    if (!usuario) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    // Validar que el usuario tenga hash de contraseña en la BD
    if (!usuario.contraseña) {
      return res.status(400).json({ 
        error: 'Este usuario no tiene contraseña guardada en BD. Por favor regístralo nuevamente.' 
      });
    }

    // 2. Verificar la contraseña
    const passwordValido = await bcrypt.compare(String(password), usuario.contraseña);
    if (!passwordValido) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    // 3. Generar token JWT
    const jwtSecret = process.env.JWT_SECRET || 'secreto_zenspace_123';
    const token = jwt.sign(
      { id: usuario._id, nombre: usuario.nombre }, 
      jwtSecret, 
      { expiresIn: '24h' }
    );

    // 4. Enviar respuesta con token y datos de usuario
    res.json({ 
      mensaje: 'Bienvenido de vuelta', 
      token: token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        puntos: usuario.puntos_zen
      }
    });

  } catch (error) {
    console.error('❌ Error en authController.login:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { registrar, login };