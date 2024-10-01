const { MongoClient } = require("mongodb");

const uri = "mongodb://localhost:27017";
const dbName = "lama_tennis"; // Assurez-vous que ce nom correspond à la base de données que vous utilisez
let db, clubsCollection, usersCollection;

// Fonction pour établir la connexion à MongoDB
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
  } catch (err) {
    console.error("Erreur lors de la connexion à MongoDB", err);
    process.exit(1); // Arrêter le processus si la connexion échoue
  }
}

module.exports = { connectToDatabase, db, clubsCollection, usersCollection };
