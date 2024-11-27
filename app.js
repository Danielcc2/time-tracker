document.addEventListener('DOMContentLoaded', function() {
    // Solicitar nombre de usuario si no existe
    if (!localStorage.getItem('userName')) {
        setUserName();
    }
});

function setUserName() {
    const userName = prompt('Por favor, ingresa tu nombre:');
    if (userName) {
        localStorage.setItem('userName', userName);
        return userName;
    }
    return 'Usuario';
}

// Agregar función para eliminar entrada
async function deleteEntry(entryId) {
    try {
        const response = await fetch(`/api/entries/${entryId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadEntries(); // Recargar la lista después de eliminar
        }
    } catch (error) {
        console.error('Error al eliminar la entrada:', error);
    }
}

// Modificar la función loadEntries
async function loadEntries() {
    try {
        const response = await fetch('/api/entries');
        const entries = await response.json();
        
        entriesList.innerHTML = entries.map(entry => `
            <div class="entry-item">
                <div class="entry-content">
                    <span>${entry.description}</span>
                    <span>${formatTime(entry.duration)}</span>
                </div>
                <button class="delete-btn" onclick="deleteEntry('${entry._id}')">×</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error al cargar las entradas:', error);
    }
} 