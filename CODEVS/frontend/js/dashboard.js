// frontend/js/dashboard.js

// Variables globales
let ventasChart = null;
let recomendacionesChart = null;
let ultimoEstado = {
    stockBajo: [],
    recomendaciones: []
};
let intervaloActualizacion = null;

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    cargarDashboard();
    iniciarActualizacionAutomatica();
    
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        detenerActualizacionAutomatica();
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = 'login.html';
    });
    
    document.getElementById('refreshBtn').addEventListener('click', () => {
        const btn = document.getElementById('refreshBtn');
        btn.classList.add('refresh-spin');
        cargarDashboard().finally(() => {
            setTimeout(() => btn.classList.remove('refresh-spin'), 500);
        });
    });
});

// Iniciar actualización automática cada 30 segundos
function iniciarActualizacionAutomatica() {
    if (intervaloActualizacion) {
        clearInterval(intervaloActualizacion);
    }
    intervaloActualizacion = setInterval(() => {
        console.log('🔄 Actualización automática...');
        cargarDashboard();
    }, 30000); // Cada 30 segundos
}

function detenerActualizacionAutomatica() {
    if (intervaloActualizacion) {
        clearInterval(intervaloActualizacion);
        intervaloActualizacion = null;
    }
}

async function cargarDashboard() {
    try {
        // Cargar productos
        const productosRes = await fetch(`${API.BASE_URL}${API.PRODUCTOS.BASE}`, {
            headers: getHeaders()
        });
        const productosData = await handleResponse(productosRes);
        const productos = productosData.productos || [];
        
        // Cargar recomendaciones
        const recomendacionesRes = await fetch(`${API.BASE_URL}${API.RECOMENDACIONES.BASE}`, {
            headers: getHeaders()
        });
        const recomendacionesData = await handleResponse(recomendacionesRes);
        const recomendaciones = recomendacionesData.recomendaciones || [];
        
        // Cargar TODAS las ventas
        const ventasRes = await fetch(`${API.BASE_URL}${API.VENTAS.BASE}`, {
            headers: getHeaders()
        });
        const ventasData = await handleResponse(ventasRes);
        
        // Cargar ventas de los últimos 7 días para el gráfico
        const ventasUltimos7Dias = await cargarVentasUltimos7Dias();
        
        // VERIFICAR CAMBIOS Y MOSTRAR NOTIFICACIONES
        verificarCambios(productos, recomendaciones);
        
        // Actualizar stats
        actualizarStats(
            productos,
            recomendaciones,
            ventasData.ventas || []
        );
        
        // Mostrar recomendaciones por acción
        mostrarRecomendacionesPorAccion(recomendaciones);
        
        // Mostrar alertas de stock
        mostrarAlertasStock(productos);
        
        // Mostrar últimas recomendaciones
        mostrarUltimasRecomendaciones(recomendaciones);
        
        // CREAR GRÁFICOS
        crearGraficoVentas(ventasUltimos7Dias);
        crearGraficoRecomendaciones(recomendaciones);
        
        // Guardar estado actual para futuras comparaciones
        ultimoEstado = {
            stockBajo: productos.filter(p => p.stock < 10).map(p => ({ id: p._id, nombre: p.nombre, stock: p.stock })),
            recomendaciones: recomendaciones.map(r => ({ id: r._id, accion: r.accionRecomendada, producto: r.nombreProducto }))
        };
        
    } catch (error) {
        console.error('Error en dashboard:', error);
    }
}

// Verificar cambios y mostrar notificaciones
function verificarCambios(productos, recomendaciones) {
    // Verificar nuevos productos con stock bajo
    const stockBajoActual = productos.filter(p => p.stock < 10).map(p => ({ id: p._id, nombre: p.nombre, stock: p.stock }));
    const nuevosStockBajo = stockBajoActual.filter(nuevo => 
        !ultimoEstado.stockBajo.some(antiguo => antiguo.id === nuevo.id)
    );
    
    const stockRecuperado = ultimoEstado.stockBajo.filter(antiguo =>
        !stockBajoActual.some(nuevo => nuevo.id === antiguo.id)
    );
    
    // Notificar nuevos productos con stock bajo
    nuevosStockBajo.forEach(producto => {
        mostrarNotificacion(
            '⚠️ Alerta de Stock Bajo',
            `El producto "${producto.nombre}" tiene solo ${producto.stock} unidades restantes. ¡Revisa tu inventario!`,
            'warning'
        );
    });
    
    // Notificar productos recuperados
    stockRecuperado.forEach(producto => {
        mostrarNotificacion(
            '✅ Stock Recuperado',
            `El producto "${producto.nombre}" ya tiene stock suficiente (${producto.stock} unidades).`,
            'success'
        );
    });
    
    // Verificar nuevas recomendaciones
    const recomendacionesActual = recomendaciones.map(r => ({ id: r._id, accion: r.accionRecomendada, producto: r.nombreProducto }));
    const nuevasRecomendaciones = recomendacionesActual.filter(nuevo =>
        !ultimoEstado.recomendaciones.some(antiguo => antiguo.id === nuevo.id)
    );
    
    // Notificar nuevas recomendaciones
    nuevasRecomendaciones.forEach(rec => {
        let icono = '';
        let mensaje = '';
        if (rec.accion === 'subir') {
            icono = '📈';
            mensaje = 'Se recomienda SUBIR el precio para maximizar ganancias.';
        } else if (rec.accion === 'bajar') {
            icono = '📉';
            mensaje = 'Se recomienda BAJAR el precio para mover inventario.';
        } else {
            icono = '⚖️';
            mensaje = 'El precio actual es óptimo.';
        }
        
        mostrarNotificacion(
            `💡 Nueva Recomendación - ${rec.producto}`,
            `${icono} ${mensaje}`,
            rec.accion === 'subir' ? 'success' : (rec.accion === 'bajar' ? 'danger' : 'info')
        );
    });
    
    // Notificar resumen general si hay muchas alertas
    if (stockBajoActual.length > 3 && stockBajoActual.length > ultimoEstado.stockBajo.length) {
        mostrarNotificacion(
            '📊 Resumen de Inventario',
            `Tienes ${stockBajoActual.length} productos con stock bajo. Revisa la sección "Alertas de Stock".`,
            'warning'
        );
    }
}

