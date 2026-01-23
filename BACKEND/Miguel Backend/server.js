import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import { BlobServiceClient } from '@azure/storage-blob';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

// Cargar variables de entorno desde .env
dotenv.config();

// Configuraciones de entorno
const { MONGODB_URI, MONGODB_DB, port = process.env.PORT || 4000, API_KEY, AZURE_STORAGE_CONNECTION_STRING, AZURE_BLOB_CONTAINER, AZURE_STORAGE_ACCOUNT, AZURE_SAS_TOKEN } = process.env;

// Verificar si falta algo crítico
if (!MONGODB_URI || !MONGODB_DB || !API_KEY || !AZURE_STORAGE_CONNECTION_STRING || !AZURE_BLOB_CONTAINER || !AZURE_STORAGE_ACCOUNT || !AZURE_SAS_TOKEN) {
  console.error('Faltan variables de entorno: MONGODB_URI, MONGODB_DB, API_KEY, AZURE...');
  process.exit(1);
}

// Cliente de Azure Blob
const blobService = new BlobServiceClient(
  `https://${AZURE_STORAGE_ACCOUNT}.blob.core.windows.net?${AZURE_SAS_TOKEN}`
);

const container = blobService.getContainerClient(AZURE_BLOB_CONTAINER);

const app = express();

// Helper: genera URL pública con SAS incluido
function blobUrlWithSas(blobName) {
  return `https://${AZURE_STORAGE_ACCOUNT}.blob.core.windows.net/${AZURE_BLOB_CONTAINER}/${blobName}?${AZURE_SAS_TOKEN}`;
}

// Middlewares de seguridad y utilidades
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "connect-src": ["'self'", "https://miaw.azurewebsites.net"],
      "img-src": ["'self'", "https:", "data:", "https://esdibstorage.blob.core.windows.net"],
    }
  }
}));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, 'public')));

// Configurar Multer para la subida de imágenes
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    const ok = /image\/(png|jpe?g|webp)/i.test(file.mimetype);
    cb(ok ? null : new Error('Solo imágenes (png/jpg/webp)'), ok);
  }
});

// Generador de nombres y extensiones para imágenes
const randomName = (ext = 'bin') => crypto.randomBytes(16).toString('hex') + '.' + ext;
const extFromMime = m => (m?.split('/')[1] || 'bin').replace('jpeg', 'jpg');

// Auth por API Key
const apiKeyGuard = (req, res, next) => {
  if (req.header('x-api-key') !== process.env.API_KEY) return res.status(401).json({ error: 'No autorizado' });
  next();
};
app.use('/api', apiKeyGuard);

// Conexión a MONGODB
let client;
let db;
async function connectToMongo() {
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(MONGODB_DB);
  console.log('✅ Conectado a MongoDB');
}

// Helpers de validación
function parseIntegerField(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number.parseInt(value, 10);
  if (Number.isNaN(num)) {
    throw new Error(`El campo "${fieldName}" debe ser un número entero`);
  }
  return num;
}

// Normalizar datos de películas
function normalizeMoviePayload(body) {
  const {
    titulo,
    genero,
    ano,
    duracion,
    otrosGeneros,
    director,
    sinopsis,
    poster
  } = body;

  if (!titulo || !genero) throw new Error('Los campos "titulo" y "genero" son obligatorios');

  const payload = {
    titulo: String(titulo).trim(),
    genero: String(genero).trim(),
    ano: parseIntegerField(ano, 'ano'),
    duracion: parseIntegerField(duracion, 'duracion'),
    otrosGeneros: Array.isArray(otrosGeneros) ? otrosGeneros.map(g => String(g).trim()) : [],
    director: director ? String(director).trim() : null,
    sinopsis: sinopsis ? String(sinopsis).trim() : null,
    poster: poster || null,
    createdAt: new Date()
  };

  return payload;
}

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

// ========== ENDPOINTS DE PELÍCULAS ==========

