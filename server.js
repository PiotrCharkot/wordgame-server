require("dotenv").config();

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const path = require("path");
const cors = require("cors");

const { connectDB, mongoose } = require("./config/database");
const Grid = require("./models/Grid");
const Ranking = require("./models/Ranking");

// --- Express + HTTP + Socket.IO
const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(http, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  }
});

// --- Basic middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || "*", credentials: true }));
app.use(express.static("public"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

// --- Sessions (only if you still need them)
if (process.env.SECRET) {
  app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions"
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
  }));
}

// --- In-memory round state (ephemeral)
let winnerList = [];
let mobileWinnerList = [];
let mobilePlayersCount = 0;
let clockCounter = 135;
let lastGrid = null;

// --- GAME LOOP (tick every second)
setInterval(async () => {
  clockCounter--;

  // Broadcast the clock to clients
  io.emit("clock", clockCounter);

  if (clockCounter === 50) {
    // “closing soon” stage; reset per-round lists
    winnerList = [];
    mobileWinnerList = [];
    io.emit("round:closingSoon");
  }

  if (clockCounter === 0) {
    clockCounter = 135;

    // finalize standings
    mobileWinnerList.sort((a, b) => b.points - a.points);
    mobileWinnerList.forEach((p, idx) => p.position = idx + 1);
    mobilePlayersCount = mobileWinnerList.length;

    // update ranking DB for entries that look like user IDs (string with some length)
    for (const p of mobileWinnerList) {
      if (typeof p.userID === "string" && p.userID.length > 20) {
        const lastPercent = (mobileWinnerList.length > 1)
          ? ((mobileWinnerList.length - p.position) * 100) / (mobileWinnerList.length - 1)
          : 100;

        await Ranking.updateOne(
          { userID: p.userID },
          { $set: { userName: p.username }, $push: { userPoints: p.points, userGames: lastPercent } },
          { upsert: true }
        );
      }
    }

    // notify clients with final results
    io.emit("round:results", mobileWinnerList);

    // Optionally clear for next round:
    // mobileWinnerList = [];
  }
}, 1000);

// --- ROUTES

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "main.html"));
});

// send a random grid + current clock
app.get("/grid", async (req, res) => {
  try {
    const [doc] = await Grid.aggregate([{ $sample: { size: 1 } }]);

    if (!doc) {
      return res.status(404).json({ error: "No grid found" });
    }

    const payload = { ...doc, clockCounter }; // 👈 no .toObject()

    res.json(payload);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// results from web
app.post("/results", (req, res) => {
  const data = req.body;
  winnerList.push(data);
  setTimeout(() => {
    winnerList.sort((a, b) => b.points - a.points);
    res.json({ winnerList });
  }, 4000);
});

// results from mobile
app.post("/resultsMobile", (req, res) => {
  const data = req.body;
  mobileWinnerList.push(data);
  setTimeout(() => {
    res.json({ mobileWinnerList });
  }, 4000);
});

// latest standings for mobile (polling fallback)
app.get("/resultsMobileBack", (req, res) => {
  // de-duplicate by userID
  const seen = new Set();
  mobileWinnerList = mobileWinnerList.filter(x => {
    const key = x.userID ?? Math.random().toString();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  mobileWinnerList.sort((a, b) => b.points - a.points);

  let pos = 0;
  for (const p of mobileWinnerList) {
    pos++;
    p.position = pos;
    p.percentOf = (mobileWinnerList.length > 1)
      ? ((mobileWinnerList.length - pos) * 100) / (mobileWinnerList.length - 1)
      : 100;
    p.counter = clockCounter;
  }

  res.json(mobileWinnerList);
});

app.get("/clock", (req, res) => {
  res.json(clockCounter);
});

app.get("/count", (req, res) => {
  res.json(mobilePlayersCount);
});

// leaderboard by avg userGames
app.get("/gettingPoints", async (req, res) => {
  try {
    const rows = await Ranking.find({});
    const avg = arr => (arr?.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0);
    rows.sort((a, b) => avg(b.userGames) - avg(a.userGames));
    rows.forEach((r, idx) => r.position = idx + 1);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// --- start
(async () => {
  await connectDB();
  const port = process.env.PORT || 3000;
  http.listen(port, () => console.log(`listening at ${port}`));
})();
