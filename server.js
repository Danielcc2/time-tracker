const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const multer = require('multer');
const fs = require('fs');

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

// Configurar multer para el almacenamiento de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'public/uploads';
        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Asegurarse de que la carpeta de uploads sea accesible
app.use('/uploads', express.static('public/uploads'));

// Ruta para obtener todos los registros
app.get('/api/entries', (req, res) => {
    res.json(timeEntries);
});

// Ruta para crear un nuevo registro
app.post('/api/entries', upload.single('photo'), (req, res) => {
    console.log('Cuerpo de la solicitud:', req.body);
    console.log('Archivo recibido:', req.file);
    
    const { description, startTime, endTime, duration } = req.body;
    
    try {
        // Validar que todos los campos necesarios estén presentes y sean válidos
        if (!description || description.trim() === '') {
            throw new Error('Falta la descripción');
        }
        
        if (!startTime || isNaN(new Date(startTime).getTime())) {
            throw new Error('Hora de inicio inválida');
        }
        
        if (!endTime || isNaN(new Date(endTime).getTime())) {
            throw new Error('Hora de fin inválida');
        }
        
        if (!duration || isNaN(Number(duration))) {
            throw new Error('Duración inválida');
        }
        
        if (!req.file) {
            throw new Error('Falta la foto');
        }
        
        const entry = {
            id: Number(Date.now()),
            description: description.trim(),
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
            duration: Number(duration),
            photoUrl: `/uploads/${req.file.filename}`
        };
        
        console.log('Nueva entrada creada:', entry);
        timeEntries.push(entry);
        res.status(201).json(entry);
        
    } catch (error) {
        console.error('Error al crear entrada:', error.message);
        res.status(400).json({ error: error.message });
    }
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