const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const { createDiscordRecommendation } = require("../controllers/discord.controller");

const router = express.Router();

// Require a valid JWT
router.use(requireAuth);

router.post("/", createDiscordRecommendation);

module.exports = router;
