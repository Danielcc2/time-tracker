require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const TimeEntry = require('./models/TimeEntry');
const bcrypt = require('bcryptjs');
const express = require('express');
const app = express();
const port = process.env.PORT || 3001;
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const multer = require('multer');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

// Verificar que las variables de entorno están disponibles
console.log('Verificando configuración de Cloudinary:', {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ? '✓' : '✗',
    apiKey: process.env.CLOUDINARY_API_KEY ? '✓' : '✗',
    apiSecret: process.env.CLOUDINARY_API_SECRET ? '✓' : '✗'
});

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

// Verificar la configuración
try {
    // Intentar una operación simple para verificar la configuración
    cloudinary.api.ping()
        .then(() => console.log('Conexión con Cloudinary establecida correctamente'))
        .catch(error => console.error('Error al conectar con Cloudinary:', error));
} catch (error) {
    console.error('Error al configurar Cloudinary:', error);
}

// Agregar esta función después de la configuración de Cloudinary
async function checkLastUpload() {
    try {
        const result = await cloudinary.api.resources({
            type: 'upload',
            prefix: 'time-tracker', // ajusta esto según tu folder configurado
            max_results: 1,
            direction: 'desc'
        });
        
        console.log('Última imagen subida:', {
            url: result.resources[0]?.url,
            createdAt: result.resources[0]?.created_at,
            format: result.resources[0]?.format,
            bytes: result.resources[0]?.bytes
        });
    } catch (error) {
        console.error('Error al verificar uploads:', error);
    }
}

// Llamar a la función
checkLastUpload();

// Middleware para procesar JSON
app.use(express.json());
app.use(compression());
app.use(helmet({
    contentSecurityPolicy: false  // Deshabilitar temporalmente para desarrollo
}));

// Configuración de multer para memoria
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
});

// Función para subir a Cloudinary usando el stream API
const uploadToCloudinary = (buffer) => {
    return new Promise((resolve, reject) => {
        const timestamp = Math.round(new Date().getTime() / 1000);
        const signature = cloudinary.utils.api_sign_request({
            timestamp: timestamp,
            folder: 'time-tracker'
        }, process.env.CLOUDINARY_API_SECRET);

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'time-tracker',
                timestamp: timestamp,
                signature: signature,
                api_key: process.env.CLOUDINARY_API_KEY
            },
            (error, result) => {
                if (error) {
                    console.error('Error de Cloudinary:', error);
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );
        
        const bufferStream = new require('stream').Readable();
        bufferStream.push(buffer);
        bufferStream.push(null);
        
        bufferStream.pipe(uploadStream);
    });
};

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

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Conectado a MongoDB'))
    .catch(err => console.error('Error conectando a MongoDB:', err));

// API Routes
app.get('/api/entries', async (req, res) => {
    try {
        const userId = req.headers['user-id'];
        if (!userId) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const entries = await TimeEntry.find({ userId })
            .sort({ createdAt: -1 });

        res.json(entries);
    } catch (error) {
        console.error('Error al obtener entries:', error);
        res.status(500).json({ error: 'Error al obtener registros' });
    }
});

// Agregar después de require('dotenv').config();
const verificarConfiguracionCloudinary = () => {
    const configuracionRequerida = {
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET
    };

    const faltantes = Object.entries(configuracionRequerida)
        .filter(([key, value]) => !value)
        .map(([key]) => key);

    if (faltantes.length > 0) {
        console.error('❌ Faltan las siguientes variables de entorno:');
        console.error(faltantes.join('\n'));
        return false;
    }

    console.log('✅ Configuración de Cloudinary completa');
    return true;
};

// Modificar la ruta de subida de imágenes
app.post('/api/entries', upload.single('photo'), async (req, res) => {
    try {
        console.log('=== Nueva entrada iniciada ===');
        
        if (!req.body.description) {
            return res.status(400).json({ error: 'La descripción es requerida' });
        }

        let photoUrl = null;

        // Solo procesar la foto si se proporcionó una
        if (req.file && req.file.buffer) {
            try {
                const uploadResult = await uploadToCloudinary(req.file.buffer);
                photoUrl = uploadResult.secure_url;
                console.log('Imagen subida:', photoUrl);
            } catch (uploadError) {
                console.error('Error al subir imagen:', uploadError);
                // Continuamos sin imagen si hay error en la subida
            }
        }

        // Crear entrada en la base de datos
        const timeEntry = new TimeEntry({
            userId: req.headers['user-id'],
            description: req.body.description,
            duration: parseInt(req.body.duration) || 0,
            startTime: new Date(req.body.startTime),
            endTime: new Date(req.body.endTime),
            photoUrl: photoUrl // Será null si no se subió foto
        });

        await timeEntry.save();
        console.log('Entrada guardada en DB:', timeEntry._id);

        res.status(201).json({
            message: 'Entrada creada exitosamente',
            entry: timeEntry
        });

    } catch (error) {
        console.error('Error detallado:', error);
        return res.status(500).json({
            error: 'Error al procesar la entrada',
            detalles: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

app.delete('/api/entries/:id', async (req, res) => {
    try {
        const userId = req.headers['user-id'];
        if (!userId) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const entry = await TimeEntry.findOneAndDelete({
            _id: req.params.id,
            userId
        });

        if (!entry) {
            return res.status(404).json({ error: 'Registro no encontrado' });
        }

        res.json({ message: 'Registro eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar entry:', error);
        res.status(500).json({ error: 'Error al eliminar registro' });
    }
});

// Agregar después de las importaciones existentes
let users = [];

// Agregar estas rutas antes del manejo de errores
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.post('/api/register', async (req, res) => {
    try {
        const { name, email, username, password } = req.body;

        // Validaciones básicas
        if (!name || !email || !username || !password) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });

        if (existingUser) {
            return res.status(400).json({ 
                error: 'El usuario o correo electrónico ya está registrado' 
            });
        }

        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear nuevo usuario
        const user = new User({
            name,
            email,
            username,
            password: hashedPassword
        });

        await user.save();

        res.status(201).json({ 
            message: 'Usuario registrado correctamente',
            userId: user._id
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error al registrar usuario' });
    }
});

// Modificar la ruta de login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Mantener admin por defecto
        if (username === 'admin' && password === 'admin123') {
            return res.json({ 
                success: true,
                name: 'Administrador',
                userId: 'admin'
            });
        }

        // Buscar usuario
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Verificar contraseña
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        res.json({ 
            success: true,
            name: user.name,
            userId: user._id
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
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