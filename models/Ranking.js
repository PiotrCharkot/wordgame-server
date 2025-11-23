// models/Ranking.js
const { mongoose } = require("../config/database");

const rankingSchema = new mongoose.Schema({
  userID: { type: String, required: true, index: true },
  userName: String,
  userPoints: { type: [Number], default: [] },
  userGames: { type: [Number], default: [] }
}, { timestamps: true });

module.exports = mongoose.model("Ranking", rankingSchema);
