const express = require("express");
const { clubsCollection } = require("../db"); // Importer la collection
const router = express.Router();

// Route pour obtenir les clubs filtrés
router.get("/", async (req, res) => {
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
    res.status(500).json({ error: "Erreur lors de la récupération des clubs" });
  }
});

// Route de test pour obtenir tous les clubs
router.get("/test-clubs", async (req, res) => {
  try {
    const clubs = await clubsCollection.find({}).toArray();
    res.json(clubs);
  } catch (err) {
    console.error("Erreur lors de la récupération des clubs:", err.message);
    res.status(500).json({ error: "Erreur lors de la récupération des clubs" });
  }
});

module.exports = router;
