const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const dbName = 'lama_tennis';

async function testConnection() {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await client.connect();
    console.log('Connecté à MongoDB');

    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    console.log('Collections disponibles :', collections.map(col => col.name));
  } catch (err) {
    console.error('Erreur de connexion à MongoDB:', err);
  } finally {
    await client.close();
  }
}

testConnection();
