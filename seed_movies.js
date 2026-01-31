import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const { MONGODB_URI, MONGODB_DB } = process.env;

if (!MONGODB_URI || !MONGODB_DB) {
    console.error('Faltan variables MONGODB_URI o MONGODB_DB en .env');
    process.exit(1);
}

const genres = ['Acción', 'Comedia', 'Drama', 'Ciencia Ficción'];
const subgenres = {
    'Acción': ['Aventura', 'Thriller', 'Superhéroes'],
    'Comedia': ['Romántica', 'Satira', 'Dark'],
    'Drama': ['Histórico', 'Biográfico', 'Crimen'],
    'Ciencia Ficción': ['Cyberpunk', 'Espacial', 'Distopía']
};

const posters = [
    "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=800", // Generic Dark
    "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=800", // Cyber/Neon
    "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=800", // SciFi Girl
    "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&q=80&w=800", // Cinema
    "https://images.unsplash.com/photo-1533488765986-dfa2a9939acd?auto=format&fit=crop&q=80&w=800"  // Cars/Action
];

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateMovies() {
    const movies = [];
    for (const genre of genres) {
        for (let i = 1; i <= 10; i++) {
            const sub = randomItem(subgenres[genre]);
            movies.push({
                animal: genre, // Mapped to 'Type/Genre'
                nombre: `${genre} Movie ${i}`,
                raza: sub, // Mapped to 'Subgenre'
                director: `Director ${i}`,
                subgenre: sub, // Explicit new field
                edad: 1990 + Math.floor(Math.random() * 35),
                descripcion: `Esta es una película de prueba del género ${genre}. Una obra maestra del subgénero ${sub}.`,
                photos: [{
                    url: randomItem(posters),
                    mime: 'image/jpeg'
                }]
            });
        }
    }
    return movies;
}

async function run() {
    const client = new MongoClient(MONGODB_URI);
    try {
        await client.connect();
        const db = client.db(MONGODB_DB);
        const collection = db.collection('pets'); // Using existing collection

        console.log('Borrando datos antiguos (opcional)...');
        // await collection.deleteMany({}); // Uncomment to clear DB first

        const movies = generateMovies();
        console.log(`Insertando ${movies.length} películas...`);
        const result = await collection.insertMany(movies);
        console.log(`✅ Insertados ${result.insertedCount} documentos.`);

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

run();