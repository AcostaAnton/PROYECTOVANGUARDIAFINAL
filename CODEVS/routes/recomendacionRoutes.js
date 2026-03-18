const express = require('express');
const router = express.Router();

const recomendacionController = require('../controllers/recomendacionController');
const { verificarToken } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// IMPORTANTE: Las rutas específicas van ANTES que las rutas con parámetros
router.post('/generar/todos', recomendacionController.generarTodas);
router.get('/dashboard/resumen', recomendacionController.resumenDashboard);
router.get('/estadisticas', recomendacionController.estadisticasRecomendaciones);

// Rutas con parámetros (van después)
router.get('/', recomendacionController.listar);
router.get('/producto/:productoId', recomendacionController.porProducto);
router.post('/generar/:productoId', recomendacionController.generarRecomendacion);
router.put('/aplicar/:recomendacionId', recomendacionController.aplicarRecomendacion);
router.post('/simular/:productoId', recomendacionController.simularPrecio);
router.get('/simulaciones/:productoId', recomendacionController.verSimulaciones);

module.exports = router;