function renderTasks(tasks) {
    const tasksContainer = document.querySelector('.tasks-container');
    tasksContainer.innerHTML = '';
    
    // Agregar header con fecha y usuario
    const headerElement = document.createElement('div');
    headerElement.className = 'tasks-header';
    headerElement.innerHTML = `
        <div class="date-display">
            ${new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}
        </div>
        <div class="user-display">
            ${localStorage.getItem('userName') || 'Usuario'}
        </div>
    `;
    tasksContainer.appendChild(headerElement);

    tasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = 'task-card';
        
        taskElement.innerHTML = `
            <div class="task-content">
                <div class="task-info">
                    <h3 class="task-title">${task.description}</h3>
                    <div class="task-details">
                        <span>${formatTime(task.startTime)}</span>
                        <span>${calculateDuration(task.startTime, task.endTime)}</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="delete-btn" data-id="${task.id}">×</button>
                </div>
            </div>
        `;
        
        tasksContainer.appendChild(taskElement);
    });

    // Agregar event listeners para los botones de eliminar
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const taskId = e.target.dataset.id;
            deleteTask(taskId);
        });
    });
}

function deleteTask(taskId) {
    // Obtener tareas actuales
    let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    // Filtrar la tarea a eliminar
    tasks = tasks.filter(task => task.id !== taskId);
    // Guardar tareas actualizadas
    localStorage.setItem('tasks', JSON.stringify(tasks));
    // Volver a renderizar
    renderTasks(tasks);
} 