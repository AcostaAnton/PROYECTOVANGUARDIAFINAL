// frontend/js/simulacion.js

let productos = [];
let productoSeleccionado = null;

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    cargarProductos();
    
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = 'login.html';
    });
    
    document.getElementById('simulacionForm').addEventListener('submit', realizarSimulacion);
    document.getElementById('productoSimular').addEventListener('change', productoCambiado);
});

async function cargarProductos() {
    try {
        const response = await fetch(`${API.BASE_URL}${API.PRODUCTOS.BASE}`, {
            headers: getHeaders()
        });
        
        const data = await handleResponse(response);
        productos = data.productos || [];
        
        const select = document.getElementById('productoSimular');
        select.innerHTML = '<option value="">📋 Seleccionar producto...</option>';
        
        productos.forEach(producto => {
            const stockClass = producto.stock < 10 ? '⚠️' : (producto.stock > 50 ? '📦' : '✅');
            select.innerHTML += `
                <option value="${producto._id}" data-precio="${producto.precioActual}" data-stock="${producto.stock}">
                    ${producto.nombre} - $${producto.precioActual.toLocaleString()} (Stock: ${producto.stock}) ${stockClass}
                </option>
            `;
        });
        
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar productos', 'danger');
    }
}

function productoCambiado() {
    const select = document.getElementById('productoSimular');
    const productoId = select.value;
    const infoDiv = document.getElementById('infoProducto');
    const opcionesDiv = document.getElementById('opcionesRapidas');
    
    if (!productoId) {
        infoDiv.style.display = 'none';
        opcionesDiv.innerHTML = '';
        return;
    }
    
    productoSeleccionado = productos.find(p => p._id === productoId);
    
    if (productoSeleccionado) {
        // Mostrar información del producto
        infoDiv.style.display = 'block';
        document.getElementById('infoDetalle').innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                <div><small>Precio actual</small><br><strong>$${productoSeleccionado.precioActual.toLocaleString()}</strong></div>
                <div><small>Stock disponible</small><br><strong>${productoSeleccionado.stock} unidades</strong></div>
                <div><small>Categoría</small><br><strong>${productoSeleccionado.categoria || 'General'}</strong></div>
            </div>
        `;
        
        // Generar opciones rápidas de precio
        const precioActual = productoSeleccionado.precioActual;
        const opciones = [
            { label: '-20%', precio: Math.round(precioActual * 0.8), desc: 'Precio bajo (más demanda)' },
            { label: '-10%', precio: Math.round(precioActual * 0.9), desc: 'Precio competitivo' },
            { label: 'Actual', precio: precioActual, desc: 'Mantener precio actual' },
            { label: '+10%', precio: Math.round(precioActual * 1.1), desc: 'Precio premium' },
            { label: '+20%', precio: Math.round(precioActual * 1.2), desc: 'Precio alto (menos demanda)' }
        ];
        
        opcionesDiv.innerHTML = opciones.map(op => `
            <button type="button" class="btn-opcion" onclick="seleccionarPrecio(${op.precio})" title="${op.desc}">
                ${op.label}: $${op.precio.toLocaleString()}
            </button>
        `).join('');
        
        // Cargar historial del producto
        cargarHistorial(productoId);
    }
}

// Hacer la función seleccionarPrecio global
window.seleccionarPrecio = function(precio) {
    document.getElementById('precioSimulado').value = precio;
    // Opcional: resaltar el botón seleccionado
    document.querySelectorAll('.btn-opcion').forEach(btn => btn.classList.remove('selected'));
    event.target.classList.add('selected');
};

async function realizarSimulacion(e) {
    e.preventDefault();
    
    const productoId = document.getElementById('productoSimular').value;
    const precioSimulado = parseFloat(document.getElementById('precioSimulado').value);
    
    if (!productoId) {
        mostrarAlerta('⚠️ Por favor, selecciona un producto', 'warning');
        return;
    }
    
    if (!precioSimulado || isNaN(precioSimulado) || precioSimulado <= 0) {
        mostrarAlerta('⚠️ Por favor, ingresa un precio válido', 'warning');
        return;
    }
    
    try {
        mostrarAlerta('🔄 Calculando proyección...', 'info');
        
        const response = await fetch(`${API.BASE_URL}${API.RECOMENDACIONES.SIMULAR(productoId)}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ precioSimulado })
        });
        
        const data = await handleResponse(response);
        mostrarResultado(data.simulacion);
        cargarHistorial(productoId);
        
    } catch (error) {
        mostrarAlerta('❌ Error: ' + error.message, 'danger');
    }
}

