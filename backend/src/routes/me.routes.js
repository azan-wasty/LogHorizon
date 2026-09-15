const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const { getMe, updateMe, togglePinnedAchievement, deleteMe } = require("../controllers/me.controller");

const router = express.Router();

router.get("/me", requireAuth, getMe);
router.put("/me", requireAuth, updateMe);
router.delete("/me", requireAuth, deleteMe);
router.put("/me/achievements/:key/pin", requireAuth, togglePinnedAchievement);

module.exports = router;