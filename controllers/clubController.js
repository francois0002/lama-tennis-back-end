const { clubsCollection } = require("../config/database");

// Fonction pour obtenir les clubs filtrés
async function getClubs(req, res) {
  const { town, department, region, name_club } = req.query;

  let filter = {};
  if (town) filter.town = { $regex: town, $options: "i" };
  if (department) filter.department = { $regex: department, $options: "i" };
  if (region) filter.region = { $regex: region, $options: "i" };
  if (name_club) filter.name_club = { $regex: name_club, $options: "i" };

  try {
    const clubs = await clubsCollection.find(filter).toArray();
    res.json(clubs);
  } catch (err) {
    console.error("Erreur lors de la récupération des clubs:", err.message);
    res.status(500).json({ error: "Erreur lors de la récupération des clubs" });
  }
}

// Fonction pour tester la récupération de tous les clubs
async function testClubs(req, res) {
  try {
    const clubs = await clubsCollection.find({}).toArray();
    res.json(clubs);
  } catch (err) {
    console.error("Erreur lors de la récupération des clubs:", err.message);
    res.status(500).json({ error: "Erreur lors de la récupération des clubs" });
  }
}

module.exports = { getClubs, testClubs };
