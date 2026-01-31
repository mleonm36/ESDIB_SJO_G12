import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

// Override DB name if needed, assuming user wants 'easdib'
const uri = process.env.MONGODB_URI;
// The user said "db easdib", so we force it here or check env.
const dbName = 'easdib';

async function run() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection('generos');

        console.log(`Connected to DB: ${dbName}, Collection: generos`);

        const count = await collection.countDocuments();
        console.log(`Total documents: ${count}`);

        const sample = await collection.findOne({});
        console.log('Sample document:', JSON.stringify(sample, null, 2));

        // Also list unique values for 'genre' field if it exists, to update UI
        // We don't know the field name for genre yet, so we wait for sample.

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

run();