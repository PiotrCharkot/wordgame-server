const mongoose = require("mongoose");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

mongoose.set("strictQuery", true);

async function connectDB() {
  await mongoose.connect(uri, { autoIndex: true });
  console.log("MongoDB connected");
}

module.exports = { mongoose, connectDB };
