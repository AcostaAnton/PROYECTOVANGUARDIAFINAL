const Recomendacion = require('../models/recomendaciones');
const Producto = require('../models/productos');
const Venta = require('../models/ventas');

// Listar todas las recomendaciones activas
function listar(req, res) {
    Recomendacion.find({ 
        fechaExpiracion: { $gt: new Date() },
        aplicada: false 
    })
        .populate('producto', 'nombre sku precioActual stock')
        .sort({ fechaRecomendacion: -1 })
        .then(recomendaciones => {
            res.json({
                success: true,
                recomendaciones: recomendaciones || []
            });
        })
        .catch(err => res.status(500).json({ 
            success: false, 
            message: 'Error al listar recomendaciones', 
            error: err.message 
        }));
}

// Obtener recomendación por producto
function porProducto(req, res) {
    const productoId = req.params.productoId;

    Recomendacion.findOne({ 
        producto: productoId,
        fechaExpiracion: { $gt: new Date() }
    })
        .populate('producto')
        .then(recomendacion => {
            if (!recomendacion) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'No hay recomendación activa para este producto' 
                });
            }
            res.json({
                success: true,
                recomendacion: recomendacion
            });
        })
        .catch(err => res.status(500).json({ 
            success: false, 
            message: 'Error al obtener recomendación', 
            error: err.message 
        }));
}

// Generar recomendación para un producto específico
function generarRecomendacion(req, res) {
    const productoId = req.params.productoId;
    
    Producto.findById(productoId)
        .then(producto => {
            if (!producto) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Producto no encontrado' 
                });
            }

            let accion = 'mantener';
            let precioRecomendado = producto.precioActual;
            let porcentajeCambio = 0;

            if (producto.stock < 10) {
                accion = 'subir';
                precioRecomendado = producto.precioActual * 1.1;
                porcentajeCambio = 10;
            } else if (producto.stock > 50) {
                accion = 'bajar';
                precioRecomendado = producto.precioActual * 0.9;
                porcentajeCambio = -10;
            }

            return Recomendacion.findOneAndUpdate(
                { producto: productoId },
                {
                    producto: productoId,
                    nombreProducto: producto.nombre,
                    skuProducto: producto.sku,
                    precioActual: producto.precioActual,
                    precioRecomendado: Math.round(precioRecomendado * 100) / 100,
                    accionRecomendada: accion,
                    porcentajeCambio: porcentajeCambio,
                    metricasAnalisis: {
                        ventasUltimos7Dias: 0,
                        ventasUltimos30Dias: 0,
                        stockActual: producto.stock,
                        rotacionStock: 0,
                        demandaDiariaPromedio: 0,
                        precioPromedioVenta: producto.precioActual
                    },
                    fechaRecomendacion: new Date(),
                    fechaExpiracion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                },
                { upsert: true, new: true }
            );
        })
        .then(recomendacionGuardada => {
            res.json({
                success: true,
                message: 'Recomendación generada exitosamente',
                recomendacion: recomendacionGuardada
            });
        })
        .catch(err => {
            console.error('❌ Error al generar recomendación:', err);
            res.status(500).json({ 
                success: false, 
                message: 'Error al generar recomendación', 
                error: err.message 
            });
        });
}

// Generar recomendaciones para todos los productos
function generarTodas(req, res) {
    console.log('📝 Generando recomendaciones para todos los productos');
    
    Producto.find({ activo: true })
        .then(productos => {
            if (productos.length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'No hay productos para generar recomendaciones' 
                });
            }
            
            const promesas = productos.map(producto => {
                let accion = 'mantener';
                let precioRecomendado = producto.precioActual;
                let porcentajeCambio = 0;

                if (producto.stock < 10) {
                    accion = 'subir';
                    precioRecomendado = producto.precioActual * 1.1;
                    porcentajeCambio = 10;
                } else if (producto.stock > 50) {
                    accion = 'bajar';
                    precioRecomendado = producto.precioActual * 0.9;
                    porcentajeCambio = -10;
                }

                return Recomendacion.findOneAndUpdate(
                    { producto: producto._id },
                    {
                        producto: producto._id,
                        nombreProducto: producto.nombre,
                        skuProducto: producto.sku,
                        precioActual: producto.precioActual,
                        precioRecomendado: Math.round(precioRecomendado * 100) / 100,
                        accionRecomendada: accion,
                        porcentajeCambio: porcentajeCambio,
                        metricasAnalisis: {
                            ventasUltimos7Dias: 0,
                            ventasUltimos30Dias: 0,
                            stockActual: producto.stock,
                            rotacionStock: 0,
                            demandaDiariaPromedio: 0,
                            precioPromedioVenta: producto.precioActual
                        },
                        fechaRecomendacion: new Date(),
                        fechaExpiracion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    },
                    { upsert: true, new: true }
                );
            });

            return Promise.all(promesas);
        })
        .then(recomendaciones => {
            res.json({
                success: true,
                message: `✅ Recomendaciones generadas para ${recomendaciones.length} productos`,
                total: recomendaciones.length
            });
        })
        .catch(err => {
            console.error('❌ Error al generar recomendaciones:', err);
            res.status(500).json({ 
                success: false, 
                message: 'Error al generar recomendaciones', 
                error: err.message 
            });
        });
}

