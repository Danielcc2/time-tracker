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
        
        entriesList.innerHTML = entries.map(entry => `
            <div class="entry-item" data-id="${entry.id}">
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
                    <button class="delete-btn" onclick="deleteEntry(${entry.id})" title="Eliminar registro">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error al cargar las entradas:', error);
    }
}

// Agregar la función para eliminar entradas
async function deleteEntry(id) {
    console.log('Tipo de ID a eliminar:', typeof id, 'Valor:', id);
    
    if (!confirm('¿Estás seguro de que quieres eliminar este registro?')) {
        return;
    }

    try {
        const userId = localStorage.getItem('userId');
        const response = await fetch(`/api/entries/${id}`, {
            method: 'DELETE',
            headers: {
                'user-id': userId
            }
        });

        console.log('Respuesta del servidor:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Registro eliminado:', data);
            await loadEntries();
        } else {
            const error = await response.json();
            console.error('Error al eliminar:', error);
            alert('No se pudo eliminar el registro');
        }
    } catch (error) {
        console.error('Error en la petición:', error);
        alert('Error al intentar eliminar el registro');
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