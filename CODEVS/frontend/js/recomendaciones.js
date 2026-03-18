let todasLasRecomendaciones = [];

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    cargarRecomendaciones();
    
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = 'login.html';
    });
});

async function cargarRecomendaciones() {
    try {
        const response = await fetch(`${API.BASE_URL}${API.RECOMENDACIONES.BASE}`, {
            headers: getHeaders()
        });
        
        const data = await handleResponse(response);
        todasLasRecomendaciones = data.recomendaciones || [];
        mostrarRecomendaciones(todasLasRecomendaciones);
        
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('listaRecomendaciones').innerHTML = 
            `<div class="alert alert-danger">Error al cargar recomendaciones: ${error.message}</div>`;
    }
}

function mostrarRecomendaciones(recomendaciones) {
    const container = document.getElementById('listaRecomendaciones');
    
    if (recomendaciones.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No hay recomendaciones activas</div>';
        return;
    }
    
    container.innerHTML = '';
    
    recomendaciones.forEach(rec => {
        const badgeClass = rec.accionRecomendada === 'subir' ? 'badge-success' :
                          rec.accionRecomendada === 'bajar' ? 'badge-danger' : 'badge-warning';
        
        const cambioClass = rec.porcentajeCambio > 0 ? 'text-success' : 
                           rec.porcentajeCambio < 0 ? 'text-danger' : '';
        
        container.innerHTML += `
            <div class="recomendacion-card ${rec.accionRecomendada}">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h3>${rec.nombreProducto || rec.producto?.nombre}</h3>
                        <p><small>SKU: ${rec.skuProducto || rec.producto?.sku}</small></p>
                    </div>
                    <span class="badge ${badgeClass}">${rec.accionRecomendada.toUpperCase()}</span>
                </div>
                
                <div style="display: flex; gap: 2rem; margin: 1rem 0;">
                    <div>
                        <small>Precio Actual</small>
                        <div class="precio-actual">$${rec.precioActual?.toLocaleString()}</div>
                    </div>
                    <div>
                        <small>Precio Recomendado</small>
                        <div class="precio-nuevo">$${rec.precioRecomendado?.toLocaleString()}</div>
                    </div>
                    <div>
                        <small>Cambio</small>
                        <div class="${cambioClass}">${rec.porcentajeCambio?.toFixed(1)}%</div>
                    </div>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <small>Explicación:</small>
                    <p>${rec.explicacion || 'Recomendación basada en nivel de stock'}</p>
                </div>
                
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-success btn-sm" onclick="aplicarRecomendacion('${rec._id}')">
                        Aplicar Cambio
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="verDetalles('${rec._id}')">
                        Ver Detalles
                    </button>
                </div>
                
                <div style="margin-top: 0.5rem; font-size: 0.875rem; color: #666;">
                    <small>Vence: ${new Date(rec.fechaExpiracion).toLocaleDateString()}</small>
                </div>
            </div>
        `;
    });
}

function filtrarRecomendaciones(filtro) {
    if (filtro === 'todas') {
        mostrarRecomendaciones(todasLasRecomendaciones);
    } else {
        const filtradas = todasLasRecomendaciones.filter(rec => rec.accionRecomendada === filtro);
        mostrarRecomendaciones(filtradas);
    }
}

async function generarTodasRecomendaciones() {
    if (!confirm('¿Generar recomendaciones para todos los productos? Esto puede tomar unos momentos.')) {
        return;
    }
    
    try {
        mostrarAlerta('Generando recomendaciones...', 'info');
        
        const response = await fetch(`${API.BASE_URL}/recomendaciones/generar/todos`, {
            method: 'POST',
            headers: getHeaders()
        });
        
        const data = await handleResponse(response);
        mostrarAlerta(data.message, 'success');
        cargarRecomendaciones();
        
    } catch (error) {
        mostrarAlerta('Error: ' + error.message, 'danger');
    }
}

async function aplicarRecomendacion(id) {
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
        cargarRecomendaciones();
        
    } catch (error) {
        mostrarAlerta('Error: ' + error.message, 'danger');
    }
}

function verDetalles(id) {
    const recomendacion = todasLasRecomendaciones.find(r => r._id === id);
    if (!recomendacion) return;
    
    const metricas = recomendacion.metricasAnalisis || {};
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <span class="modal-close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>Detalles de Recomendación</h2>
            
            <h3>${recomendacion.nombreProducto}</h3>
            
            <div style="margin: 1rem 0;">
                <h4>Métricas de Análisis</h4>
                <table style="width: 100%;">
                    <tr>
                        <td>Stock actual:</td>
                        <td><strong>${metricas.stockActual || 0}</strong></td>
                    </tr>
                    <tr>
                        <td>Ventas últimos 7 días:</td>
                        <td><strong>${metricas.ventasUltimos7Dias || 0}</strong></td>
                    </tr>
                    <tr>
                        <td>Ventas últimos 30 días:</td>
                        <td><strong>${metricas.ventasUltimos30Dias || 0}</strong></td>
                    </tr>
                </table>
            </div>
            
            <button class="btn btn-primary" onclick="this.closest('.modal').remove()">Cerrar</button>
        </div>
    `;
    
    document.body.appendChild(modal);
}

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