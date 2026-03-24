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

// ============ FUNCIONES DE EXPORTACIÓN ============

// Exportar a Excel (XLSX)
window.exportarExcel = async function() {
    try {
        mostrarAlerta('📊 Generando archivo Excel...', 'info');
        
        // Obtener todas las ventas
        const response = await fetch(`${API.BASE_URL}${API.VENTAS.BASE}`, {
            headers: getHeaders()
        });
        const data = await handleResponse(response);
        const ventas = data.ventas || [];
        
        if (ventas.length === 0) {
            mostrarAlerta('No hay ventas para exportar', 'warning');
            return;
        }
        
        // Formatear datos para Excel
        const datosExcel = ventas.map(venta => ({
            'Fecha': new Date(venta.fechaVenta).toLocaleString(),
            'Producto': venta.nombreProducto,
            'SKU': venta.skuProducto || 'N/A',
            'Cantidad': venta.cantidad,
            'Precio Unitario': venta.precioUnitario,
            'Total': venta.precioTotal,
            'Método Pago': venta.metodoPago,
            'Vendedor': venta.usuario?.nombre || 'N/A'
        }));
        
        // Crear archivo CSV (que Excel abre fácilmente)
        const headers = ['Fecha', 'Producto', 'SKU', 'Cantidad', 'Precio Unitario', 'Total', 'Método Pago', 'Vendedor'];
        const filas = datosExcel.map(item => [
            item.Fecha,
            item.Producto,
            item.SKU,
            item.Cantidad,
            item['Precio Unitario'],
            item.Total,
            item['Método Pago'],
            item.Vendedor
        ]);
        
        // Crear contenido CSV
        let csvContent = headers.join(',') + '\n';
        filas.forEach(fila => {
            const filaFormateada = fila.map(celda => {
                // Si el valor tiene comas o comillas, envolver en comillas
                if (typeof celda === 'string' && (celda.includes(',') || celda.includes('"'))) {
                    return `"${celda.replace(/"/g, '""')}"`;
                }
                return celda;
            }).join(',');
            csvContent += filaFormateada + '\n';
        });
        
        // Descargar como archivo .xlsx (Excel lo abre)
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const fecha = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        link.setAttribute('download', `ventas_${fecha}.xls`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        mostrarAlerta(`✅ ${ventas.length} ventas exportadas a Excel`, 'success');
        
    } catch (error) {
        console.error('Error exportando:', error);
        mostrarAlerta('Error al exportar: ' + error.message, 'danger');
    }
};

// Exportar a CSV
window.exportarCSV = async function() {
    try {
        mostrarAlerta('📄 Generando archivo CSV...', 'info');
        
        // Obtener todas las ventas
        const response = await fetch(`${API.BASE_URL}${API.VENTAS.BASE}`, {
            headers: getHeaders()
        });
        const data = await handleResponse(response);
        const ventas = data.ventas || [];
        
        if (ventas.length === 0) {
            mostrarAlerta('No hay ventas para exportar', 'warning');
            return;
        }
        
        // Crear cabeceras CSV
        const headers = ['Fecha', 'Producto', 'SKU', 'Cantidad', 'Precio Unitario', 'Total', 'Método Pago', 'Vendedor'];
        
        // Crear filas
        const filas = ventas.map(venta => [
            new Date(venta.fechaVenta).toLocaleString(),
            venta.nombreProducto,
            venta.skuProducto || 'N/A',
            venta.cantidad,
            venta.precioUnitario,
            venta.precioTotal,
            venta.metodoPago,
            venta.usuario?.nombre || 'N/A'
        ]);
        
        // Combinar todo
        let csvContent = headers.join(',') + '\n';
        filas.forEach(fila => {
            const filaFormateada = fila.map(celda => {
                if (typeof celda === 'string' && (celda.includes(',') || celda.includes('"'))) {
                    return `"${celda.replace(/"/g, '""')}"`;
                }
                return celda;
            }).join(',');
            csvContent += filaFormateada + '\n';
        });
        
        // Agregar resumen al final del CSV
        const totalVentas = ventas.length;
        const ingresosTotales = ventas.reduce((sum, v) => sum + v.precioTotal, 0);
        csvContent += '\n';
        csvContent += `"RESUMEN","","","","","","",""\n`;
        csvContent += `"Total Ventas",${totalVentas},"","","","","",""\n`;
        csvContent += `"Ingresos Totales",$${ingresosTotales.toLocaleString()},"","","","","",""\n`;
        
        // Descargar
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const fecha = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        link.setAttribute('download', `ventas_${fecha}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        mostrarAlerta(`✅ ${ventas.length} ventas exportadas a CSV`, 'success');
        
    } catch (error) {
        console.error('Error exportando:', error);
        mostrarAlerta('Error al exportar: ' + error.message, 'danger');
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
    alerta.style.minWidth = '250px';
    alerta.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    
    document.body.appendChild(alerta);
    
    setTimeout(() => {
        alerta.remove();
    }, 3000);
}