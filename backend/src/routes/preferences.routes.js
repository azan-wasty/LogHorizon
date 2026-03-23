const express = require("express");
const router = express.Router();

// Placeholder endpoints (implement next)
router.get("/", (req, res) => {
    res.status(501).json({ ok: false, message: "Not implemented: list preferences" });
});

module.exports = router;