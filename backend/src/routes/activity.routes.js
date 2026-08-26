const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const { getFeed } = require("../controllers/activity.controller");

const router = express.Router();

router.get("/feed", requireAuth, getFeed);

module.exports = router;