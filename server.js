const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

const app = express();
const nodemailer = require("nodemailer");
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
      const usersCollection = database.collection("users");


      // Créer un nouvel utilisateur
      const newUser = {
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        level,
        ranking,
        trophies: [], // Ajouter un tableau vide pour les trophées
      };

      const result = await usersCollection.insertOne(newUser);



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
    console.log(
      `Tentative d'ajout d'un utilisateur au club avec ID: ${clubId}`
    );
    const { userId } = req.body;
    console.log("User ID reçu:", userId);

    if (!userId) {
      return res
        .status(400)
        .send({ message: "L'ID de l'utilisateur est requis." });
    }

    try {
      // Mettre à jour le club en ajoutant l'utilisateur dans le tableau userIds
      console.log(
        `Tentative d'ajout d'un utilisateur au club avec ID: ${clubId}`
      );
      const updatedClub = await clubsCollection.findOneAndUpdate(
        { _id: new ObjectId(clubId) },
        { $addToSet: { userIds: userId } }, // Utilisez $addToSet pour éviter les doublons
        { returnDocument: "after" }
      );

      console.log("Club mis à jour:", updatedClub.value);
      res.send(updatedClub.value);
    } catch (err) {
      console.error("Erreur lors de la mise à jour du club:", err);
      res
        .status(500)
        .send({ message: "Erreur lors de la mise à jour du club." });
    }
  });

  app.get("/clubs/:clubId", async (req, res) => {
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
  app.patch("/clubs/:clubId/removeUser", async (req, res) => {
    const { clubId } = req.params;
    const { userId } = req.body;
    console.log(`Recherche du club avec ID: ${clubId}`);

    try {
      const club = await clubsCollection.findOneAndUpdate(
        { _id: new ObjectId(clubId) },
        { $pull: { userIds: userId } }, // Supprime l'utilisateur de la liste userIds
        { returnDocument: "after" }
      );

      console.log(`Utilisateur ${userId} supprimé du club ${clubId}`);
      res.send(club.value);
    } catch (err) {
      console.error(
        "Erreur lors de la suppression de l'utilisateur du club:",
        err
      );
      res
        .status(500)
        .send({
          message: "Erreur lors de la suppression de l'utilisateur du club.",
        });
    }
  });

  const transporter = nodemailer.createTransport({
    service: "gmail", // Utilise Gmail comme service de messagerie
    auth: {
      user: "maclovin0002@gmail.com", // Remplace par ton email Gmail
      pass: "skzk rgcc xvpq azug", // Remplace par le mot de passe ou un App Password
    },
  });

  // Route pour envoyer l'e-mail
  app.post("/send-email", async (req, res) => {
    const { to, subject, text } = req.body;

    // Vérifier si 'to' est un tableau ou une chaîne
    let recipientList;
    if (Array.isArray(to)) {
      recipientList = to.join(","); // Concaténer les adresses email
    } else if (typeof to === "string") {
      recipientList = to; // Utiliser directement si c'est une seule adresse
    } else {
      return res
        .status(400)
        .send({ message: 'Le champ "to" doit être un tableau ou une chaîne.' });
    }

    // Options de l'email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipientList, // Liste des destinataires séparés par des virgules
      subject: subject,
      text: text,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("Email envoyé avec succès");
      res.status(200).send({ message: "Emails envoyés avec succès" });
    } catch (error) {
      console.error("Erreur lors de l'envoi des emails:", error);
      res.status(500).send({ message: "Erreur lors de l'envoi des emails" });
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
      console.error(
        "Erreur lors de la mise à jour des informations personnelles:",
        err
      );
      res
        .status(500)
        .send({
          message:
            "Erreur lors de la mise à jour des informations personnelles.",
        });
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
      console.error(
        "Erreur lors de la mise à jour des informations tennis:",
        err
      );
      res
        .status(500)
        .send({
          message: "Erreur lors de la mise à jour des informations tennis.",
        });
    }
  });

  app.delete("/users/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
      // Récupérer l'utilisateur pour savoir à quel club il est associé
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

      if (!user) {
        return res.status(404).send({ message: "Utilisateur non trouvé." });
      }

      // Retirer l'ID de l'utilisateur du club
      await clubsCollection.updateOne(
        { _id: new ObjectId(user.club) },
        { $pull: { userIds: userId } }
      );

      // Supprimer l'utilisateur
      await usersCollection.deleteOne({ _id: new ObjectId(userId) });

      res.send({ message: "Utilisateur supprimé avec succès." });
    } catch (err) {
      console.error("Erreur lors de la suppression de l'utilisateur:", err);
      res
        .status(500)
        .send({ message: "Erreur lors de la suppression de l'utilisateur." });
    }
  });

  app.post("/matchs", async (req, res) => {
    const { player1_id, player2_id, score, winner_id } = req.body;

    // Vérification des données envoyées
    if (!player1_id || !player2_id || !score || !winner_id) {
      return res.status(400).json({
        message: "Tous les champs (player1_id, player2_id, score, winner_id) sont requis.",
      });
    }

    try {
      const match = {
        player1_id: new ObjectId(player1_id),
        player2_id: new ObjectId(player2_id),
        score,
        winner_id: new ObjectId(winner_id),
        date_add: new Date(),
      };

      // Insérer le match dans la collection 'matchs'
      const result = await db.collection("matchs").insertOne(match);

      res.status(201).json({
        message: "Match enregistré avec succès",
        matchId: result.insertedId,
      });
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du match:", error);
      res.status(500).json({ message: "Erreur lors de l'enregistrement du match." });
    }
  });

