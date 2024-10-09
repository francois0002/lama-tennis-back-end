const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId} = require("mongodb");
const jwt = require("jsonwebtoken");

const app = express();
const nodemailer = require('nodemailer');
const port = 3000;
const uri = "mongodb://localhost:27017";
const dbName = "lama_tennis"; // Assurez-vous que ce nom correspond à la base de données que vous utilisez
let db, clubsCollection, usersCollection;

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

      const token = jwt.sign({ id: user._id, username: email }, SECRET_KEY, {
        expiresIn: "1h", // Le token expirera dans 1 heure
      });

      res.status(200).json({ token });
    } catch (error) {
      console.error("Erreur lors de la connexion:", error.message);
      res.status(500).json({ message: "Erreur interne du serveur" });
    }
  });

  // Route pour vérifier si un email existe déjà dans la base de données
  app.post("/api/check-email", async (req, res) => {
    const { email } = req.body;

    // Vérification si l'email est fourni
    if (!email) {
      return res.status(400).send({ message: "L'email est requis." });
    }

    try {
      // Rechercher si l'email existe déjà dans la collection 'users'
      const existingUser = await usersCollection.findOne({ email: email });

      // Si l'email est trouvé, retourner un message d'erreur
      if (existingUser) {
        return res.status(400).send({ message: "Cet email est déjà utilisé." });
      }

      // Si l'email n'existe pas, renvoyer un statut 200 pour indiquer qu'il est disponible
      res.status(200).send({ message: "Email disponible." });
    } catch (error) {
      console.error(
        "Erreur lors de la vérification de l'email:",
        error.message
      );
      res.status(500).send({ message: "Erreur interne du serveur." });
    }
  });

  // Nouvelle route pour mettre à jour un utilisateur
  app.patch("/users/:userId", async (req, res) => {
    const { userId } = req.params;
    const { club } = req.body;

    if (club === undefined) {
      return res.status(400).send({ message: "Le champ 'club' est requis." });
    }

    try {
      const updatedUser = await usersCollection.findOneAndUpdate(
        { _id: new ObjectId(userId) },
        { $set: { club } },
        { returnDocument: "after" }
      );

      console.log(updatedUser);


      res.send(updatedUser.value);
    } catch (err) {
      console.error("Erreur lors de la mise à jour de l'utilisateur:", err);
      res
        .status(500)
        .send({ message: "Erreur lors de la mise à jour de l'utilisateur." });
    }
  });



  // Route pour ajouter un utilisateur au club
app.patch("/clubs/:clubId/addUser", async (req, res) => {

  console.log("Requête reçue avec body:", req.body);
  const { clubId } = req.params;
  console.log(`Tentative d'ajout d'un utilisateur au club avec ID: ${clubId}`);
  const { userId } = req.body;
  console.log("User ID reçu:", userId);

  if (!userId) {
    return res.status(400).send({ message: "L'ID de l'utilisateur est requis." });
  }

  try {
    // Mettre à jour le club en ajoutant l'utilisateur dans le tableau userIds
    console.log(`Tentative d'ajout d'un utilisateur au club avec ID: ${clubId}`)
    const updatedClub = await clubsCollection.findOneAndUpdate(
      { _id: new ObjectId(clubId) },
      { $addToSet: { userIds: userId } }, // Utilisez $addToSet pour éviter les doublons
      { returnDocument: "after" }
    );



    console.log("Club mis à jour:", updatedClub.value);
    res.send(updatedClub.value);
  } catch (err) {
    console.error("Erreur lors de la mise à jour du club:", err);
    res.status(500).send({ message: "Erreur lors de la mise à jour du club." });
  }
});

app.get('/clubs/:clubId', async (req, res) => {
  const { clubId } = req.params;

  try {
    const club = await clubsCollection.findOne({ _id: new ObjectId(clubId) });
    if (!club) {
      return res.status(404).send({ message: "Club non trouvé." });
    }
    res.send(club);
  } catch (err) {
    console.error("Erreur lors de la récupération du club:", err);
    res.status(500).send({ message: "Erreur interne du serveur." });
  }
});

