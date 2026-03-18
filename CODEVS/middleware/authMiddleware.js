const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Acceso denegado. Token no proporcionado.' 
            });
        }

        const verified = jwt.verify(token, process.env.JWT_SECRET || 'secreto_temporal');
        req.usuario = verified;
        next();
    } catch (error) {
        res.status(401).json({ 
            success: false, 
            message: 'Token inválido o expirado' 
        });
    }
};

const verificarRol = (rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({ 
                success: false, 
                message: 'No autenticado' 
            });
        }

        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes permiso para realizar esta acción' 
            });
        }

        next();
    };
};

module.exports = {
    verificarToken,
    verificarRol
};