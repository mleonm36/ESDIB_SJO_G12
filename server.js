import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import { BlobServiceClient } from "@azure/storage-blob";

// Cargar variables de entorno desde .env
dotenv.config();

//Configuraciones de entorno
const {
  MONGODB_URI,
  MONGODB_DB,
  port = process.env.PORT || 4000,
  API_KEY,
  AZURE_STORAGE_CONNECTION_STRING,
  AZURE_BLOB_CONTAINER,
  AZURE_STORAGE_ACCOUNT,
  AZURE_SAS_TOKEN,
} = process.env;

// Verificar si falta algo crítico
if (
  !MONGODB_URI ||
  !MONGODB_DB ||
  !API_KEY ||
  !AZURE_STORAGE_CONNECTION_STRING ||
  !AZURE_BLOB_CONTAINER ||
  !AZURE_STORAGE_ACCOUNT ||
  !AZURE_SAS_TOKEN
) {
  console.error(
    "Faltan variables de entorno: MONGODB_URI, MONGODB_DB, API_KEY, AZURE...",
  );
  process.exit(1);
}

// Cliente de Azure Blob
const blobService = new BlobServiceClient(
  `https://${AZURE_STORAGE_ACCOUNT}.blob.core.windows.net?${AZURE_SAS_TOKEN}`,
);

const container = blobService.getContainerClient(AZURE_BLOB_CONTAINER);

const app = express();

// Helper: genera URL pública con SAS incluido
function blobUrlWithSas(blobName) {
  return `https://${AZURE_STORAGE_ACCOUNT}.blob.core.windows.net/${AZURE_BLOB_CONTAINER}/${blobName}?${AZURE_SAS_TOKEN}`;
}

// Middlewares de seguridad y utilidades
//Para trabajar de forma local:
//app.use(helmet());

//Para poder trabajar con la pagina subida a azure:
// Para trabajar de forma local y evitar problemas de CSP que dejen la página en blanco:
// app.use(helmet({
//   contentSecurityPolicy: {
//     useDefaults: true,
//     directives: {
//       "default-src": ["'self'"],
//       "script-src": ["'self'", "'unsafe-inline'", "https:"],
//       "connect-src": ["'self'"],
//       "img-src": ["'self'", "https:", "data:", "https://esdibstorage.blob.core.windows.net"],
//       "style-src": ["'self'", "'unsafe-inline'", "https:"],
//       "font-src": ["'self'", "https:", "data:"],
//     }
//   }
// }));
app.use(cors({ origin: true, credentials: true })); // Habilitar CORS
app.use(express.json()); // Parsear JSON
app.use(morgan("dev")); // Logs HTTP
import multer from "multer";
import crypto from "crypto";

// Para que se vea desde azure y no de problemas de autenticidad
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Servir todo el contenido de 'frontend' como estático
app.use(express.static(path.join(__dirname, "frontend")));

// 2. Ruta para archivos HTML (opcional, para que no haga falta poner /html/ en la URL)
app.use(express.static(path.join(__dirname, "frontend", "html")));

// 3. Ruta raíz: Enviar index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "html", "index.html"));
});

// 4. Manejar rutas como /store.html redirigiendo a /html/store.html internamente
app.get("/:page.html", (req, res) => {
  const page = req.params.page;
  const filePath = path.join(__dirname, "frontend", "html", `${page}.html`);
  res.sendFile(filePath);
});

// Configurar Multer para la subida de imágenes
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 10 }, // 8MB por archivo, máx 10 archivos
  fileFilter: (req, file, cb) => {
    const ok = /image\/(png|jpe?g|webp)/i.test(file.mimetype);
    cb(ok ? null : new Error("Solo imágenes (png/jpg/webp)"), ok);
  },
});

// Generador de nombres y extensiones para imagenes
const randomName = (ext = "bin") =>
  crypto.randomBytes(16).toString("hex") + "." + ext;
