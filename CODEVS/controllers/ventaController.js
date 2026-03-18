const Venta = require('../models/ventas');
const Producto = require('../models/productos');

// Crear nueva venta
function crear(req, res) {
    const { productoId, cantidad, metodoPago, observaciones } = req.body;
    const usuarioId = req.usuario.id;

    if (!productoId || !cantidad) {
        return res.status(400).json({ 
            success: false, 
            message: 'Producto y cantidad son obligatorios' 
        });
    }

    // Primero buscar el producto para obtener sus datos
    Producto.findById(productoId)
        .then(producto => {
            if (!producto) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Producto no encontrado' 
                });
            }

            if (producto.stock < cantidad) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Stock insuficiente' 
                });
            }

            // Crear la venta
            const venta = new Venta({
                producto: productoId,
                nombreProducto: producto.nombre,
                skuProducto: producto.sku,
                cantidad: cantidad,
                precioUnitario: producto.precioActual,
                precioTotal: cantidad * producto.precioActual,
                usuario: usuarioId,
                metodoPago: metodoPago || 'efectivo',
                observaciones: observaciones || ''
            });

            // Guardar venta y actualizar stock
            return venta.save()
                .then(ventaGuardada => {
                    // Actualizar stock del producto
                    return Producto.findByIdAndUpdate(
                        productoId,
                        { $inc: { stock: -cantidad } },
                        { new: true }
                    ).then(() => {
                        res.status(201).json({
                            success: true,
                            message: 'Venta registrada exitosamente',
                            venta: ventaGuardada
                        });
                    });
                });
        })
        .catch(err => res.status(500).json({ 
            success: false, 
            message: 'Error al registrar venta', 
            error: err.message 
        }));
}

// Listar todas las ventas
function listar(req, res) {
    Venta.find({})
        .populate('producto', 'nombre sku')
        .populate('usuario', 'nombre email')
        .sort({ fechaVenta: -1 }) // Más recientes primero
        .then(ventas => {
            if (ventas.length) {
                res.json({
                    success: true,
                    ventas: ventas
                });
            } else {
                res.status(204).json({ 
                    success: true, 
                    message: 'No hay ventas registradas' 
                });
            }
        })
        .catch(err => res.status(500).json({ 
            success: false, 
            message: 'Error al listar ventas', 
            error: err.message 
        }));
}

// Obtener venta por ID
function obtenerPorId(req, res) {
    const id = req.params.id;

    Venta.findById(id)
        .populate('producto')
        .populate('usuario', 'nombre email')
        .then(venta => {
            if (!venta) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Venta no encontrada' 
                });
            }
            res.json({
                success: true,
                venta: venta
            });
        })
        .catch(err => res.status(500).json({ 
            success: false, 
            message: 'Error al obtener venta', 
            error: err.message 
        }));
}

// Ventas por fecha
function porFecha(req, res) {
    const fecha = new Date(req.params.fecha);
    const fechaInicio = new Date(fecha.setHours(0, 0, 0, 0));
    const fechaFin = new Date(fecha.setHours(23, 59, 59, 999));

    Venta.find({
        fechaVenta: { $gte: fechaInicio, $lte: fechaFin }
    })
        .populate('producto', 'nombre sku')
        .populate('usuario', 'nombre')
        .then(ventas => {
            res.json({
                success: true,
                fecha: req.params.fecha,
                ventas: ventas
            });
        })
        .catch(err => res.status(500).json({ 
            success: false, 
            message: 'Error al filtrar por fecha', 
            error: err.message 
        }));
}

// Ventas por producto
function porProducto(req, res) {
    const productoId = req.params.productoId;

    Venta.find({ producto: productoId })
        .populate('usuario', 'nombre')
        .sort({ fechaVenta: -1 })
        .then(ventas => {
            res.json({
                success: true,
                ventas: ventas
            });
        })
        .catch(err => res.status(500).json({ 
            success: false, 
            message: 'Error al filtrar por producto', 
            error: err.message 
        }));
}

// Ventas por usuario
function porUsuario(req, res) {
    const usuarioId = req.params.usuarioId;

    Venta.find({ usuario: usuarioId })
        .populate('producto', 'nombre sku')
        .sort({ fechaVenta: -1 })
        .then(ventas => {
            res.json({
                success: true,
                ventas: ventas
            });
        })
        .catch(err => res.status(500).json({ 
            success: false, 
            message: 'Error al filtrar por usuario', 
            error: err.message 
        }));
}

// Ventas por rango de fechas
function porRangoFechas(req, res) {
    const { inicio, fin } = req.query;

    if (!inicio || !fin) {
        return res.status(400).json({ 
            success: false, 
            message: 'Fechas de inicio y fin son requeridas' 
        });
    }

    const fechaInicio = new Date(inicio);
    fechaInicio.setHours(0, 0, 0, 0);
    
    const fechaFin = new Date(fin);
    fechaFin.setHours(23, 59, 59, 999);

    Venta.find({
        fechaVenta: { $gte: fechaInicio, $lte: fechaFin }
    })
        .populate('producto', 'nombre sku')
        .populate('usuario', 'nombre')
        .sort({ fechaVenta: -1 })
        .then(ventas => {
            // Calcular totales
            const totalVentas = ventas.length;
            const ingresosTotales = ventas.reduce((sum, venta) => sum + venta.precioTotal, 0);

            res.json({
                success: true,
                rango: {
                    inicio: inicio,
                    fin: fin
                },
                resumen: {
                    totalVentas: totalVentas,
                    ingresosTotales: ingresosTotales,
                    promedioPorVenta: totalVentas > 0 ? ingresosTotales / totalVentas : 0
                },
                ventas: ventas
            });
        })
        .catch(err => res.status(500).json({ 
            success: false, 
            message: 'Error al filtrar por rango de fechas', 
            error: err.message 
        }));
}

