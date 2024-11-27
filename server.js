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
        id: Date.now(),
        description,
        startTime,
        endTime,
        duration
    };
    
    timeEntries.push(entry);
    res.status(201).json(entry);
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