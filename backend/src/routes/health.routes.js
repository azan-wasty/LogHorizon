const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.json({ ok: true, message: "LogHorizon backend is up" });
});

module.exports = router;