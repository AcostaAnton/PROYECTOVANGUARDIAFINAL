// frontend/js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    cargarDashboard();
    
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = 'login.html';
    });
});

async function cargarDashboard() {
    try {
        // Cargar productos
        const productosRes = await fetch(`${API.BASE_URL}${API.PRODUCTOS.BASE}`, {
            headers: getHeaders()
        });
        const productosData = await handleResponse(productosRes);
        
        // Cargar recomendaciones
        const recomendacionesRes = await fetch(`${API.BASE_URL}${API.RECOMENDACIONES.BASE}`, {
            headers: getHeaders()
        });
        const recomendacionesData = await handleResponse(recomendacionesRes);
        
        // CAMBIO IMPORTANTE: Cargar TODAS las ventas, no solo las de hoy
        const ventasRes = await fetch(`${API.BASE_URL}${API.VENTAS.BASE}`, {
            headers: getHeaders()
        });
        const ventasData = await handleResponse(ventasRes);
        
        // Actualizar stats
        actualizarStats(
            productosData.productos || [],
            recomendacionesData.recomendaciones || [],
            ventasData.ventas || []  // Ahora pasa todas las ventas
        );
        
        // Mostrar recomendaciones por acción
        mostrarRecomendacionesPorAccion(recomendacionesData.recomendaciones || []);
        
        // Mostrar alertas de stock
        mostrarAlertasStock(productosData.productos || []);
        
        // Mostrar últimas recomendaciones
        mostrarUltimasRecomendaciones(recomendacionesData.recomendaciones || []);
        
    } catch (error) {
        console.error('Error en dashboard:', error);
    }
}

function actualizarStats(productos, recomendaciones, ventas) {
    document.getElementById('totalProductos').textContent = productos.length || 0;
    document.getElementById('totalRecomendaciones').textContent = recomendaciones.length || 0;
    // AHORA muestra TOTAL de ventas, no solo las de hoy
    document.getElementById('ventasHoy').textContent = ventas.length || 0;
}

function mostrarRecomendacionesPorAccion(recomendaciones) {
    const tbody = document.getElementById('recomendacionesPorAccion');
    
    if (!tbody) return;
    
    const conteo = {
        subir: 0, 
        bajar: 0, 
        mantener: 0
    };
    
    recomendaciones.forEach(rec => {
        if (conteo[rec.accionRecomendada] !== undefined) {
            conteo[rec.accionRecomendada]++;
        }
    });
    
    tbody.innerHTML = `
        <tr>
            <td><span class="badge badge-success">SUBIR</span></td>
            <td>${conteo.subir}</td>
            <td>-</td>
        </tr>
        <tr>
            <td><span class="badge badge-danger">BAJAR</span></td>
            <td>${conteo.bajar}</td>
            <td>-</td>
        </tr>
        <tr>
            <td><span class="badge badge-warning">MANTENER</span></td>
            <td>${conteo.mantener}</td>
            <td>-</td>
        </tr>
    `;
}

function mostrarAlertasStock(productos) {
    const tbody = document.getElementById('alertasStock');
    
    if (!tbody) return;
    
    // Filtrar productos con stock < 10
    const stockBajo = productos.filter(p => p.stock < 10).slice(0, 5);
    
    if (stockBajo.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">No hay alertas de stock</td></tr>';
        return;
    }
    
    tbody.innerHTML = stockBajo.map(p => `
        <tr>
            <td>${p.nombre}</td>
            <td>${p.stock}</td>
            <td><span class="badge badge-warning">STOCK BAJO</span></td>
        </tr>
    `).join('');
}

function mostrarUltimasRecomendaciones(recomendaciones) {
    const tbody = document.getElementById('ultimasRecomendaciones');
    
    if (!tbody) return;
    
    if (recomendaciones.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No hay recomendaciones disponibles</td></tr>';
        return;
    }
    
    tbody.innerHTML = recomendaciones.slice(0, 5).map(rec => {
        const badgeClass = rec.accionRecomendada === 'subir' ? 'badge-success' :
                          rec.accionRecomendada === 'bajar' ? 'badge-danger' : 'badge-warning';
        
        return `
            <tr>
                <td>${rec.nombreProducto || rec.producto?.nombre}</td>
                <td>$${rec.precioActual?.toLocaleString()}</td>
                <td><strong>$${rec.precioRecomendado?.toLocaleString()}</strong></td>
                <td><span class="badge ${badgeClass}">${rec.accionRecomendada?.toUpperCase()}</span></td>
                <td>${rec.porcentajeCambio?.toFixed(1)}%</td>
                <td>
                    <button class="btn btn-success btn-sm" onclick="aplicarRecomendacion('${rec._id}')">Aplicar</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Función global para aplicar recomendaciones desde el dashboard
window.aplicarRecomendacion = async function(id) {
    if (!confirm('¿Aplicar esta recomendación? Se actualizará el precio del producto.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API.BASE_URL}${API.RECOMENDACIONES.APLICAR(id)}`, {
            method: 'PUT',
            headers: getHeaders()
        });
        
        await handleResponse(response);
        mostrarAlerta('Recomendación aplicada exitosamente', 'success');
        cargarDashboard(); // Recargar dashboard
        
    } catch (error) {
        mostrarAlerta('Error: ' + error.message, 'danger');
    }
};

function mostrarAlerta(mensaje, tipo) {
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo}`;
    alerta.textContent = mensaje;
    alerta.style.position = 'fixed';
    alerta.style.top = '20px';
    alerta.style.right = '20px';
    alerta.style.zIndex = '10000';
    
    document.body.appendChild(alerta);
    
    setTimeout(() => {
        alerta.remove();
    }, 3000);
}