const extFromMime = (m) => (m?.split("/")[1] || "bin").replace("jpeg", "jpg");

// Auth por API Key
const apiKeyGuard = (req, res, next) => {
  if (req.header("x-api-key") !== process.env.API_KEY)
    return res.status(401).json({ error: "No autorizado" });
  next();
};
app.use("/api", apiKeyGuard);

// Conexión a MONGODB
let client;
let db;
async function connectToMongo() {
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(MONGODB_DB);
  console.log("✅ Conectado a MongoDB");
}

// Helpers de validación
function parseIntegerField(value, fieldName) {
  if (value === undefined || value === null || value === "") return null;
  const num = Number.parseInt(value, 10);
  if (Number.isNaN(num)) {
    throw new Error(`El campo "${fieldName}" debe ser un número entero`);
  }
  return num;
}

//Rutas
//GET: Listar todas las películas (Lectura plana de 'bien')
app.get("/api/movies", async (req, res) => {
  try {
    // 1. Fetch all movie documents directly
    const moviesDocs = await db.collection("bien").find({}).toArray();

    // Mock posters pool (since DB has no images yet possibly)
    const posters = [
      "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800",
      "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=800",
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800",
      "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800",
      "https://images.unsplash.com/photo-1533488765986-dfa2a9939acd?w=800",
      "https://images.unsplash.com/photo-1616530940355-351fabd9524b?w=800",
      "https://images.unsplash.com/photo-1517604931442-710e8e9e466a?w=800",
      "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=800",
    ];

    const allMovies = moviesDocs.map((movie) => {
      const titulo = movie.titulo || "Sin Título";
      const posterIndex = titulo.length % posters.length;
      const idStr = movie._id ? String(movie._id) : movie.id || "no-id";

      let subgenero = "";
      if (Array.isArray(movie.otrosGeneros) && movie.otrosGeneros.length > 0) {
        subgenero = movie.otrosGeneros[0];
      } else if (movie.otrosGeneros) {
        subgenero = String(movie.otrosGeneros);
      }

      const posterUrl =
        movie.poster || movie.posterUrl || movie.foto || posters[posterIndex];

      return {
        _id: idStr,
        titulo: titulo,
        genero: movie.genero || "Otros",
        subgenero: subgenero,
        ano: movie.ano,
        duracion: movie.duracion,
        director: movie.director,
        sinopsis: movie.sinopsis,
        poster: posterUrl,
        precio: movie.precio,
      };
    });

    res.json(allMovies);
  } catch (err) {
    console.error("Error en GET /api/movies:", err);
    res.status(500).json({ error: "Error al obtener películas" });
  }
});

// DELETE Eliminar película
// NOTA: Borrar de la colección 'bien' requeriría usar $pull en un género específico.
// Como simplificación, buscaremos en todos los géneros y borraremos la película que coincida en título o ID simulado.
// Sin embargo, el ID simulado es un hash del título, así que borraremos por título.
app.delete("/api/movies/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Decodificar el ID (que es hex del título) para saber qué borrar
    const titulo = Buffer.from(id, "hex").toString("utf8");

    if (!titulo) return res.status(400).json({ error: "ID no válido" });

    // UPDATE en todos los documentos de 'bien' para hacer pull
    // (Esto es ineficiente si hay muchos géneros, pero funcional para este esquema)
    const result = await db
      .collection("bien")
      .updateMany({}, { $pull: { peliculas: { titulo: titulo } } });

    if (result.modifiedCount === 0) {
      return res
        .status(404)
        .json({ error: "Película no encontrada o ya eliminada" });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Error en DELETE /api/movies/:id:", err);
    res.status(500).json({ error: "Error al eliminar película" });
  }
});

//Comprobador para saber si el servidor responde
app.get("/health", (req, res) => res.json({ ok: true }));

