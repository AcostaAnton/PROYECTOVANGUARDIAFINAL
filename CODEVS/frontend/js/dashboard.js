// frontend/js/dashboard.js

// Variables globales para los gráficos
let ventasChart = null;
let recomendacionesChart = null;

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
        
        // Cargar TODAS las ventas
        const ventasRes = await fetch(`${API.BASE_URL}${API.VENTAS.BASE}`, {
            headers: getHeaders()
        });
        const ventasData = await handleResponse(ventasRes);
        
        // Cargar ventas de los últimos 7 días para el gráfico
        const ventasUltimos7Dias = await cargarVentasUltimos7Dias();
        
        // Actualizar stats
        actualizarStats(
            productosData.productos || [],
            recomendacionesData.recomendaciones || [],
            ventasData.ventas || []
        );
        
        // Mostrar recomendaciones por acción
        mostrarRecomendacionesPorAccion(recomendacionesData.recomendaciones || []);
        
        // Mostrar alertas de stock
        mostrarAlertasStock(productosData.productos || []);
        
        // Mostrar últimas recomendaciones
        mostrarUltimasRecomendaciones(recomendacionesData.recomendaciones || []);
        
        // CREAR GRÁFICOS
        crearGraficoVentas(ventasUltimos7Dias);
        crearGraficoRecomendaciones(recomendacionesData.recomendaciones || []);
        
    } catch (error) {
        console.error('Error en dashboard:', error);
    }
}

// Función para cargar ventas de los últimos 7 días
async function cargarVentasUltimos7Dias() {
    try {
        // Obtener todas las ventas
        const response = await fetch(`${API.BASE_URL}${API.VENTAS.BASE}`, {
            headers: getHeaders()
        });
        const data = await handleResponse(response);
        const ventas = data.ventas || [];
        
        // Calcular ventas por día de los últimos 7 días
        const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const ventasPorDia = new Array(7).fill(0);
        
        const hoy = new Date();
        
        ventas.forEach(venta => {
            const fechaVenta = new Date(venta.fechaVenta);
            const diferenciaDias = Math.floor((hoy - fechaVenta) / (1000 * 60 * 60 * 24));
            
            if (diferenciaDias >= 0 && diferenciaDias < 7) {
                const diaSemana = fechaVenta.getDay();
                ventasPorDia[diaSemana] += venta.precioTotal;
            }
        });
        
        // Reordenar para que empiece por Lunes
        const orden = [1, 2, 3, 4, 5, 6, 0]; // Lun a Dom
        const ventasOrdenadas = orden.map(idx => ventasPorDia[idx]);
        const etiquetasOrdenadas = orden.map(idx => dias[idx]);
        
        return {
            etiquetas: etiquetasOrdenadas,
            valores: ventasOrdenadas
        };
    } catch (error) {
        console.error('Error cargando ventas:', error);
        return {
            etiquetas: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
            valores: [0, 0, 0, 0, 0, 0, 0]
        };
    }
}

// Crear gráfico de ventas
function crearGraficoVentas(datos) {
    const ctx = document.getElementById('ventasChart');
    if (!ctx) return;
    
    // Destruir gráfico anterior si existe
    if (ventasChart) {
        ventasChart.destroy();
    }
    
    ventasChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: datos.etiquetas,
            datasets: [{
                label: 'Ingresos ($)',
                data: datos.valores,
                borderColor: '#4361ee',
                backgroundColor: 'rgba(67, 97, 238, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#4361ee',
                pointBorderColor: '#fff',
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `$${context.raw.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// Crear gráfico de recomendaciones
function crearGraficoRecomendaciones(recomendaciones) {
    const ctx = document.getElementById('recomendacionesChart');
    if (!ctx) return;
    
    // Contar recomendaciones por acción
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
    
    // Destruir gráfico anterior si existe
    if (recomendacionesChart) {
        recomendacionesChart.destroy();
    }
    
    recomendacionesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['SUBIR (+%)', 'BAJAR (-%)', 'MANTENER'],
            datasets: [{
                data: [conteo.subir, conteo.bajar, conteo.mantener],
                backgroundColor: ['#4cc9f0', '#f72585', '#f8961e'],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const total = conteo.subir + conteo.bajar + conteo.mantener;
                            const porcentaje = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} (${porcentaje}%)`;
                        }
                    }
                }
            }
        }
    });
}

function actualizarStats(productos, recomendaciones, ventas) {
    document.getElementById('totalProductos').textContent = productos.length || 0;
    document.getElementById('totalRecomendaciones').textContent = recomendaciones.length || 0;
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
    
    // Calcular porcentajes
    const total = conteo.subir + conteo.bajar + conteo.mantener;
    
    tbody.innerHTML = `
        <tr>
            <td><span class="badge badge-success">SUBIR</span></td>
            <td>${conteo.subir}</td>
            <td>${total > 0 ? ((conteo.subir / total) * 100).toFixed(1) : 0}%</td>
        </tr>
        <tr>
            <td><span class="badge badge-danger">BAJAR</span></td>
            <td>${conteo.bajar}</td>
            <td>${total > 0 ? ((conteo.bajar / total) * 100).toFixed(1) : 0}%</td>
        </tr>
        <tr>
            <td><span class="badge badge-warning">MANTENER</span></td>
            <td>${conteo.mantener}</td>
            <td>${total > 0 ? ((conteo.mantener / total) * 100).toFixed(1) : 0}%</td>
        </tr>
    `;
}

function mostrarAlertasStock(productos) {
    const tbody = document.getElementById('alertasStock');
    
    if (!tbody) return;
    
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
        
        const cambio = rec.porcentajeCambio || 0;
        const cambioColor = cambio > 0 ? 'text-success' : (cambio < 0 ? 'text-danger' : '');
        
        return `
            <tr>
                <td>${rec.nombreProducto || rec.producto?.nombre}</td>
                <td>$${rec.precioActual?.toLocaleString()}</td>
                <td><strong>$${rec.precioRecomendado?.toLocaleString()}</strong></td>
                <td><span class="badge ${badgeClass}">${rec.accionRecomendada?.toUpperCase()}</span></td>
                <td class="${cambioColor}">${cambio > 0 ? '+' : ''}${cambio.toFixed(1)}%</td>
                <td>
                    <button class="btn btn-success btn-sm" onclick="aplicarRecomendacion('${rec._id}')">Aplicar</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Función global para generar recomendaciones
window.generarTodasRecomendaciones = async function() {
    if (!confirm('¿Generar recomendaciones para todos los productos?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API.BASE_URL}/recomendaciones/generar/todos`, {
            method: 'POST',
            headers: getHeaders()
        });
        
        const data = await handleResponse(response);
        mostrarAlerta(data.message, 'success');
        cargarDashboard(); // Recargar dashboard
        
    } catch (error) {
        mostrarAlerta('Error: ' + error.message, 'danger');
    }
};

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