// Reporte diario
function reporteDiario(req, res) {
    const hoy = new Date();
    const inicioDia = new Date(hoy.setHours(0, 0, 0, 0));
    const finDia = new Date(hoy.setHours(23, 59, 59, 999));

    Venta.find({
        fechaVenta: { $gte: inicioDia, $lte: finDia }
    })
        .then(ventas => {
            const totalVentas = ventas.length;
            const ingresosTotales = ventas.reduce((sum, venta) => sum + venta.precioTotal, 0);
            const ventasPorMetodo = ventas.reduce((acc, venta) => {
                acc[venta.metodoPago] = (acc[venta.metodoPago] || 0) + 1;
                return acc;
            }, {});

            res.json({
                success: true,
                fecha: new Date().toLocaleDateString(),
                resumen: {
                    totalVentas: totalVentas,
                    ingresosTotales: ingresosTotales,
                    promedioPorVenta: totalVentas > 0 ? ingresosTotales / totalVentas : 0,
                    ventasPorMetodo: ventasPorMetodo
                }
            });
        })
        .catch(err => res.status(500).json({ 
            success: false, 
            message: 'Error al generar reporte diario', 
            error: err.message 
        }));
}

// Reporte mensual
function reporteMensual(req, res) {
    const año = new Date().getFullYear();
    const mes = new Date().getMonth();

    const inicioMes = new Date(año, mes, 1);
    const finMes = new Date(año, mes + 1, 0, 23, 59, 59, 999);

    Venta.find({
        fechaVenta: { $gte: inicioMes, $lte: finMes }
    })
        .then(ventas => {
            const totalVentas = ventas.length;
            const ingresosTotales = ventas.reduce((sum, venta) => sum + venta.precioTotal, 0);
            
            // Agrupar por día
            const ventasPorDia = {};
            ventas.forEach(venta => {
                const dia = venta.fechaVenta.getDate();
                ventasPorDia[dia] = (ventasPorDia[dia] || 0) + 1;
            });

            res.json({
                success: true,
                mes: new Date().toLocaleString('default', { month: 'long' }),
                año: año,
                resumen: {
                    totalVentas: totalVentas,
                    ingresosTotales: ingresosTotales,
                    promedioPorVenta: totalVentas > 0 ? ingresosTotales / totalVentas : 0,
                    ventasPorDia: ventasPorDia
                }
            });
        })
        .catch(err => res.status(500).json({ 
            success: false, 
            message: 'Error al generar reporte mensual', 
            error: err.message 
        }));
}

// Actualizar venta (solo casos excepcionales)
function actualizar(req, res) {
    const id = req.params.id;
    const { cantidad, metodoPago, observaciones } = req.body;

    Venta.findById(id)
        .then(venta => {
            if (!venta) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Venta no encontrada' 
                });
            }

            // Si cambia la cantidad, ajustar stock
            if (cantidad && cantidad !== venta.cantidad) {
                const diferencia = cantidad - venta.cantidad;
                
                return Producto.findById(venta.producto)
                    .then(producto => {
                        if (producto.stock < diferencia) {
                            throw new Error('Stock insuficiente para actualizar la venta');
                        }
                        
                        return Producto.findByIdAndUpdate(
                            venta.producto,
                            { $inc: { stock: -diferencia } }
                        ).then(() => {
                            venta.cantidad = cantidad;
                            venta.precioTotal = cantidad * venta.precioUnitario;
                            if (metodoPago) venta.metodoPago = metodoPago;
                            if (observaciones !== undefined) venta.observaciones = observaciones;
                            
                            return venta.save();
                        });
                    });
            } else {
                if (metodoPago) venta.metodoPago = metodoPago;
                if (observaciones !== undefined) venta.observaciones = observaciones;
                return venta.save();
            }
        })
        .then(ventaActualizada => {
            res.json({
                success: true,
                message: 'Venta actualizada',
                venta: ventaActualizada
            });
        })
        .catch(err => res.status(500).json({ 
            success: false, 
            message: 'Error al actualizar venta', 
            error: err.message 
        }));
}

// Eliminar venta (anular)
function eliminar(req, res) {
    const id = req.params.id;

    Venta.findById(id)
        .then(venta => {
            if (!venta) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Venta no encontrada' 
                });
            }

            // Devolver stock al producto
            return Producto.findByIdAndUpdate(
                venta.producto,
                { $inc: { stock: venta.cantidad } }
            ).then(() => {
                return Venta.findByIdAndDelete(id);
            });
        })
        .then(() => {
            res.json({
                success: true,
                message: 'Venta anulada exitosamente'
            });
        })
        .catch(err => res.status(500).json({ 
            success: false, 
            message: 'Error al anular venta', 
            error: err.message 
        }));
}

module.exports = {
    crear,
    listar,
    obtenerPorId,
    actualizar,
    eliminar,
    porFecha,
    porProducto,
    porUsuario,
    porRangoFechas,
    reporteDiario,
    reporteMensual
};