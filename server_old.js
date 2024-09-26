const express = require('express');
const mongoose = require('mongoose');
const app = express();
const port = 3000;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/tennis_clubs', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define a schema and model
const clubSchema = new mongoose.Schema({
  id: String,
  name_club: String,
  location: String,
  postal_code: String,
  town: String,
  department: String,
  region: String,
});

const Club = mongoose.model('Club', clubSchema);

// Middleware to parse JSON
app.use(express.json());

// Define a route for filtering clubs
app.get('/clubs', async (req, res) => {
  try {
    const { town, region, department } = req.query;
    const query = {};
    if (town) query.town = town;
    if (region) query.region = region;
    if (department) query.department = department;

    const clubs = await Club.find(query);
    res.json(clubs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
