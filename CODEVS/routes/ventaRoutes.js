const express = require('express');
const router = express.Router();

const ventaController = require('../controllers/ventaController');
const { verificarToken } = require('../middleware/authMiddleware');

// Todas las rutas de ventas requieren autenticación
router.use(verificarToken);

// Gestión de ventas
router.get('/', ventaController.listar);             
router.get('/:id', ventaController.obtenerPorId);     
router.post('/crear', ventaController.crear);         
router.put('/editar/:id', ventaController.actualizar); 
router.delete('/borrar/:id', ventaController.eliminar); 

// Reportes y filtros
router.get('/fecha/:fecha', ventaController.porFecha);
router.get('/producto/:productoId', ventaController.porProducto);
router.get('/usuario/:usuarioId', ventaController.porUsuario);
router.get('/rango/fechas', ventaController.porRangoFechas);
router.get('/reporte/diario', ventaController.reporteDiario);
router.get('/reporte/mensual', ventaController.reporteMensual);

module.exports = router;