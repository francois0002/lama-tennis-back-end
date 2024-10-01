const express = require("express");
const jwt = require("jsonwebtoken");
const { usersCollection } = require("../db"); // Importer la collection
const router = express.Router();

// Secret key (use a secure key in production)
const SECRET_KEY = "vtestkey";

// Route pour gérer la requête d'inscription
router.post("/inscription", async (req, res) => {
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

  try {
    const newUser = {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      level,
      ranking,
    };
    await usersCollection.insertOne(newUser);
    res.status(201).send({ message: "Inscription réussie" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Erreur lors de l'inscription" });
  }
});

// Route pour gérer la connexion
router.post("/connexion", async (req, res) => {
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
router.post("/check-email", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).send({ message: "L'email est requis." });
  }

  try {
    const existingUser = await usersCollection.findOne({ email: email });

    if (existingUser) {
      return res.status(400).send({ message: "Cet email est déjà utilisé." });
    }

    res.status(200).send({ message: "Email disponible." });
  } catch (error) {
    console.error("Erreur lors de la vérification de l'email:", error.message);
    res.status(500).send({ message: "Erreur interne du serveur." });
  }
});

module.exports = router;