// GET: Obtener todas las películas
app.get('/api/peliculas', async (req, res) => {
  try {
    const movies = await db.collection('peliculas')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    res.json(movies);
  } catch (err) {
    console.error('Error en GET /api/peliculas:', err);
    res.status(500).json({ error: 'Error al obtener películas' });
  }
});

// GET: Buscar película por título
app.get('/api/pelicula/:busqueda', async (req, res) => {
  try {
    const { busqueda } = req.params;
    
    const movie = await db.collection('peliculas').findOne({
      $or: [
        { titulo: { $regex: busqueda, $options: 'i' } },
        { _id: ObjectId.isValid(busqueda) ? new ObjectId(busqueda) : null }
      ]
    });

    if (!movie) {
      return res.status(404).json({ error: 'Película no encontrada' });
    }

    // Agregar URL con SAS a la foto si existe
    if (movie.poster) {
      movie.posterUrl = blobUrlWithSas(movie.poster.blobName);
    }

    res.json(movie);
  } catch (err) {
    console.error('Error en GET /api/pelicula/:busqueda:', err);
    res.status(500).json({ error: 'Error al buscar película' });
  }
});

// GET: Obtener películas por género
app.get('/api/pelicula/genero/:nombreDelGenero', async (req, res) => {
  try {
    const { nombreDelGenero } = req.params;

    const movies = await db.collection('peliculas')
      .find({ genero: { $regex: nombreDelGenero, $options: 'i' } })
      .sort({ createdAt: -1 })
      .toArray();

    // Agregar URLs con SAS a las fotos
    movies.forEach(movie => {
      if (movie.poster) {
        movie.posterUrl = blobUrlWithSas(movie.poster.blobName);
      }
    });

    res.json(movies);
  } catch (err) {
    console.error('Error en GET /api/pelicula/genero/:nombreDelGenero:', err);
    res.status(500).json({ error: 'Error al obtener películas por género' });
  }
});

// POST: Crear película con imagen en Azure Blob Storage
app.post('/api/pelicula', upload.single('file'), async (req, res) => {
  try {
    console.log('POST /api/pelicula body:', req.body);
    
    const movie = normalizeMoviePayload(req.body);
    console.log('Normalized movie:', movie);

    if (!movie.titulo || !movie.genero) {
      return res.status(400).json({ error: 'Los campos "titulo" y "genero" son obligatorios' });
    }

    // 1) Inserta sin poster para obtener _id
    const baseDoc = { ...movie, poster: null };
    const result = await db.collection('peliculas').insertOne(baseDoc);
    const _id = result.insertedId;

    // 2) Sube imagen bajo carpeta del _id si existe
    if (req.file) {
      const ext = extFromMime(req.file.mimetype);
      const blobName = `peliculas/${_id}/${randomName(ext)}`;
      const block = container.getBlockBlobClient(blobName);
      await block.uploadData(req.file.buffer, { blobHTTPHeaders: { blobContentType: req.file.mimetype } });
      
      const posterInfo = {
        blobName,
        mime: req.file.mimetype,
        size: req.file.size,
        uploadedAt: new Date()
      };

      // 3) Actualiza el doc con la foto
      await db.collection('peliculas').updateOne({ _id }, { $set: { poster: posterInfo } });
    }

    // 4) Devuelve el doc final
    const doc = await db.collection('peliculas').findOne({ _id });
    if (doc.poster) {
      doc.posterUrl = blobUrlWithSas(doc.poster.blobName);
    }
    res.status(201).json(doc);
  } catch (err) {
    console.error('POST /api/pelicula error:', err);
    res.status(400).json({ error: err.message || 'Error al crear película' });
  }
});

// Arranque
connectToMongo()
  .then(() => {
    app.listen(port, () => console.log(`🚀 API escuchando en http://localhost:${port}`));
  })
  .catch((err) => {
    console.error('No se pudo conectar a MongoDB:', err);
    process.exit(1);
  });

// Cierre elegante
process.on('SIGINT', async () => {
  try {
    await client?.close();
  } finally {
    process.exit(0);
  }
});