// POST /api/movies - Añadir película a un género existente
app.post("/api/movies", upload.single("poster"), async (req, res) => {
  try {
    const { titulo, genero, director, ano, duracion, sinopsis } = req.body;

    if (!titulo || !genero) {
      return res
        .status(400)
        .json({ error: "Título y Género son obligatorios" });
    }

    // 1. Prepare movie object
    const newMovie = {
      titulo: titulo.trim(),
      ano: ano ? parseInt(ano) : null,
      duracion: duracion ? duracion.trim() : null,
      director: director ? director.trim() : null,
      sinopsis: sinopsis ? sinopsis.trim() : null,
      precio: req.body.precio ? parseFloat(req.body.precio) : null,
      createdAt: new Date(),
    };

    // 2. Handle Image Upload
    if (req.file) {
      const ext = extFromMime(req.file.mimetype);
      const blobName = `posters/${randomName(ext)}`;
      const block = container.getBlockBlobClient(blobName);
      await block.uploadData(req.file.buffer, {
        blobHTTPHeaders: { blobContentType: req.file.mimetype },
      });
      newMovie.posterUrl = blobUrlWithSas(blobName);
    }

    // 3. Update the specific genre document
    // We look for a document where 'genero' matches.
    // Note: The 'genero' field in DB might have '.' at end or different casing, but let's assume exact match from dropdown.
    // The GET endpoint handled "Action." vs "Action", so we might want to be careful.
    // Optimally we sanitize the input or use regex, but let's try direct match first.

    // Check if genre exists (optional for 'bien', we can just insert)
    // For 'bien' collection which is flat, we just insert the movie document.
    // We don't need to find a genre doc and push.

    // However, if we want to query by genre later, we just ensure 'genero' field is set.
    const movieToInsert = {
      ...newMovie,
      genero: genero.trim(), // Ensure genre is set on the movie
      otrosGeneros: [], // Optional
    };

    const result = await db.collection("bien").insertOne(movieToInsert);
    res
      .status(201)
      .json({ ok: true, movie: { ...movieToInsert, _id: result.insertedId } });
  } catch (err) {
    console.error("POST /api/movies error:", err);
    res.status(500).json({ error: err.message || "Error al añadir película" });
  }
});

// Devuelve fotos de una película (si las hubiera, por ahora devuelve lista vacía o mock si se implementara)
// Se elimina endpoint específico de fotos de pets pues ya no aplica.

// --- FORUM ENDPOINTS ---

// GET /api/comments - Listar comentarios (más recientes primero)
app.get("/api/comments", async (req, res) => {
  try {
    const comments = await db
      .collection("comments")
      .find({})
      .sort({ createdAt: -1 })
      .limit(50) // Limite opcional
      .toArray();
    res.json(comments);
  } catch (err) {
    console.error("Error GET /api/comments:", err);
    res.status(500).json({ error: "Error al obtener comentarios" });
  }
});

// POST /api/comments - Crear nuevo comentario
app.post("/api/comments", async (req, res) => {
  try {
    const { author, text } = req.body;
    if (!author || !text) {
      return res
        .status(400)
        .json({ error: "Autor y comentario son obligatorios" });
    }

    const newComment = {
      author: String(author).trim(),
      text: String(text).trim(),
      createdAt: new Date(),
    };

    const result = await db.collection("comments").insertOne(newComment);
    // Devolvemos el comentario con el ID generado
    res.status(201).json({ ...newComment, _id: result.insertedId });
  } catch (err) {
    console.error("Error POST /api/comments:", err);
    res.status(400).json({ error: "Error al publicar comentario" });
  }
});

// Arranque
connectToMongo()
  .then(() => {
    app.listen(port, () =>
      console.log(`🚀 API escuchando en http://localhost:${port}`),
    );
  })
  .catch((err) => {
    console.error("No se pudo conectar a MongoDB:", err);
    process.exit(1);
  });

// Cierre elegante
process.on("SIGINT", async () => {
  try {
    await client?.close();
  } finally {
    process.exit(0);
  }
});
