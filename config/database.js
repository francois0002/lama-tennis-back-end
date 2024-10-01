const { MongoClient } = require("mongodb");

const uri = "mongodb://localhost:27017";
const dbName = "lama_tennis";
let db, clubsCollection, usersCollection;

async function connectToDatabase() {
  try {
    const client = await MongoClient.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connecté à MongoDB");
    db = client.db(dbName);
    clubsCollection = db.collection("clubs");
    usersCollection = db.collection("users");
    return db;
  } catch (err) {
    throw new Error("Erreur lors de la connexion à MongoDB");
  }
}

module.exports = { connectToDatabase, db, clubsCollection, usersCollection };
