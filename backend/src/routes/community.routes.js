const express = require("express");
const { searchUsers, getUserProfile } = require("../controllers/community.controller");

const router = express.Router();

// Public routes — no auth required
router.get("/search", searchUsers);
router.get("/:id/profile", getUserProfile);

module.exports = router;