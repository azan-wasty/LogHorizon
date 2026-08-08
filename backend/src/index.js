const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");
require("dotenv").config();

const app = express();

// ---- CORS Configuration ----
const rawFrontendUrl = process.env.FRONTEND_URL || "";
const cleanFrontendUrl = rawFrontendUrl.replace(/\/$/, ""); // Remove trailing slash

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  cleanFrontendUrl,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server or no-origin requests (like mobile apps or curl)
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.includes(origin);
    const isVercel = origin.endsWith(".vercel.app");

    if (isAllowed || isVercel) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
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
app.use("/api/subreddit-recommendations", require("./routes/subreddit.routes"));
app.use("/api/events", require("./routes/events.routes"));
app.use("/api/users", require("./routes/community.routes"));
app.use("/api/favourites", require("./routes/favourites.routes"));
app.use("/api/reviews", require("./routes/review.routes"));

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

// Listen on the provided port (Render/Local)
// We only skip listen if we are explicitly told we are in a serverless environment (like Vercel)
if (process.env.VERCEL !== '1' && process.env.CLOUDFLARE_WORKER !== 'true') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Wrap express app
const handler = serverless(app);

// Fallback for Vercel/Local Node.js
module.exports = app;

// Export CommonJS fetch handler for Cloudflare Workers
module.exports.fetch = async (request, env, ctx) => {
  return handler(request, env, ctx);
};