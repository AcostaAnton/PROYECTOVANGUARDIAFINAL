// frontend/js/auth.js

// Login
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(`${API.BASE_URL}${API.AUTH.LOGIN}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await handleResponse(response);
        
        // Guardar token y datos del usuario
        localStorage.setItem('token', data.token);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));
        
        // Redirigir al dashboard
        window.location.href = 'index.html';
        
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
});

// Registro (función para mostrar modal/formulario)
function mostrarRegistro() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="modal-close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>Registro de Usuario</h2>
            
            <form id="registroForm">
                <div class="form-group">
                    <label for="regNombre">Nombre</label>
                    <input type="text" class="form-control" id="regNombre" required>
                </div>
                
                <div class="form-group">
                    <label for="regEmail">Email</label>
                    <input type="email" class="form-control" id="regEmail" required>
                </div>
                
                <div class="form-group">
                    <label for="regPassword">Contraseña</label>
                    <input type="password" class="form-control" id="regPassword" required>
                </div>
                
                <button type="submit" class="btn btn-primary">Registrarse</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('registroForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nombre = document.getElementById('regNombre').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        
        try {
            const response = await fetch(`${API.BASE_URL}${API.AUTH.REGISTRO}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nombre, email, password })
            });
            
            await handleResponse(response);
            
            modal.remove();
            mostrarAlerta('Registro exitoso. Ahora puedes iniciar sesión.', 'success');
            
        } catch (error) {
            mostrarAlerta(error.message, 'danger');
        }
    });
}

function mostrarAlerta(mensaje, tipo) {
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo}`;
    alerta.textContent = mensaje;
    alerta.style.position = 'fixed';
    alerta.style.top = '20px';
    alerta.style.right = '20px';
    alerta.style.zIndex = '9999';
    
    document.body.appendChild(alerta);
    
    setTimeout(() => {
        alerta.remove();
    }, 3000);
}