function mostrarResultado(simulacion) {
    const div = document.getElementById('resultadoSimulacion');
    
    const esMejor = simulacion.diferencia > 0;
    const esPeor = simulacion.diferencia < 0;
    
    let recomendacionClass = 'recomendacion-neutra';
    let mensajeRecomendacion = '';
    let icono = '⚖️';
    
    if (esMejor) {
        recomendacionClass = 'recomendacion-buena';
        icono = '📈';
        mensajeRecomendacion = '¡Este precio podría aumentar tus ganancias!';
    } else if (esPeor) {
        recomendacionClass = 'recomendacion-mala';
        icono = '📉';
        mensajeRecomendacion = 'Este precio podría reducir tus ganancias';
    } else {
        mensajeRecomendacion = 'Las ganancias serían similares al precio actual';
    }
    
    const diferenciaClass = simulacion.diferencia > 0 ? 'diferencia-positiva' : 
                           (simulacion.diferencia < 0 ? 'diferencia-negativa' : '');
    
    const porcentajeFormateado = simulacion.porcentajeDiferencia > 0 ? 
                                 `+${simulacion.porcentajeDiferencia}%` : 
                                 `${simulacion.porcentajeDiferencia}%`;
    
    // CORREGIDO: Ahora usa simulacion.precioSimulado en lugar de precioSimulado
    div.innerHTML = `
        <div class="${recomendacionClass}" style="padding: 20px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                <span style="font-size: 2rem;">${icono}</span>
                <div>
                    <h4 style="margin: 0;">${simulacion.producto.nombre}</h4>
                    <p style="margin: 5px 0 0; color: #666;">
                        Análisis de precio: $${simulacion.precioSimulado.toLocaleString()}
                    </p>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                <div style="background: white; padding: 15px; border-radius: 8px;">
                    <small style="color: #666;">Precio Actual</small>
                    <div style="font-size: 1.8rem; font-weight: bold;">$${simulacion.producto.precioActual.toLocaleString()}</div>
                </div>
                <div style="background: white; padding: 15px; border-radius: 8px; border: 2px solid #4361ee;">
                    <small style="color: #4361ee;">Precio Simulado</small>
                    <div style="font-size: 1.8rem; font-weight: bold; color: #4361ee;">$${simulacion.precioSimulado.toLocaleString()}</div>
                </div>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin-top: 0;">📊 Proyección Mensual</h4>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                    <div>
                        <small style="color: #666;">Demanda Estimada</small>
                        <div style="font-size: 1.4rem;">${simulacion.demandaEstimada} uds</div>
                    </div>
                    <div>
                        <small style="color: #666;">Ingreso Proyectado</small>
                        <div style="font-size: 1.4rem;">$${simulacion.ingresoProyectado.toLocaleString()}</div>
                    </div>
                    <div>
                        <small style="color: #666;">vs Ingreso Actual</small>
                        <div style="font-size: 1.4rem;" class="${diferenciaClass}">
                            $${Math.abs(simulacion.diferencia).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="text-align: center; padding: 15px; background: white; border-radius: 8px;">
                <p style="font-size: 1.2rem; margin: 0;">
                    <strong>${mensajeRecomendacion}</strong>
                </p>
                <p style="margin: 10px 0 0; color: #666;">
                    ${esMejor ? '💰 Podrías ganar' : (esPeor ? '⚠️ Podrías perder' : '⚖️ Mantendrías')} 
                    <strong class="${diferenciaClass}">${porcentajeFormateado}</strong> comparado con el precio actual
                </p>
            </div>
            
            <div style="margin-top: 15px; font-size: 0.9rem; color: #999; text-align: center;">
                ℹ️ La demanda estimada es un cálculo basado en el comportamiento histórico
            </div>
        </div>
    `;
}

async function cargarHistorial(productoId) {
    if (!productoId) {
        document.getElementById('historialSimulaciones').innerHTML = 
            '<div class="loading">Selecciona un producto para ver su historial</div>';
        return;
    }
    
    try {
        const response = await fetch(`${API.BASE_URL}${API.RECOMENDACIONES.BASE}/simulaciones/${productoId}`, {
            headers: getHeaders()
        });
        
        const data = await handleResponse(response);
        mostrarHistorial(data.simulaciones || [], data.producto);
        
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('historialSimulaciones').innerHTML = 
            '<div class="alert alert-info">📭 No hay simulaciones previas para este producto</div>';
    }
}

function mostrarHistorial(simulaciones, producto) {
    const div = document.getElementById('historialSimulaciones');
    
    if (!simulaciones || simulaciones.length === 0) {
        div.innerHTML = '<div class="alert alert-info">📭 No hay simulaciones previas para este producto</div>';
        return;
    }
    
    div.innerHTML = `
        <h4>${producto?.nombre || 'Producto'}</h4>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Precio Simulado</th>
                        <th>Demanda Est.</th>
                        <th>Ingreso Proy.</th>
                        <th>vs Actual</th>
                        <th>Recomendación</th>
                    </tr>
                </thead>
                <tbody>
                    ${simulaciones.map(sim => {
                        const diferencia = sim.ingresoProyectado - (sim.demandaEstimada * sim.precioSimulado);
                        const cambioClass = diferencia > 0 ? 'diferencia-positiva' : diferencia < 0 ? 'diferencia-negativa' : '';
                        const icono = diferencia > 0 ? '📈' : (diferencia < 0 ? '📉' : '⚖️');
                        
                        return `
                            <tr>
                                <td>${new Date(sim.fechaSimulacion).toLocaleDateString()}</td>
                                <td><strong>$${sim.precioSimulado.toLocaleString()}</strong></td>
                                <td>${sim.demandaEstimada} uds</td>
                                <td>$${sim.ingresoProyectado.toLocaleString()}</td>
                                <td class="${cambioClass}">${icono} $${Math.abs(diferencia).toLocaleString()}</td>
                                <td>${diferencia > 0 ? '✅ Mejor' : (diferencia < 0 ? '❌ Peor' : '➡️ Igual')}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function mostrarAlerta(mensaje, tipo) {
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo}`;
    alerta.innerHTML = mensaje;
    alerta.style.position = 'fixed';
    alerta.style.top = '20px';
    alerta.style.right = '20px';
    alerta.style.zIndex = '10000';
    alerta.style.minWidth = '300px';
    alerta.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    
    document.body.appendChild(alerta);
    
    setTimeout(() => {
        alerta.remove();
    }, 4000);
}