let startTime = null;
let timerInterval = null;
let elapsedTime = 0;

const timerDisplay = document.querySelector('.timer');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const saveBtn = document.getElementById('saveBtn');
const descriptionInput = document.getElementById('description');
const entriesList = document.getElementById('entriesList');
const photoInput = document.getElementById('photoInput');
const modal = document.getElementById('imageModal');
const modalImg = document.getElementById('modalImage');
const closeModal = document.querySelector('.close-modal');

// Agregar al inicio del archivo
function checkAuth() {
    if (!localStorage.getItem('isAuthenticated')) {
        window.location.href = '/login';
    } else {
        updateUserName();
    }
}

// Función para cerrar sesión
function logout() {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userName');
    window.location.href = '/login';
}

// Verificar autenticación al cargar la página
checkAuth();

// Formatear tiempo
function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Agregar esta función después de formatTime
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Actualizar timer
function updateTimer() {
    elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    timerDisplay.textContent = formatTime(elapsedTime);
}

// Iniciar timer
startBtn.addEventListener('click', () => {
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
    startBtn.disabled = true;
    stopBtn.disabled = false;
    saveBtn.disabled = true;
});

// Detener timer
stopBtn.addEventListener('click', () => {
    clearInterval(timerInterval);
    startBtn.disabled = false;
    stopBtn.disabled = true;
    
    // Solo habilitar el botón de guardar si hay una foto seleccionada
    if (photoInput.files[0]) {
        saveBtn.disabled = false;
    }
});

// Guardar entrada
saveBtn.addEventListener('click', async () => {
    try {
        if (!photoInput.files[0]) {
            throw new Error('Por favor, selecciona una foto');
        }

        if (!descriptionInput.value.trim()) {
            throw new Error('Por favor, ingresa una descripción');
        }

        if (!startTime || !elapsedTime) {
            throw new Error('Debes iniciar y detener el cronómetro primero');
        }

        const formData = new FormData();
        formData.append('description', descriptionInput.value.trim());
        formData.append('startTime', new Date(startTime).toISOString());
        formData.append('endTime', new Date().toISOString());
        formData.append('duration', String(elapsedTime));
        formData.append('photo', photoInput.files[0]);

        const userId = localStorage.getItem('userId');
        const response = await fetch('/api/entries', {
            method: 'POST',
            headers: {
                'user-id': userId
            },
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            console.log('Registro guardado:', result);
            
            // Limpiar formulario
            descriptionInput.value = '';
            photoInput.value = '';
            saveBtn.disabled = true;
            await loadEntries();
            timerDisplay.textContent = '00:00:00';
            elapsedTime = 0;
            startTime = null;
        } else {
            throw new Error(result.error || 'Error al guardar el registro');
        }
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
});

// Cargar entradas existentes
async function loadEntries() {
    try {
        const userId = localStorage.getItem('userId');
        const response = await fetch('/api/entries', {
            headers: {
                'user-id': userId
            }
        });
        const entries = await response.json();
        
        // Debug: ver la estructura de las entradas
        console.log('Entradas recibidas:', entries);
        
        entriesList.innerHTML = entries.map(entry => {
            // Debug: ver cada entrada individual
            console.log('Procesando entrada:', entry);
            
            return `
            <div class="entry-item" data-id="${entry._id}">
                <div class="entry-info">
                    <div class="entry-content">
                        <img src="${entry.photoUrl}" 
                             alt="Foto del registro" 
                             class="entry-image"
                             onclick="openModal('${entry.photoUrl}')"
                             title="Click para ampliar">
                        <div class="entry-text">
                            <div class="entry-main">
                                <span class="entry-description">${entry.description}</span>
                                <span class="entry-duration">${formatTime(entry.duration)}</span>
                            </div>
                            <span class="entry-date">${formatDate(entry.startTime)}</span>
                        </div>
                    </div>
                </div>
                <div class="entry-actions">
                    <button class="delete-btn" 
                            onclick="deleteEntry('${entry._id}')" 
                            title="Eliminar registro">
                        🗑️
                    </button>
                </div>
            </div>
        `}).join('');
    } catch (error) {
        console.error('Error al cargar las entradas:', error);
    }
}

// Agregar la función para eliminar entradas
async function deleteEntry(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este registro?')) {
        return;
    }

    try {
        const userId = localStorage.getItem('userId');
        
        // Verificar datos necesarios
        if (!userId) {
            console.error('No se encontró userId');
            throw new Error('No hay sesión de usuario');
        }

        if (!id) {
            console.error('ID inválido:', id);
            throw new Error('ID de registro inválido');
        }

        // Log pre-request
        console.log('Datos de la petición:', {
            method: 'DELETE',
            url: `/api/entries/${id}`,
            userId: userId
        });

        const response = await fetch(`/api/entries/${id}`, {
            method: 'DELETE',
            headers: {
                'user-id': userId,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        // Log de respuesta inmediata
        console.log('Respuesta del servidor:', {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText
        });

        let responseData;
        try {
            const textResponse = await response.text();
            console.log('Respuesta texto:', textResponse);
            
            if (textResponse) {
                responseData = JSON.parse(textResponse);
                console.log('Respuesta parseada:', responseData);
            }
        } catch (parseError) {
            console.error('Error al parsear respuesta:', parseError);
        }

        // Verificar respuesta
        if (!response.ok) {
            throw new Error(
                responseData?.error || 
                responseData?.message || 
                `Error del servidor (${response.status})`
            );
        }

        // Éxito
        console.log('Eliminación exitosa');
        const entryElement = document.querySelector(`[data-id="${id}"]`);
        if (entryElement) {
            entryElement.remove();
        }
        await loadEntries();
    } catch (error) {
        // Log de error detallado
        console.error('=== Error Detallado ===');
        console.error('Tipo:', error.constructor.name);
        console.error('Mensaje:', error.message);
        console.error('Stack:', error.stack);
        console.error('==================');
        
        alert(`Error al eliminar: ${error.message}`);
    }
}

// Cargar entradas al iniciar
loadEntries();

// Agregar este evento después de las otras declaraciones de eventos
photoInput.addEventListener('change', () => {
    if (photoInput.files[0] && !startBtn.disabled) {
        saveBtn.disabled = false;
    }
});

// Función para abrir el modal
function openModal(imageUrl) {
    modal.style.display = 'block';
    modalImg.src = imageUrl;
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    document.body.style.overflow = 'hidden'; // Prevenir scroll
}

// Función para cerrar el modal
function closeImageModal() {
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        modalImg.src = '';
    }, 300);
    document.body.style.overflow = 'auto'; // Restaurar scroll
}

// Event listeners para el modal
closeModal.addEventListener('click', closeImageModal);
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeImageModal();
    }
});

// Escape key para cerrar el modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'block') {
        closeImageModal();
    }
});

// Agregar después de checkAuth()
function updateUserName() {
    const userName = localStorage.getItem('userName') || 'Usuario';
    document.getElementById('userName').textContent = userName;
} 