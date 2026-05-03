const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (origin.endsWith(".vercel.app")) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

app.use(express.json());

// ---- Routes ----
app.use("/api", require("./routes/auth.routes"));
app.use("/api", require("./routes/me.routes"));
app.use("/api/preferences", require("./routes/preferences.routes"));
app.use("/api/recommendations", require("./routes/recommendations.routes"));
app.use("/api/tags", require("./routes/tags.routes"));
app.use("/api/content", require("./routes/content.routes"));
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/library", require("./routes/library.routes"));
app.use("/api/discord-recommendations", require("./routes/discord.routes"));
app.use("/api/events", require("./routes/events.routes"));
app.use("/api/users", require("./routes/community.routes"));
app.use("/api/favourites", require("./routes/favourites.routes"));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "LogHorizon backend is up" });
});

app.use("/api", (req, res) => {
  res.status(404).json({ ok: false, message: "Not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ ok: false, message: "Internal server error" });
});

const PORT = process.env.PORT || 6767;

// Only listen when running locally, not on Vercel
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;