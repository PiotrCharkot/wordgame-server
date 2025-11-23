require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { connectDB, mongoose } = require("../config/database");
const Grid = require("../models/Grid");

(async () => {
  try {
    await connectDB();
    const filePath = path.join(process.cwd(), "grid_answers.db");
    const text = fs.readFileSync(filePath, "utf8");
    const lines = text.split("\n").filter(Boolean);
    const docs = lines.map(l => {
      const obj = JSON.parse(l);
      delete obj._id; // let Mongo create its own
      return obj;
    });
    if (!docs.length) {
      console.log("No lines found in grid_answers.db");
      process.exit(0);
    }
    await Grid.insertMany(docs);
    console.log("Imported", docs.length, "grids");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
