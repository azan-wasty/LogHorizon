const express = require("express");
const prisma = require("../prismaClient");
const router = express.Router();

// GET /api/tags  — public list of all tags, grouped by type
router.get("/", async (req, res) => {
    try {
        const tags = await prisma.tag.findMany({
            orderBy: [{ type: "asc" }, { name: "asc" }],
        });

        const grouped = tags.reduce((acc, tag) => {
            if (!acc[tag.type]) acc[tag.type] = [];
            acc[tag.type].push(tag);
            return acc;
        }, {});

        return res.status(200).json({ ok: true, tags: grouped });
    } catch (err) {
        console.error("listTags public error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
});

module.exports = router;