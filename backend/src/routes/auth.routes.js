const express = require("express");
const router = express.Router();

// Placeholder endpoints (implement next)
router.post("/register", (req, res) => {
    res.status(501).json({ ok: false, message: "Not implemented: register" });
});

router.post("/login", (req, res) => {
    res.status(501).json({ ok: false, message: "Not implemented: login" });
});

module.exports = router;