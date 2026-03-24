const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ventaSchema = new Schema({
    producto: { 
        type: Schema.Types.ObjectId, 
        ref: 'producto',  
        required: true 
    },
    nombreProducto: {      
        type: String,
        required: true
    },
    skuProducto: {         
        type: String,
        required: true
    },
    cantidad: { 
        type: Number, 
        required: true,
        min: [1, 'La cantidad debe ser al menos 1']
    },
    precioUnitario: {      
        type: Number, 
        required: true
    },
    precioTotal: {         
        type: Number, 
        required: true
    },
    usuario: {             
        type: Schema.Types.ObjectId, 
        ref: 'usuario',
        required: true
    },
    fechaVenta: { 
        type: Date, 
        default: Date.now,
        required: true
    },
    metodoPago: {
        type: String,
        enum: ['efectivo', 'tarjeta', 'transferencia', 'otro'],
        default: 'efectivo'
    },
    observaciones: {
        type: String,
        trim: true
    }
}, 
{versionKey: false});

ventaSchema.index({ fechaVenta: -1 });

const Ventas = mongoose.model('venta', ventaSchema);
module.exports = Ventas;