// Route pour récupérer les statistiques d'un joueur
app.get("/matchs/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
      // Récupérer tous les matchs joués par le joueur
      const matchesPlayed = await db.collection("matchs").find({
          $or: [
              { player1_id: new ObjectId(userId) },
              { player2_id: new ObjectId(userId) }
          ]
      }).toArray();

      const totalMatches = matchesPlayed.length; // Nombre total de matchs joués
      let wins = 0; // Nombre de victoires
      let losses = 0; // Nombre de défaites
      let winStreak = 0; // Nombre de victoires consécutives
      let bestWinStreak = 0; // Meilleure série de victoires

      // Calculer les victoires et les défaites
      matchesPlayed.forEach(match => {
          if (match.winner_id.toString() === userId) {
              wins++;
          } else {
              losses++;
          }
      });

      // Trier les matchs par date
      const sortedMatches = matchesPlayed.sort((a, b) => new Date(a.date_add) - new Date(b.date_add));

      // Calculer le nombre de victoires consécutives et la meilleure série de victoires
      let currentStreak = 0; // Compteur pour la série actuelle

      for (let i = 0; i < sortedMatches.length; i++) {
          if (sortedMatches[i].winner_id.toString() === userId) {
              currentStreak++;
              if (currentStreak > bestWinStreak) {
                  bestWinStreak = currentStreak; // Mettre à jour la meilleure série
              }
          } else {
              currentStreak = 0; // Réinitialiser si une défaite est rencontrée
          }
      }

      // Calculer les victoires consécutives à la fin
      for (let i = sortedMatches.length - 1; i >= 0; i--) {
          if (sortedMatches[i].winner_id.toString() === userId) {
              winStreak++;
          } else {
              break; // On sort de la boucle dès qu'une défaite est trouvée
          }
      }

      res.status(200).json({
          totalMatches,
          wins,
          losses,
          winStreak, // Ajout de winStreak au retour
          bestWinStreak, // Ajout de bestWinStreak au retour
      });
  } catch (error) {
      console.error("Erreur lors de la récupération des statistiques:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des statistiques." });
  }
});


app.get("/matchs/user/:userId/history", async (req, res) => {
  const { userId } = req.params;

  try {
    // Récupérer tous les matchs joués par l'utilisateur
    const matchesPlayed = await db.collection("matchs").find({
      $or: [
        { player1_id: new ObjectId(userId) },
        { player2_id: new ObjectId(userId) }
      ]
    }).toArray();

    // Si aucun match trouvé
    if (matchesPlayed.length === 0) {
      return res.status(404).json({ message: "Aucun match trouvé pour cet utilisateur." });
    }

    // Traiter chaque match pour obtenir les informations de l'historique
    const matchHistory = await Promise.all(matchesPlayed.map(async (match) => {
      // Identifier l'adversaire
      const opponentId = match.player1_id.toString() === userId ? match.player2_id : match.player1_id;
      const opponent = await db.collection("users").findOne({ _id: new ObjectId(opponentId) });

      // Déterminer si l'utilisateur a gagné ou perdu
      const isWin = match.winner_id.toString() === userId;
      const result = isWin ? "Victoire" : "Défaite";

      // Construire l'objet historique du match
      return {
        date: match.date_add,
        score: match.score,
        opponent: {
          id: opponent._id,
          name: `${opponent.firstName} ${opponent.lastName}`, // Supposons que l'utilisateur ait firstName et lastName
        },
        result: result
      };
    }));

    // Retourner l'historique des matchs
    res.status(200).json(matchHistory);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'historique des matchs:", error);
    res.status(500).json({ message: "Erreur lors de la récupération de l'historique des matchs." });
  }
});

