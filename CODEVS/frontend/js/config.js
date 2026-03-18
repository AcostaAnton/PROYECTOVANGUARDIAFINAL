const API = {
    BASE_URL: 'http://localhost:3000/api',
    
    AUTH: {
        LOGIN: '/auth/login',
        REGISTRO: '/auth/registro',
        PERFIL: '/auth/perfil'
    },
    
    PRODUCTOS: {
        BASE: '/productos',
        POR_CATEGORIA: (categoria) => `/productos/categoria/${categoria}`,
        STOCK_BAJO: '/productos/stock/bajo',
        BUSCAR: (termino) => `/productos/buscar/${termino}`
    },
    
    VENTAS: {
        BASE: '/ventas',
        POR_FECHA: (fecha) => `/ventas/fecha/${fecha}`,
        REPORTE_DIARIO: '/ventas/reporte/diario',
        REPORTE_MENSUAL: '/ventas/reporte/mensual'
    },
    
    RECOMENDACIONES: {
        BASE: '/recomendaciones',
        POR_PRODUCTO: (id) => `/recomendaciones/producto/${id}`,
        GENERAR: (id) => `/recomendaciones/generar/${id}`,
        GENERAR_TODAS: '/recomendaciones/generar/todos',
        APLICAR: (id) => `/recomendaciones/aplicar/${id}`,
        SIMULAR: (id) => `/recomendaciones/simular/${id}`,
        DASHBOARD: '/recomendaciones/dashboard/resumen'
    }
};

function getHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

async function handleResponse(response) {
    console.log('🔍 Status:', response.status);
    console.log('🔍 URL:', response.url);
    
    if (response.status === 204) {
        console.log('ℹ️ Respuesta 204 - devolviendo array vacío');
        return { success: true, data: [] };
    }
    
    const text = await response.text();
    console.log('🔍 Respuesta raw:', text);
    
    if (!text && response.ok) {
        return { success: true };
    }
    
    try {
        const data = JSON.parse(text);
        
        if (!response.ok) {
            throw new Error(data.message || `Error ${response.status}`);
        }
        
        return data;
    } catch (e) {
        if (e instanceof SyntaxError) {
            console.error('❌ JSON inválido:', text);
            if (response.ok) {
                return { success: true };
            }
        }
        throw e;
    }
}