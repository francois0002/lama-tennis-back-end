import express from 'express';
import Player from '../src/models/player.model'; // Importer le modèle Player

const router = express.Router();

// Route pour gérer l'inscription
router.post('/inscription', async (req, res) => {
  const { email, password, firstName, lastName, phoneNumber, level, ranking } = req.body;

  // Créez un nouvel utilisateur
  const newPlayer = new Player({
    email,
    password, // Il est recommandé de hacher le mot de passe avant de l'enregistrer
    firstName,
    lastName,
    phoneNumber,
    level,
    ranking,
  });

  try {
    const savedPlayer = await newPlayer.save(); // Enregistrer dans MongoDB
    res.status(201).json(savedPlayer); // Répondre avec les données de l'utilisateur
  } catch (error) {
    res.status(400).json({ message: error.message }); // Gérer les erreurs
  }
});

export default router;
