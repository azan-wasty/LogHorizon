const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const { getMyLibrary, updateLibrary, removeFromLibrary, markAllCompleted } = require("../controllers/library.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/", getMyLibrary);
router.post("/update", updateLibrary);
router.post("/mark-all-completed", markAllCompleted);
router.delete("/:contentId", removeFromLibrary);

module.exports = router;
