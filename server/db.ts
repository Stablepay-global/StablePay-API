import { MongoClient } from 'mongodb';

const DATABASE_URL = 'mongodb+srv://Stablepay:STPY@stable-pay.6ism6a.mongodb.net/stablepay?retryWrites=true&w=majority&appName=Stable-Pay';
const DB_NAME = 'stablepay';

let client: MongoClient | null = null;
let db: any = null;

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(DATABASE_URL);
    await client.connect();
    db = client.db(DB_NAME);
    console.log(`[DB] Connected to MongoDB: ${DATABASE_URL} (db: ${DB_NAME})`);
  }
  return db;
}

export { connectToMongo, db };
