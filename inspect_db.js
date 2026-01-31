import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const { MONGODB_URI, MONGODB_DB } = process.env;

async function run() {
    const client = new MongoClient(MONGODB_URI);
    try {
        await client.connect();
        const db = client.db(MONGODB_DB);

        console.log("Checking collection 'bien'...");
        const count = await db.collection('bien').countDocuments();
        console.log(`Count in 'bien': ${count}`);

        if (count > 0) {
            const sample = await db.collection('bien').findOne({});
            console.log("Sample document:", JSON.stringify(sample, null, 2));
        } else {
            console.log("Collection 'bien' is empty.");

            // Check if there are other collections that look like movies
            const collections = await db.listCollections().toArray();
            console.log("Available collections:", collections.map(c => c.name));
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

run();