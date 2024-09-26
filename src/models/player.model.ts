import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  level: { type: String, required: true },
  ranking: { type: String, required: true },
});

const Player = mongoose.model('Player', playerSchema);

export default Player;
