// frontend/js/ventas.js

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    cargarProductosParaSelect();
    cargarVentas();
    cargarResumenDiario();
    
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = 'login.html';
    });
    
    document.getElementById('ventaForm').addEventListener('submit', registrarVenta);
});

async function cargarProductosParaSelect() {
    try {
        const response = await fetch(`${API.BASE_URL}${API.PRODUCTOS.BASE}`, {
            headers: getHeaders()
        });
        
        const data = await handleResponse(response);
        const select = document.getElementById('productoSelect');
        
        select.innerHTML = '<option value="">Seleccionar producto...</option>';
        
        (data.productos || []).forEach(producto => {
            if (producto.stock > 0) {
                select.innerHTML += `
                    <option value="${producto._id}" data-precio="${producto.precioActual}">
                        ${producto.nombre} - $${producto.precioActual} (Stock: ${producto.stock})
                    </option>
                `;
            }
        });
        
    } catch (error) {
        console.error('Error:', error);
    }
}

async function registrarVenta(e) {
    e.preventDefault();
    
    const productoId = document.getElementById('productoSelect').value;
    const cantidad = parseInt(document.getElementById('cantidad').value);
    const metodoPago = document.getElementById('metodoPago').value;
    const observaciones = document.getElementById('observaciones').value;
    
    if (!productoId) {
        mostrarAlerta('Selecciona un producto', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API.BASE_URL}${API.VENTAS.BASE}/crear`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                productoId,
                cantidad,
                metodoPago,
                observaciones
            })
        });
        
        await handleResponse(response);
        
        // Limpiar formulario
        document.getElementById('ventaForm').reset();
        document.getElementById('cantidad').value = '1';
        
        // Recargar datos
        cargarProductosParaSelect();
        cargarVentas();
        cargarResumenDiario();
        
        mostrarAlerta('Venta registrada exitosamente', 'success');
        
    } catch (error) {
        mostrarAlerta('Error: ' + error.message, 'danger');
    }
}

async function cargarVentas() {
    try {
        const response = await fetch(`${API.BASE_URL}${API.VENTAS.BASE}`, {
            headers: getHeaders()
        });
        
        const data = await handleResponse(response);
        mostrarVentas(data.ventas || []);
        
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('tablaVentas').innerHTML = 
            '<tr><td colspan="7">Error al cargar ventas</td></tr>';
    }
}

function mostrarVentas(ventas) {
    const tbody = document.getElementById('tablaVentas');
    
    if (ventas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No hay ventas registradas</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    ventas.slice(0, 10).forEach(venta => {
        const fecha = new Date(venta.fechaVenta).toLocaleString();
        
        tbody.innerHTML += `
            <tr>
                <td>${fecha}</td>
                <td>${venta.nombreProducto}</td>
                <td>${venta.cantidad}</td>
                <td>$${venta.precioUnitario?.toLocaleString()}</td>
                <td><strong>$${venta.precioTotal?.toLocaleString()}</strong></td>
                <td>${venta.metodoPago}</td>
                <td>${venta.usuario?.nombre || 'N/A'}</td>
            </tr>
        `;
    });
}

async function cargarResumenDiario() {
    try {
        const response = await fetch(`${API.BASE_URL}${API.VENTAS.REPORTE_DIARIO}`, {
            headers: getHeaders()
        });
        
        const data = await handleResponse(response);
        
        const resumen = data.resumen || {};
        const div = document.getElementById('resumenVentas');
        
        div.innerHTML = `
            <div style="background-color: #f8f9fa; padding: 1rem; border-radius: 4px;">
                <p><strong>Total Ventas:</strong> ${resumen.totalVentas || 0}</p>
                <p><strong>Ingresos:</strong> $${(resumen.ingresosTotales || 0).toLocaleString()}</p>
                <p><strong>Promedio por venta:</strong> $${(resumen.promedioPorVenta || 0).toLocaleString()}</p>
                <hr>
                <p><strong>Métodos de pago:</strong></p>
                <ul>
                    ${Object.entries(resumen.ventasPorMetodo || {}).map(([metodo, cantidad]) => 
                        `<li>${metodo}: ${cantidad}</li>`
                    ).join('')}
                </ul>
            </div>
        `;
        
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('resumenVentas').innerHTML = 
            '<p>Error al cargar resumen</p>';
    }
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