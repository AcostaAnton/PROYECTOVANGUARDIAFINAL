const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productoSchema = new Schema({
    nombre: { 
        type: String, 
        required: [true, 'El nombre del producto es obligatorio'],
        trim: true 
    },
    sku: { 
        type: String, 
        required: [true, 'El SKU es obligatorio'],
        unique: true,
        uppercase: true,
        trim: true
    },
    descripcion: { 
        type: String,
        trim: true
    },
    precioBase: { 
        type: Number, 
        required: [true, 'El precio base es obligatorio'],
        min: [0, 'El precio no puede ser negativo']
    },
    precioActual: { 
        type: Number, 
        required: true,
        default: function() {
            return this.precioBase;
        }
    },
    stock: { 
        type: Number, 
        required: true,
        min: [0, 'El stock no puede ser negativo'],
        default: 0
    },
    categoria: {
        type: String,
        trim: true
    },
    proveedor: {
        type: String,
        trim: true
    },
    fechaCreacion: { 
        type: Date, 
        default: Date.now 
    },
    ultimaActualizacion: { 
        type: Date, 
        default: Date.now 
    },
    activo: {
        type: Boolean,
        default: true
    }
}, { versionKey: false });


const Productos = mongoose.model('producto', productoSchema);
module.exports = Productos;