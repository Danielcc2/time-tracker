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
app.use(compression());
app.use(helmet({
    contentSecurityPolicy: false  // Deshabilitar temporalmente para desarrollo
}));

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

// Logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Rutas principales
app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Servir archivos estáticos después de las rutas principales
app.use(express.static('public'));
app.use('/uploads', express.static('public/uploads'));

// Array para almacenar los registros de tiempo
let timeEntries = [];

// API Routes
app.get('/api/entries', (req, res) => {
    const userId = req.headers['user-id'];
    if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const userEntries = timeEntries.filter(entry => entry.userId === userId);
    res.json(userEntries);
});

app.post('/api/entries', upload.single('photo'), (req, res) => {
    const userId = req.headers['user-id'];
    if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { description, startTime, endTime, duration } = req.body;
    
    try {
        // Validaciones...
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
            userId: userId,
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

app.delete('/api/entries/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = timeEntries.findIndex(entry => entry.id === id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Registro no encontrado' });
    }
    
    const deletedEntry = timeEntries.splice(index, 1)[0];
    res.status(200).json({ message: 'Registro eliminado correctamente' });
});

// Agregar después de las importaciones existentes
let users = [];

// Agregar estas rutas antes del manejo de errores
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.post('/api/register', (req, res) => {
    const { name, email, username, password } = req.body;

    // Validaciones básicas
    if (!name || !email || !username || !password) {
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Verificar si el usuario ya existe
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ error: 'El usuario ya existe' });
    }

    // Verificar si el email ya existe
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
    }

    // Crear nuevo usuario
    const newUser = {
        id: Date.now(),
        name,
        email,
        username,
        password // En una aplicación real, deberías hashear la contraseña
    };

    users.push(newUser);
    console.log('Usuario registrado:', newUser);
    
    // Devolver el userId en la respuesta
    res.status(201).json({ 
        message: 'Usuario registrado correctamente',
        userId: newUser.id.toString()
    });
});

// Modificar la ruta de login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === 'admin' && password === 'admin123') {
        return res.json({ 
            success: true,
            name: 'Administrador',
            userId: 'admin'
        });
    }

    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        res.json({ 
            success: true,
            name: user.name,
            userId: user.id.toString()
        });
    } else {
        res.status(401).json({ error: 'Credenciales inválidas' });
    }
});

// Manejo de errores (debe ir al final)
app.use((req, res, next) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
}); 