// Aplicar una recomendación
function aplicarRecomendacion(req, res) {
    const recomendacionId = req.params.recomendacionId;

    Recomendacion.findById(recomendacionId)
        .then(recomendacion => {
            if (!recomendacion) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Recomendación no encontrada' 
                });
            }

            return Producto.findByIdAndUpdate(
                recomendacion.producto,
                { 
                    precioActual: recomendacion.precioRecomendado,
                    ultimaActualizacion: Date.now()
                },
                { new: true }
            ).then(productoActualizado => {
                recomendacion.aplicada = true;
                return recomendacion.save().then(() => {
                    res.json({
                        success: true,
                        message: 'Precio actualizado según recomendación',
                        producto: productoActualizado
                    });
                });
            });
        })
        .catch(err => res.status(500).json({ 
            success: false, 
            message: 'Error al aplicar recomendación', 
            error: err.message 
        }));
}

// Simular un precio
function simularPrecio(req, res) {
    const productoId = req.params.productoId;
    const { precioSimulado } = req.body;

    if (!precioSimulado || precioSimulado <= 0) {
        return res.status(400).json({ 
            success: false, 
            message: 'Precio simulado inválido' 
        });
    }

    Producto.findById(productoId)
        .then(producto => {
            if (!producto) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Producto no encontrado' 
                });
            }

            const demandaEstimada = Math.round(100 * (producto.precioActual / precioSimulado));
            const ingresoProyectado = demandaEstimada * precioSimulado;
            const ingresoActual = 100 * producto.precioActual;
            const diferencia = ingresoProyectado - ingresoActual;
            const porcentajeDiferencia = ((diferencia / ingresoActual) * 100).toFixed(1);

            res.json({
                success: true,
                message: 'Simulación completada',
                simulacion: {
                    producto: {
                        id: producto._id,
                        nombre: producto.nombre,
                        precioActual: producto.precioActual
                    },
                    precioSimulado: precioSimulado,
                    demandaEstimada: demandaEstimada,
                    ingresoProyectado: ingresoProyectado,
                    ingresoActual: ingresoActual,
                    diferencia: diferencia,
                    porcentajeDiferencia: porcentajeDiferencia,
                    recomendacion: diferencia > 0 ? 'Aumentar precio' : (diferencia < 0 ? 'Disminuir precio' : 'Mantener precio')
                }
            });
        })
        .catch(err => res.status(500).json({ 
            success: false, 
            message: 'Error al simular precio', 
            error: err.message 
        }));
}

// Ver simulaciones guardadas
function verSimulaciones(req, res) {
    const productoId = req.params.productoId;

    Recomendacion.findOne({ producto: productoId })
        .select('simulaciones nombreProducto skuProducto')
        .then(recomendacion => {
            if (!recomendacion || !recomendacion.simulaciones || recomendacion.simulaciones.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'No hay simulaciones para este producto' 
                });
            }

            res.json({
                success: true,
                producto: {
                    nombre: recomendacion.nombreProducto,
                    sku: recomendacion.skuProducto
                },
                simulaciones: recomendacion.simulaciones.sort((a, b) => b.fechaSimulacion - a.fechaSimulacion)
            });
        })
        .catch(err => res.status(500).json({ 
            success: false, 
            message: 'Error al obtener simulaciones', 
            error: err.message 
        }));
}

// Resumen para dashboard
function resumenDashboard(req, res) {
    Promise.all([
        Recomendacion.countDocuments({ accionRecomendada: 'subir', fechaExpiracion: { $gt: new Date() } }),
        Recomendacion.countDocuments({ accionRecomendada: 'bajar', fechaExpiracion: { $gt: new Date() } }),
        Recomendacion.countDocuments({ accionRecomendada: 'mantener', fechaExpiracion: { $gt: new Date() } }),
        Producto.countDocuments({ activo: true })
    ])
        .then(([subir, bajar, mantener, totalProductos]) => {
            res.json({
                success: true,
                dashboard: {
                    recomendaciones: {
                        subir: subir,
                        bajar: bajar,
                        mantener: mantener,
                        total: subir + bajar + mantener
                    },
                    productos: {
                        total: totalProductos,
                        conRecomendacion: subir + bajar + mantener
                    }
                }
            });
        })
        .catch(err => res.status(500).json({ 
            success: false, 
            message: 'Error al obtener resumen', 
            error: err.message 
        }));
}

// Estadísticas de recomendaciones
function estadisticasRecomendaciones(req, res) {
    Recomendacion.aggregate([
        {
            $group: {
                _id: "$accionRecomendada",
                count: { $sum: 1 },
                promedioCambio: { $avg: "$porcentajeCambio" }
            }
        }
    ])
        .then(estadisticas => {
            res.json({
                success: true,
                estadisticas: estadisticas
            });
        })
        .catch(err => res.status(500).json({ 
            success: false, 
            message: 'Error al obtener estadísticas', 
            error: err.message 
        }));
}

module.exports = {
    listar,
    porProducto,
    generarRecomendacion,
    generarTodas,
    aplicarRecomendacion,
    simularPrecio,
    verSimulaciones,
    resumenDashboard,
    estadisticasRecomendaciones
};