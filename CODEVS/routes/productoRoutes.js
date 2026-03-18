const express = require('express');
const router = express.Router();

const productoController = require('../controllers/productoController');
const { verificarToken } = require('../middleware/authMiddleware');

// Todas las rutas de productos requieren autenticación
router.use(verificarToken);

// CRUD básico de productos
router.get('/', productoController.listar);          
router.get('/:id', productoController.obtenerPorId);  
router.post('/crear', productoController.crear);       
router.put('/editar/:id', productoController.actualizar); 
router.delete('/borrar/:id', productoController.eliminar); 

// Rutas adicionales para consultas específicas
router.get('/categoria/:categoria', productoController.porCategoria);
router.get('/stock/bajo', productoController.stockBajo);
router.get('/buscar/:termino', productoController.buscar);

module.exports = router;