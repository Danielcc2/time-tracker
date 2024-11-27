let startTime = null;
let timerInterval = null;
let elapsedTime = 0;

const timerDisplay = document.querySelector('.timer');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const saveBtn = document.getElementById('saveBtn');
const descriptionInput = document.getElementById('description');
const entriesList = document.getElementById('entriesList');

// Formatear tiempo
function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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
    saveBtn.disabled = false;
});

// Guardar entrada
saveBtn.addEventListener('click', async () => {
    const entry = {
        description: descriptionInput.value,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date().toISOString(),
        duration: elapsedTime
    };

    try {
        const response = await fetch('/api/entries', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(entry)
        });

        if (response.ok) {
            descriptionInput.value = '';
            saveBtn.disabled = true;
            loadEntries();
            timerDisplay.textContent = '00:00:00';
            elapsedTime = 0;
        }
    } catch (error) {
        console.error('Error al guardar la entrada:', error);
    }
});

// Cargar entradas existentes
async function loadEntries() {
    try {
        const response = await fetch('/api/entries');
        const entries = await response.json();
        
        entriesList.innerHTML = entries.map(entry => `
            <div class="entry-item" data-id="${entry.id}">
                <span>${entry.description}</span>
                <div class="entry-actions">
                    <span>${formatTime(entry.duration)}</span>
                    <button class="delete-btn" onclick="deleteEntry(${entry.id})">
                        ❌
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
        const url = `/api/entries/${id}`;
        console.log('URL de eliminación:', url);
        
        const response = await fetch(url, {
            method: 'DELETE'
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