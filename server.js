const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const jwt = require("jsonwebtoken");

const app = express();
const port = 3000;
const uri = "mongodb://localhost:27017";
const dbName = "lama_tennis"; // Assurez-vous que ce nom correspond à la base de données que vous utilisez
let db, clubsCollection;

// Secret key (use a secure key in production)
const SECRET_KEY = "vtestkey";

app.use(cors());
app.use(express.json()); // Middleware pour parser le JSON

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
    // Vérifiez si la collection est bien récupérée
    const collections = await db.listCollections().toArray();
    console.log(
      "Collections disponibles :",
      collections.map((c) => c.name)
    );
  } catch (err) {
    console.error("Erreur lors de la connexion à MongoDB", err);
    process.exit(1); // Arrêter le processus si la connexion échoue
  }
}

// Établir la connexion à MongoDB avant de démarrer le serveur
connectToDatabase().then(() => {
  // Route pour renvoyer le message "Hello World"
  app.get("/message", (req, res) => {
    res.json({ message: "Hello World" });
  });

  // Route pour obtenir les clubs filtrés
  app.get("/clubs", async (req, res) => {
    const { town, department, region, name_club } = req.query;

    // Construction du filtre
    let filter = {};
    if (town) {
      filter.town = { $regex: town, $options: "i" }; // Filtrer par town
    }
    if (department) {
      filter.department = { $regex: department, $options: "i" }; // Filtrer par département
    }
    if (region) {
      filter.region = { $regex: region, $options: "i" }; // Filtrer par région
    }
    if (name_club) {
      filter.name_club = { $regex: name_club, $options: "i" }; // Filtrer par nom de club
    }

    console.log(`Filtre appliqué:`, filter);

    try {
      const clubs = await clubsCollection.find(filter).toArray();
      res.json(clubs); // Retourne les clubs filtrés
    } catch (err) {
      console.error("Erreur lors de la récupération des clubs:", err.message);
      res
        .status(500)
        .json({ error: "Erreur lors de la récupération des clubs" });
    }
  });

  // Route de test pour obtenir tous les clubs
  app.get("/test-clubs", async (req, res) => {
    try {
      const clubs = await clubsCollection.find({}).toArray();
      res.json(clubs);
    } catch (err) {
      console.error("Erreur lors de la récupération des clubs:", err.message);
      res
        .status(500)
        .json({ error: "Erreur lors de la récupération des clubs" });
    }
  });

  // Route pour gérer la requête d'inscription
  app.post("/api/inscription", async (req, res) => {
    console.log("Données reçues pour l'inscription:", req.body);
    const {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      level,
      ranking,
    } = req.body;

    if (
      !email ||
      !password ||
      !firstName ||
      !lastName ||
      !phoneNumber ||
      !level ||
      !ranking
    ) {
      return res.status(400).send({ message: "Tous les champs sont requis" });
    }

    const client = new MongoClient(uri);
    try {
      await client.connect();
      const database = client.db(dbName);
      const collection = database.collection("users");

      const newUser = {
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        level,
        ranking,
      };
      await collection.insertOne(newUser);
      res.status(201).send({ message: "Inscription réussie" });
    } catch (error) {
      console.error(error);
      res.status(500).send({ message: "Erreur lors de l'inscription" });
    } finally {
      await client.close();
    }
  });

  // Route pour gérer la connexion
  app.post("/connexion", async (req, res) => {
    const { email, password } = req.body;

    try {
      const user = await usersCollection.findOne({ email: email });

      // Vérification si l'utilisateur existe
      if (!user) {
        return res.status(400).json({ message: "Email incorrect" });
      }

      // Vérification du mot de passe
      if (user.password !== password) {
        return res.status(400).json({ message: "Mot de passe incorrect" });
      }

      //find email in database

      const token = jwt.sign({ id: "user.id", username: email }, SECRET_KEY, {
        expiresIn: "1h", // Le token expirera dans 1 heure
      });

      res.status(200).json({ token });
    } catch (error) {
      console.error("Erreur lors de la connexion:", error.message);
      res.status(500).json({ message: "Erreur interne du serveur" });
    }
  });

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
  });
});
