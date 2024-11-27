const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');

// Middleware para procesar JSON
app.use(express.json());
app.use(express.static('public'));
app.use(compression());
app.use(helmet());

// Al inicio del archivo, después de configurar middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Array para almacenar los registros de tiempo
let timeEntries = [];

// Ruta para obtener todos los registros
app.get('/api/entries', (req, res) => {
    res.json(timeEntries);
});

// Ruta para crear un nuevo registro
app.post('/api/entries', (req, res) => {
    const { description, startTime, endTime, duration } = req.body;
    
    if (!description || !startTime || !endTime || !duration) {
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    
    const entry = {
        id: Number(Date.now()),
        description,
        startTime,
        endTime,
        duration
    };
    
    console.log('Nueva entrada creada:', entry);
    timeEntries.push(entry);
    res.status(201).json(entry);
});

// Ruta para eliminar un registro
app.delete('/api/entries/:id', (req, res) => {
    const id = parseInt(req.params.id);
    console.log('DELETE request recibido para ID:', id);
    console.log('Tipo de ID:', typeof id);
    console.log('Entries actuales:', timeEntries);
    
    const index = timeEntries.findIndex(entry => {
        console.log('Comparando:', entry.id, id, typeof entry.id, typeof id);
        return entry.id === id;
    });
    
    if (index === -1) {
        console.log('Registro no encontrado para ID:', id);
        return res.status(404).json({ error: 'Registro no encontrado' });
    }
    
    const deletedEntry = timeEntries.splice(index, 1)[0];
    console.log('Entrada eliminada:', deletedEntry);
    
    res.status(200).json({ message: 'Registro eliminado correctamente' });
});

// Manejo de rutas no encontradas
app.use((req, res, next) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
}); 