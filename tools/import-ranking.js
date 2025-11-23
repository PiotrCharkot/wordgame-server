// tools/import-ranking.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { connectDB } = require("../config/database");
const Ranking = require("../models/Ranking");

(async () => {
  try {
    await connectDB();

    const filePath = path.join(process.cwd(), "ranking2.db");
    const text = fs.readFileSync(filePath, "utf8");
    const lines = text.split("\n").filter(Boolean);

    const docs = lines.map(line => {
      const obj = JSON.parse(line);
      delete obj._id; // drop NeDB _id
      return obj;
    });

    if (!docs.length) {
      console.log("No lines found in ranking2.db");
      process.exit(0);
    }

    await Ranking.insertMany(docs);
    console.log("Imported", docs.length, "ranking docs");
    process.exit(0);
  } catch (err) {
    console.error("Import error:", err);
    process.exit(1);
  }
})();
