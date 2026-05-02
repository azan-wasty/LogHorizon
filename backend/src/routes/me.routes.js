const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const { getMe, updateMe } = require("../controllers/me.controller");

const router = express.Router();

router.get("/me", requireAuth, getMe);
router.put("/me", requireAuth, updateMe);

module.exports = router;