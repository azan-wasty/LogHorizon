const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const { getMyFavourites, addFavourite, removeFavourite } = require("../controllers/favourites.controller");

const router = express.Router();

// All favourites routes require auth
router.get("/", requireAuth, getMyFavourites);
router.post("/", requireAuth, addFavourite);
router.delete("/:contentId", requireAuth, removeFavourite);

module.exports = router;
