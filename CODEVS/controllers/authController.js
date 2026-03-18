const Usuario = require('../models/usuario');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Registro de nuevo usuario
function registro(req, res) {
    const { nombre, email, password, rol } = req.body;

    // Validar que todos los campos estén presentes
    if (!nombre || !email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Todos los campos son obligatorios' 
        });
    }

    // Encriptar contraseña
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const usuario = new Usuario({
        nombre: nombre,
        email: email,
        password: passwordHash,
        rol: rol || 'vendedor'
    });

    usuario.save()
        .then(usuarioGuardado => {
            res.status(201).json({
                success: true,
                message: 'Usuario registrado exitosamente',
                usuario: {
                    id: usuarioGuardado._id,
                    nombre: usuarioGuardado.nombre,
                    email: usuarioGuardado.email,
                    rol: usuarioGuardado.rol
                }
            });
        })
        .catch(err => {
            if (err.code === 11000) {
                res.status(400).json({ 
                    success: false, 
                    message: 'El email ya está registrado' 
                });
            } else {
                res.status(500).json({ 
                    success: false, 
                    message: 'Error al registrar usuario', 
                    error: err.message 
                });
            }
        });
}

// Inicio de sesión
function login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Email y contraseña son obligatorios' 
        });
    }

    Usuario.findOne({ email: email })
        .then(usuario => {
            if (!usuario) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Credenciales inválidas' 
                });
            }

            // Verificar contraseña
            const passwordValida = bcrypt.compareSync(password, usuario.password);
            if (!passwordValida) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Credenciales inválidas' 
                });
            }

            // Crear token JWT
            const token = jwt.sign(
                { 
                    id: usuario._id, 
                    email: usuario.email, 
                    rol: usuario.rol 
                },
                process.env.JWT_SECRET || 'secreto_temporal',
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            res.json({
                success: true,
                message: 'Login exitoso',
                token: token,
                usuario: {
                    id: usuario._id,
                    nombre: usuario.nombre,
                    email: usuario.email,
                    rol: usuario.rol
                }
            });
        })
        .catch(err => res.status(500).json({ 
            success: false, 
            message: 'Error en el servidor', 
            error: err.message 
        }));
}

// Obtener perfil del usuario autenticado
function obtenerPerfil(req, res) {
    const usuarioId = req.usuario.id;

    Usuario.findById(usuarioId)
        .select('-password') // Excluir la contraseña
        .then(usuario => {
            if (!usuario) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Usuario no encontrado' 
                });
            }
            res.json({
                success: true,
                usuario: usuario
            });
        })
        .catch(err => res.status(500).json({ 
            success: false, 
            message: 'Error al obtener perfil', 
            error: err.message 
        }));
}

// Actualizar perfil
function actualizarPerfil(req, res) {
    const usuarioId = req.usuario.id;
    const { nombre, email } = req.body;

    Usuario.findByIdAndUpdate(
        usuarioId,
        {
            nombre: nombre,
            email: email
        },
        { new: true, runValidators: true }
    )
        .select('-password')
        .then(usuario => {
            if (!usuario) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Usuario no encontrado' 
                });
            }
            res.json({
                success: true,
                message: 'Perfil actualizado',
                usuario: usuario
            });
        })
        .catch(err => res.status(500).json({ 
            success: false, 
            message: 'Error al actualizar perfil', 
            error: err.message 
        }));
}

// Listar todos los usuarios (solo admin)
function listarUsuarios(req, res) {
    Usuario.find({})
        .select('-password')
        .then(usuarios => {
            if (usuarios.length) {
                res.json({
                    success: true,
                    usuarios: usuarios
                });
            } else {
                res.status(204).json({ 
                    success: true, 
                    message: 'No hay usuarios registrados' 
                });
            }
        })
        .catch(err => res.status(500).json({ 
            success: false, 
            message: 'Error al listar usuarios', 
            error: err.message 
        }));
}

// Cambiar rol de usuario (solo admin)
function cambiarRol(req, res) {
    const id = req.params.id;
    const { rol } = req.body;

    Usuario.findByIdAndUpdate(
        id,
        { rol: rol },
        { new: true }
    )
        .select('-password')
        .then(usuario => {
            if (!usuario) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Usuario no encontrado' 
                });
            }
            res.json({
                success: true,
                message: 'Rol actualizado',
                usuario: usuario
            });
        })
        .catch(err => res.status(500).json({ 
            success: false, 
            message: 'Error al cambiar rol', 
            error: err.message 
        }));
}

// Eliminar usuario (solo admin)
function eliminarUsuario(req, res) {
    const id = req.params.id;

    Usuario.findByIdAndDelete(id)
        .then(usuario => {
            if (!usuario) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Usuario no encontrado' 
                });
            }
            res.json({
                success: true,
                message: 'Usuario eliminado exitosamente'
            });
        })
        .catch(err => res.status(500).json({ 
            success: false, 
            message: 'Error al eliminar usuario', 
            error: err.message 
        }));
}

module.exports = {
    registro,
    login,
    obtenerPerfil,
    actualizarPerfil,
    listarUsuarios,
    cambiarRol,
    eliminarUsuario
};