app.get("/trophies/check/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Récupérer les matchs joués par l'utilisateur
    const matchesPlayed = await db.collection("matchs").find({
      $or: [
        { player1_id: new ObjectId(userId) },
        { player2_id: new ObjectId(userId) }
      ]
    }).sort({ date_add: 1 }).toArray(); // Trier par date pour vérifier les victoires consécutives

    // Calculer le nombre de victoires de l'utilisateur
    const wins = matchesPlayed.filter(match => match.winner_id.toString() === userId).length;

    // Calculer le nombre de matchs joués
    const totalMatchesPlayed = matchesPlayed.length;

    // Récupérer les informations de l'utilisateur et ses trophées
    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Liste des trophées de victoires
    const winTrophies = [
      { id: "1-victoire", name: "Soldat d'élite", threshold: 1 },
      { id: "10-victoires", name: "Caporal en chef", threshold: 10 },
      { id: "25-victoires", name: "Sergent Major", threshold: 25 },
      { id: "50-victoires", name: "Adjudant du régiment", threshold: 50 },
      { id: "75-victoires", name: "Capitaine d'escadron", threshold: 75 },
      { id: "100-victoires", name: "Colonel des armées", threshold: 100 }
    ];

    // Liste des trophées pour les matchs joués
    const matchTrophies = [
      { id: "1-match", name: "Un petit pas de lama", threshold: 1 },
      { id: "10-matchs", name: "Le lamastico", threshold: 10 },
      { id: "25-matchs", name: "Le lamagique", threshold: 25 },
      { id: "50-matchs", name: "Lamazing !", threshold: 50 },
      { id: "75-matchs", name: "C'est un lamarathon", threshold: 75 },
      { id: "100-matchs", name: "C'est un lamassacre", threshold: 100 }
    ];

    // Initialiser un tableau pour stocker les nouveaux trophées à ajouter
    const newTrophies = [];

    // Vérifier chaque trophée de victoire
    winTrophies.forEach(trophy => {
      if (wins >= trophy.threshold && !user.trophies.includes(trophy.id)) {
        newTrophies.push(trophy.id);
      }
    });

    // Vérifier chaque trophée de matchs joués
    matchTrophies.forEach(trophy => {
      if (totalMatchesPlayed >= trophy.threshold && !user.trophies.includes(trophy.id)) {
        newTrophies.push(trophy.id);
      }
    });

    // Vérification pour le trophée de 3 victoires consécutives
    let consecutiveWins = 0;
    for (let i = 0; i < matchesPlayed.length; i++) {
      if (matchesPlayed[i].winner_id.toString() === userId) {
        consecutiveWins++;
        if (consecutiveWins === 3 && !user.trophies.includes("serie-3-victoires")) {
          newTrophies.push("serie-3-victoires");
          break;
        }
      } else {
        consecutiveWins = 0; // Réinitialiser si l'utilisateur perd un match
      }
    }

    // Si l'utilisateur a gagné de nouveaux trophées, les ajouter
    if (newTrophies.length > 0) {
      await db.collection("users").updateOne(
        { _id: new ObjectId(userId) },
        { $push: { trophies: { $each: newTrophies } } }
      );
      return res.status(200).json({ message: `Trophées gagnés : ${newTrophies.join(", ")}` });
    }

    // Si aucun nouveau trophée n'est gagné
    res.status(200).json({ message: "Aucun nouveau trophée gagné ou déjà acquis" });

  } catch (error) {
    console.error("Erreur lors de la vérification des trophées:", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});



// Route pour récupérer tous les trophées
app.get("/trophies", async (req, res) => {
  try {
    const trophiesCollection = db.collection("trophies");
    const trophies = await trophiesCollection.find({}).toArray(); // Récupère tous les trophées

    if (!trophies || trophies.length === 0) {
      return res.status(404).send({ message: "Aucun trophée trouvé." });
    }

    res.status(200).json(trophies);
  } catch (err) {
    console.error("Erreur lors de la récupération des trophées:", err.message);
    res.status(500).json({ error: "Erreur lors de la récupération des trophées" });
  }
});




  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
  });
});
