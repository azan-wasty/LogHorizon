const express = require("express");
const { searchUsers, getUserProfile } = require("../controllers/community.controller");
const { getUserFavourites } = require("../controllers/favourites.controller");

const router = express.Router();

// Public routes — no auth required
router.get("/search", searchUsers);
router.get("/:id/profile", getUserProfile);
router.get("/:id/favourites", getUserFavourites);

module.exports = router;