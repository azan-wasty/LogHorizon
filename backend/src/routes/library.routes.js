const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const { getMyLibrary, updateLibrary, removeFromLibrary } = require("../controllers/library.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/", getMyLibrary);
router.post("/update", updateLibrary);
router.delete("/:contentId", removeFromLibrary);

module.exports = router;