// Función para mostrar notificaciones mejoradas
function mostrarNotificacion(titulo, mensaje, tipo = 'info') {
    // Crear contenedor de notificaciones si no existe
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    
    // Crear notificación
    const notificacion = document.createElement('div');
    notificacion.className = `notification ${tipo}`;
    
    const iconos = {
        success: '✅',
        warning: '⚠️',
        danger: '❌',
        info: 'ℹ️'
    };
    
    notificacion.innerHTML = `
        <div class="notification-icon">${iconos[tipo] || 'ℹ️'}</div>
        <div class="notification-content">
            <div class="notification-title">${titulo}</div>
            <div class="notification-message">${mensaje}</div>
        </div>
        <div class="notification-close" onclick="this.closest('.notification').remove()">×</div>
    `;
    
    container.appendChild(notificacion);
    
    // Auto-cerrar después de 8 segundos
    setTimeout(() => {
        if (notificacion && notificacion.parentNode) {
            notificacion.classList.add('hide');
            setTimeout(() => {
                if (notificacion.parentNode) notificacion.remove();
            }, 300);
        }
    }, 8000);
}

// Función para cargar ventas de los últimos 7 días
async function cargarVentasUltimos7Dias() {
    try {
        const response = await fetch(`${API.BASE_URL}${API.VENTAS.BASE}`, {
            headers: getHeaders()
        });
        const data = await handleResponse(response);
        const ventas = data.ventas || [];
        
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
        
        const orden = [1, 2, 3, 4, 5, 6, 0];
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
    
    const conteo = { subir: 0, bajar: 0, mantener: 0 };
    
    recomendaciones.forEach(rec => {
        if (conteo[rec.accionRecomendada] !== undefined) {
            conteo[rec.accionRecomendada]++;
        }
    });
    
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
    
    const conteo = { subir: 0, bajar: 0, mantener: 0 };
    
    recomendaciones.forEach(rec => {
        if (conteo[rec.accionRecomendada] !== undefined) {
            conteo[rec.accionRecomendada]++;
        }
    });
    
    const total = conteo.subir + conteo.bajar + conteo.mantener;
    
    tbody.innerHTML = `
        <tr><td><span class="badge badge-success">SUBIR</span></td><td>${conteo.subir}</td><td>${total > 0 ? ((conteo.subir / total) * 100).toFixed(1) : 0}%</td></tr>
        <tr><td><span class="badge badge-danger">BAJAR</span></td><td>${conteo.bajar}</td><td>${total > 0 ? ((conteo.bajar / total) * 100).toFixed(1) : 0}%</td></tr>
        <tr><td><span class="badge badge-warning">MANTENER</span></td><td>${conteo.mantener}</td><td>${total > 0 ? ((conteo.mantener / total) * 100).toFixed(1) : 0}%</td></tr>
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
        mostrarNotificacion('✅ Recomendaciones Generadas', data.message, 'success');
        cargarDashboard();
        
    } catch (error) {
        mostrarNotificacion('❌ Error', error.message, 'danger');
    }
};

// Función global para aplicar recomendaciones
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
        mostrarNotificacion('✅ Precio Actualizado', 'Recomendación aplicada exitosamente', 'success');
        cargarDashboard();
        
    } catch (error) {
        mostrarNotificacion('❌ Error', error.message, 'danger');
    }
};

function mostrarAlerta(mensaje, tipo) {
    mostrarNotificacion('Información', mensaje, tipo);
}

// ============================================
// MODO OSCURO - FUNCIONES
// ============================================

// Inicializar modo oscuro al cargar la página
function initDarkMode() {
    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.getElementById('themeToggle');
    
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeToggle) {
            themeToggle.innerHTML = '☀️ Modo Claro';
        }
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        if (themeToggle) {
            themeToggle.innerHTML = '🌙 Modo Oscuro';
        }
    }
}

// Toggle entre modo oscuro y claro
function toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const themeToggle = document.getElementById('themeToggle');
    
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        if (themeToggle) {
            themeToggle.innerHTML = '🌙 Modo Oscuro';
        }
        mostrarNotificacion('🌞 Modo Claro', 'El tema claro ha sido activado', 'info');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        if (themeToggle) {
            themeToggle.innerHTML = '☀️ Modo Claro';
        }
        mostrarNotificacion('🌙 Modo Oscuro', 'El tema oscuro ha sido activado', 'info');
    }
    
    // Recargar gráficos para ajustar colores
    setTimeout(() => {
        cargarDashboard();
    }, 100);
}

// Agregar evento al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    initDarkMode(); // Inicializar modo oscuro
    
    cargarDashboard();
    iniciarActualizacionAutomatica();
    
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        detenerActualizacionAutomatica();
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = 'login.html';
    });
    
    document.getElementById('refreshBtn').addEventListener('click', () => {
        const btn = document.getElementById('refreshBtn');
        btn.classList.add('refresh-spin');
        cargarDashboard().finally(() => {
            setTimeout(() => btn.classList.remove('refresh-spin'), 500);
        });
    });
    
    // Agregar evento del botón de modo oscuro
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleDarkMode);
    }
});