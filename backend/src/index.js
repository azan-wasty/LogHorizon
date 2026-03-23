const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// ---- Routes ----
app.use("/api", require("./routes/auth.routes"));
app.use("/api", require("./routes/me.routes"));

// Preferences
app.use("/api/preferences", require("./routes/preferences.routes"));

// Other feature routes
app.use("/api/tags", require("./routes/tags.routes"));
app.use("/api/content", require("./routes/content.routes"));
app.use("/api/admin", require("./routes/admin.routes"));

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
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;