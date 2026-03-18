const Producto = require('../models/productos');

// Crear nuevo producto
async function crear(req, res) {
    console.log('📝 Intentando crear producto:', req.body);
    
    try {
        const { nombre, sku, descripcion, precioBase, stock, categoria, proveedor } = req.body;

        if (!nombre || !sku || !precioBase) {
            return res.status(400).json({ 
                success: false, 
                message: 'Nombre, SKU y precio base son obligatorios' 
            });
        }

        const skuMayusculas = sku.toUpperCase().trim();
        const precioBaseNum = Number(precioBase);
        const stockNum = Number(stock) || 0;

        if (isNaN(precioBaseNum) || precioBaseNum <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'El precio base debe ser un número válido mayor a 0' 
            });
        }

        const producto = new Producto({
            nombre: nombre.trim(),
            sku: skuMayusculas,
            descripcion: descripcion ? descripcion.trim() : '',
            precioBase: precioBaseNum,
            precioActual: precioBaseNum, // Asignado manualmente
            stock: stockNum,
            categoria: categoria ? categoria.trim() : '',
            proveedor: proveedor ? proveedor.trim() : '',
            ultimaActualizacion: Date.now() // Asignado manualmente
        });

        const productoGuardado = await producto.save();
        
        res.status(201).json({
            success: true,
            message: 'Producto creado exitosamente',
            producto: productoGuardado
        });

    } catch (err) {
        console.error('❌ Error al guardar:', err);
        
        if (err.code === 11000) {
            return res.status(400).json({ 
                success: false, 
                message: 'El SKU ya existe. Debe ser único.' 
            });
        }
        
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ 
                success: false, 
                message: 'Error de validación',
                errors: messages 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Error al crear producto', 
            error: err.message 
        });
    }
}

// Las demás funciones (listar, obtenerPorId, etc.) se mantienen igual
async function listar(req, res) {
    try {
        const productos = await Producto.find({ activo: true }).sort({ fechaCreacion: -1 });
        res.json({ success: true, productos: productos || [] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error al listar productos', error: err.message });
    }
}

async function obtenerPorId(req, res) {
    try {
        const id = req.params.id;
        const producto = await Producto.findById(id);
        if (!producto) return res.status(404).json({ success: false, message: 'Producto no encontrado' });
        res.json({ success: true, producto: producto });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error al obtener producto', error: err.message });
    }
}

async function actualizar(req, res) {
    try {
        const id = req.params.id;
        const { nombre, descripcion, precioBase, stock, categoria, proveedor } = req.body;

        const datosActualizar = {};
        if (nombre) datosActualizar.nombre = nombre.trim();
        if (descripcion !== undefined) datosActualizar.descripcion = descripcion.trim();
        if (precioBase) {
            const precioBaseNum = Number(precioBase);
            if (!isNaN(precioBaseNum) && precioBaseNum > 0) {
                datosActualizar.precioBase = precioBaseNum;
                datosActualizar.precioActual = precioBaseNum;
            }
        }
        if (stock !== undefined) datosActualizar.stock = Number(stock);
        if (categoria) datosActualizar.categoria = categoria.trim();
        if (proveedor) datosActualizar.proveedor = proveedor.trim();
        datosActualizar.ultimaActualizacion = Date.now();

        const producto = await Producto.findByIdAndUpdate(id, datosActualizar, { new: true, runValidators: true });
        if (!producto) return res.status(404).json({ success: false, message: 'Producto no encontrado' });
        res.json({ success: true, message: 'Producto actualizado', producto: producto });
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ success: false, message: 'El SKU ya existe' });
        res.status(500).json({ success: false, message: 'Error al actualizar producto', error: err.message });
    }
}

async function eliminar(req, res) {
    try {
        const id = req.params.id;
        const producto = await Producto.findByIdAndUpdate(id, { activo: false }, { new: true });
        if (!producto) return res.status(404).json({ success: false, message: 'Producto no encontrado' });
        res.json({ success: true, message: 'Producto eliminado exitosamente' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error al eliminar producto', error: err.message });
    }
}

async function porCategoria(req, res) {
    try {
        const categoria = req.params.categoria;
        const productos = await Producto.find({ categoria: { $regex: new RegExp(categoria, 'i') }, activo: true });
        res.json({ success: true, productos: productos });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error al buscar por categoría', error: err.message });
    }
}

async function stockBajo(req, res) {
    try {
        const limite = parseInt(req.query.limite) || 5;
        const productos = await Producto.find({ stock: { $lt: limite }, activo: true }).sort({ stock: 1 });
        res.json({ success: true, productos: productos });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error al buscar stock bajo', error: err.message });
    }
}

async function buscar(req, res) {
    try {
        const termino = req.params.termino;
        const productos = await Producto.find({
            $or: [
                { nombre: { $regex: termino, $options: 'i' } },
                { sku: { $regex: termino, $options: 'i' } },
                { categoria: { $regex: termino, $options: 'i' } }
            ],
            activo: true
        }).sort({ nombre: 1 });
        res.json({ success: true, productos: productos });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error en la búsqueda', error: err.message });
    }
}

module.exports = {
    crear,
    listar,
    obtenerPorId,
    actualizar,
    eliminar,
    porCategoria,
    stockBajo,
    buscar
};