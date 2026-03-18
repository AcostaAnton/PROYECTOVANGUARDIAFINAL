const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { verificarToken, verificarRol } = require('../middleware/authMiddleware');

// Rutas públicas
router.post('/registro', authController.registro);
router.post('/login', authController.login);

// Rutas protegidas 
router.get('/perfil', verificarToken, authController.obtenerPerfil);
router.put('/perfil', verificarToken, authController.actualizarPerfil);

// Rutas de administración 
router.get('/usuarios', verificarToken, verificarRol(['admin']), authController.listarUsuarios);
router.put('/usuario/:id/rol', verificarToken, verificarRol(['admin']), authController.cambiarRol);
router.delete('/usuario/:id', verificarToken, verificarRol(['admin']), authController.eliminarUsuario);

module.exports = router;