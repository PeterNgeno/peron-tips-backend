// server.js (CommonJS)
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { readSheet, appendRow } = require("./sheets");

dotenv.config();

const app = express();

// === CORS ===
// Set this to your frontend domain (e.g., https://perontips.vercel.app)
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
app.use(
  cors({
    origin: ALLOWED_ORIGIN === "*" ? true : ALLOWED_ORIGIN,
  })
);

app.use(express.json());

// Health
app.get("/", (req, res) => {
  res.send("✅ Peron Tips API is running");
});

// Read: /api/sayings?sheet=Sheet1&limit=100
app.get("/api/sayings", async (req, res) => {
  try {
    const sheet = req.query.sheet || "Sheet1";
    const limit = Number(req.query.limit || 200);
    const data = await readSheet(sheet, limit);
    res.json({ sheet, count: data.length, data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Create: POST /api/sayings
// Body: { sheet: "Sheet1", category: "Christian", title: "...", content: "..." }
app.post("/api/sayings", async (req, res) => {
  try {
    const { sheet, category, title, content } = req.body || {};
    if (!sheet) return res.status(400).json({ error: "sheet is required" });
    if (!content) return res.status(400).json({ error: "content is required" });

    await appendRow(sheet, { category, title, content });
    res.json({ ok: true, message: "Row added" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// (Optional) Simple per-category helpers
app.get("/api/christian", (req, res) =>
  readSheet("Sheet1").then((d) => res.json(d)).catch((e)=>res.status(500).json({error:e.message}))
);
app.get("/api/society", (req, res) =>
  readSheet("Sheet2").then((d) => res.json(d)).catch((e)=>res.status(500).json({error:e.message}))
);
app.get("/api/encouragement", (req, res) =>
  readSheet("Sheet3").then((d) => res.json(d)).catch((e)=>res.status(500).json({error:e.message}))
);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server listening on ${PORT}`);
});
