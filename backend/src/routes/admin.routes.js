const express = require("express");
const router = express.Router();

// Placeholder endpoints (implement next)
router.get("/health", (req, res) => {
    res.json({ ok: true, message: "Admin route mounted" });
});

module.exports = router;