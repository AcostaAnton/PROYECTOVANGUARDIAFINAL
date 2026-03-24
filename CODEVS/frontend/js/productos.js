// frontend/js/productos.js

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
    
    document.getElementById('productoForm').addEventListener('submit', guardarProducto);
});
//CRUD READ
async function cargarProductos() {
    try {
        const response = await fetch(`${API.BASE_URL}${API.PRODUCTOS.BASE}`, {
            headers: getHeaders()
        });
        
        const data = await handleResponse(response);
        mostrarProductos(data.productos || []);
        
    } catch (error) {
        console.error('Error:', error);
        mostrarTablaVacia('Error al cargar productos: ' + error.message);
    }
}

function mostrarProductos(productos) {
    const tbody = document.getElementById('tablaProductos');
    
    if (productos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No hay productos registrados</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    productos.forEach(producto => {
        const stockClass = producto.stock < 10 ? 'badge-danger' : 
                          producto.stock < 20 ? 'badge-warning' : '';
        
        tbody.innerHTML += `
            <tr>
                <td><strong>${producto.sku}</strong></td>
                <td>${producto.nombre}</td>
                <td>$${producto.precioBase?.toLocaleString()}</td>
                <td>$${producto.precioActual?.toLocaleString()}</td>
                <td>
                    <span class="badge ${stockClass}">${producto.stock}</span>
                </td>
                <td>${producto.categoria || '-'}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="editarProducto('${producto._id}')">
                        Editar
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarProducto('${producto._id}')">
                        Eliminar
                    </button>
                    <button class="btn btn-info btn-sm" onclick="generarRecomendacion('${producto._id}')">
                        Recomendar
                    </button>
                </td>
            </tr>
        `;
    });
}

function mostrarTablaVacia(mensaje) {
    document.getElementById('tablaProductos').innerHTML = 
        `<tr><td colspan="7">${mensaje}</td></tr>`;
}

function mostrarFormularioProducto() {
    document.getElementById('modalTitulo').textContent = 'Nuevo Producto';
    document.getElementById('productoForm').reset();
    document.getElementById('productoId').value = '';
    document.getElementById('productoModal').style.display = 'block';
}

function cerrarModal() {
    document.getElementById('productoModal').style.display = 'none';
}

//CRUD CREATE
async function guardarProducto(e) {
    e.preventDefault();
    
    const producto = {
        sku: document.getElementById('sku').value,
        nombre: document.getElementById('nombre').value,
        descripcion: document.getElementById('descripcion').value,
        precioBase: parseFloat(document.getElementById('precioBase').value),
        stock: parseInt(document.getElementById('stock').value),
        categoria: document.getElementById('categoria').value,
        proveedor: document.getElementById('proveedor').value
    };
    
    const id = document.getElementById('productoId').value;
    const url = id 
        ? `${API.BASE_URL}${API.PRODUCTOS.BASE}/editar/${id}`
        : `${API.BASE_URL}${API.PRODUCTOS.BASE}/crear`;
    
    const method = id ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: getHeaders(),
            body: JSON.stringify(producto)
        });
        
        await handleResponse(response);
        
        cerrarModal();
        cargarProductos();
        mostrarAlerta(`Producto ${id ? 'actualizado' : 'creado'} exitosamente`, 'success');
        
    } catch (error) {
        mostrarAlerta('Error: ' + error.message, 'danger');
    }
}

//CRUD UPDATE
async function editarProducto(id) {
    try {
        const response = await fetch(`${API.BASE_URL}${API.PRODUCTOS.BASE}/${id}`, {
            headers: getHeaders()
        });
        
        const data = await handleResponse(response);
        const producto = data.producto;
        
        document.getElementById('modalTitulo').textContent = 'Editar Producto';
        document.getElementById('productoId').value = producto._id;
        document.getElementById('sku').value = producto.sku;
        document.getElementById('nombre').value = producto.nombre;
        document.getElementById('descripcion').value = producto.descripcion || '';
        document.getElementById('precioBase').value = producto.precioBase;
        document.getElementById('stock').value = producto.stock;
        document.getElementById('categoria').value = producto.categoria || '';
        document.getElementById('proveedor').value = producto.proveedor || '';
        
        document.getElementById('productoModal').style.display = 'block';
        
    } catch (error) {
        mostrarAlerta('Error al cargar producto: ' + error.message, 'danger');
    }
}

//CRUD DELETE
async function eliminarProducto(id) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API.BASE_URL}${API.PRODUCTOS.BASE}/borrar/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        
        await handleResponse(response);
        
        cargarProductos();
        mostrarAlerta('Producto eliminado', 'success');
        
    } catch (error) {
        mostrarAlerta('Error: ' + error.message, 'danger');
    }
}

async function generarRecomendacion(id) {
    try {
        const response = await fetch(`${API.BASE_URL}${API.RECOMENDACIONES.GENERAR(id)}`, {
            method: 'POST',
            headers: getHeaders()
        });
        
        const data = await handleResponse(response);
        mostrarAlerta('Recomendación generada', 'success');
        
    } catch (error) {
        mostrarAlerta('Error: ' + error.message, 'danger');
    }
}

async function buscarProductos(termino) {
    if (termino.length < 2) {
        cargarProductos();
        return;
    }
    
    try {
        const response = await fetch(`${API.BASE_URL}${API.PRODUCTOS.BUSCAR(termino)}`, {
            headers: getHeaders()
        });
        
        const data = await handleResponse(response);
        mostrarProductos(data.productos || []);
        
    } catch (error) {
        console.error('Error en búsqueda:', error);
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