// Route pour récupérer les informations d'un utilisateur par ID
app.get("/users/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(404).send({ message: "Utilisateur non trouvé" });
    }
    res.send(user);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error);
    res.status(500).send({ message: "Erreur interne du serveur" });
  }
});

// route pour supprimer un utilisateur du club
app.patch('/clubs/:clubId/removeUser', async (req, res) => {
  const { clubId } = req.params;
  const { userId } = req.body;
  console.log(`Recherche du club avec ID: ${clubId}`);

  try {
    const club = await clubsCollection.findOneAndUpdate(
      { _id: new ObjectId(clubId) },
      { $pull: { userIds: userId } }, // Supprime l'utilisateur de la liste userIds
      { returnDocument: 'after' }
    );



    console.log(`Utilisateur ${userId} supprimé du club ${clubId}`);
    res.send(club.value);
  } catch (err) {
    console.error("Erreur lors de la suppression de l'utilisateur du club:", err);
    res.status(500).send({ message: "Erreur lors de la suppression de l'utilisateur du club." });
  }
});

const transporter = nodemailer.createTransport({
  service: 'gmail', // Utilise Gmail comme service de messagerie
  auth: {
    user: "maclovin0002@gmail.com", // Remplace par ton email Gmail
    pass: "skzk rgcc xvpq azug", // Remplace par le mot de passe ou un App Password
  },
});

// Route pour envoyer l'e-mail
app.post('/send-email', async (req, res) => {
  const { to, subject, text } = req.body;

  // Vérifier si 'to' est un tableau ou une chaîne
  let recipientList;
  if (Array.isArray(to)) {
      recipientList = to.join(','); // Concaténer les adresses email
  } else if (typeof to === 'string') {
      recipientList = to; // Utiliser directement si c'est une seule adresse
  } else {
      return res.status(400).send({ message: 'Le champ "to" doit être un tableau ou une chaîne.' });
  }

  // Options de l'email
  const mailOptions = {
    from:  process.env.EMAIL_USER,
    to: recipientList, // Liste des destinataires séparés par des virgules
    subject: subject,
    text: text,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email envoyé avec succès');
    res.status(200).send({ message: 'Emails envoyés avec succès' });
  } catch (error) {
    console.error('Erreur lors de l\'envoi des emails:', error);
    res.status(500).send({ message: 'Erreur lors de l\'envoi des emails' });
  }
});

app.patch("/users/:userId/updatePersonalInfo", async (req, res) => {
  const { userId } = req.params;
  const { firstName, lastName, email, phoneNumber } = req.body;

  if (!firstName || !lastName || !email || !phoneNumber) {
    return res.status(400).send({ message: "Tous les champs sont requis." });
  }

  try {
    const updatedUser = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      {
        $set: {
          firstName: firstName,
          lastName: lastName,
          email: email,
          phoneNumber: phoneNumber,
        },
      },
      { returnDocument: "after" }
    );


    res.send(updatedUser.value);
  } catch (err) {
    console.error("Erreur lors de la mise à jour des informations personnelles:", err);
    res.status(500).send({ message: "Erreur lors de la mise à jour des informations personnelles." });
  }
});

// Route pour mettre à jour les informations tennis de l'utilisateur
app.patch("/users/:userId/updateTennisInfo", async (req, res) => {
  const { userId } = req.params;
  const { level, ranking, club } = req.body;

  try {
    const updatedUser = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: { level, ranking, club } }, // Met à jour les informations tennis
      { returnDocument: "after" }
    );

    res.send(updatedUser.value);
  } catch (err) {
    console.error("Erreur lors de la mise à jour des informations tennis:", err);
    res.status(500).send({ message: "Erreur lors de la mise à jour des informations tennis." });
  }
});



  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
  });

});
