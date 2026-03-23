const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// ---- Routes ----
// Auth routes should define /register and /login, etc.
// Because we mount at /api, auth.routes.js should use router.post("/login", ...) etc.
app.use("/api", require("./routes/auth.routes"));

// Other feature routes
app.use("/api/preferences", require("./routes/preferences.routes"));
app.use("/api/tags", require("./routes/tags.routes"));
app.use("/api/content", require("./routes/content.routes"));
app.use("/api/admin", require("./routes/admin.routes"));

// Health check (recommended, prevents guessing if server is up)
app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "LogHorizon backend is up" });
});

// 404 handler for unknown API routes
app.use("/api", (req, res) => {
  res.status(404).json({ ok: false, message: "Not found" });
});

// Basic error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ ok: false, message: "Internal server error" });
});

const PORT = process.env.PORT || 6767;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});



module.exports = app;