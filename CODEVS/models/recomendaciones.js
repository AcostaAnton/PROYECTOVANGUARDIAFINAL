const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const recomendacionSchema = new Schema({
    producto: { 
        type: Schema.Types.ObjectId, 
        ref: 'producto',
        required: true,
        unique: true  
    },
    nombreProducto: {
        type: String,
        required: true
    },
    skuProducto: {
        type: String,
        required: true
    },
    precioActual: {
        type: Number,
        required: true
    },
    precioRecomendado: {
        type: Number,
        required: true
    },
    accionRecomendada: {
        type: String,
        enum: ['subir', 'bajar', 'mantener', 'sin_datos'],
        required: true
    },
    porcentajeCambio: {    
        type: Number,
        required: true
    },
    metricasAnalisis: {
        ventasUltimos7Dias: { type: Number, default: 0 },
        ventasUltimos30Dias: { type: Number, default: 0 },
        stockActual: { type: Number, default: 0 },
        rotacionStock: { type: Number, default: 0 },
        demandaDiariaPromedio: { type: Number, default: 0 },
        precioPromedioVenta: { type: Number, default: 0 }
    },
    simulaciones: [{
        precioSimulado: { type: Number, required: true },
        demandaEstimada: { type: Number, required: true },
        ingresoProyectado: { type: Number, required: true },
        fechaSimulacion: { type: Date, default: Date.now }
    }],
    fechaRecomendacion: { 
        type: Date, 
        default: Date.now,
        required: true
    },
    fechaExpiracion: {    
        type: Date,
        default: () => Date.now() + 7*24*60*60*1000  
    },
    aplicada: {            
        type: Boolean,
        default: false
    }
}, {versionKey: false});

recomendacionSchema.index({ fechaRecomendacion: -1 });
recomendacionSchema.index({ producto: 1 }, { unique: true });

const Recomendaciones = mongoose.model('recomendacion', recomendacionSchema);
module.exports = Recomendaciones;