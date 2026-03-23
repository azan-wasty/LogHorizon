const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.status(501).json({ ok: false, message: "Not implemented: list tags" });
});

module.exports = router;