const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const usuarioSchema = new Schema({
    nombre: { 
        type: String, 
        required: [true, 'El nombre es obligatorio'],
        trim: true 
    },
    email: { 
        type: String, 
        required: [true, 'El email es obligatorio'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
    },
    password: { 
        type: String, 
        required: [true, 'La contraseña es obligatoria']
    },
    rol: { 
        type: String, 
        enum: ['admin', 'vendedor', 'dueño'],
        default: 'vendedor'
    },
    fechaRegistro: { 
        type: Date, 
        default: Date.now 
    },
    activo: {
        type: Boolean,
        default: true
    }
}, {versionKey: false});

const Usuarios = mongoose.model('usuario', usuarioSchema);
module.exports = Usuarios;