const express = require("express");
const { usersCollection } = require("../db"); // Importer la collection
const { ObjectId } = require("mongodb");
const router = express.Router();

// Nouvelle route pour mettre à jour un utilisateur
router.patch("/:userId", async (req, res) => {
  const { userId } = req.params;
  const { club } = req.body;

  if (!club) {
    return res.status(400).send({ message: "Le club est requis." });
  }

  try {
    const updatedUser = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: { club } },
      { returnDocument: "after" }
    );

    res.send(updatedUser.value);
  } catch (err) {
    console.error("Erreur lors de la mise à jour de l'utilisateur:", err);
    res.status(500).send({ message: "Erreur lors de la mise à jour de l'utilisateur." });
  }
});

module.exports = router;
