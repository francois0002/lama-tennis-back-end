const { usersCollection } = require("../config/database");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");

const SECRET_KEY = "vtestkey";

// Inscription d'un utilisateur
async function inscription(req, res) {
  const { email, password, firstName, lastName, phoneNumber, level, ranking } = req.body;

  if (!email || !password || !firstName || !lastName || !phoneNumber || !level || !ranking) {
    return res.status(400).send({ message: "Tous les champs sont requis" });
  }

  try {
    const newUser = { email, password, firstName, lastName, phoneNumber, level, ranking };
    await usersCollection.insertOne(newUser);
    res.status(201).send({ message: "Inscription réussie" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Erreur lors de l'inscription" });
  }
}

// Connexion d'un utilisateur
async function connexion(req, res) {
  const { email, password } = req.body;

  try {
    const user = await usersCollection.findOne({ email: email });
    if (!user || user.password !== password) {
      return res.status(400).json({ message: "Email ou mot de passe incorrect" });
    }

    const token = jwt.sign({ id: user._id, username: email }, SECRET_KEY, { expiresIn: "1h" });
    res.status(200).json({ token });
  } catch (error) {
    console.error("Erreur lors de la connexion:", error.message);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
}

// Vérifier si un email existe déjà
async function checkEmail(req, res) {
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
}

// Mettre à jour les informations de l'utilisateur
async function updateUser(req, res) {
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
}

module.exports = { inscription, connexion, checkEmail, updateUser };
