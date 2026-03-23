const express = require("express");
const prisma = require("../prismaClient");
const router = express.Router();

function formatContent(item) {
    return {
        ...item,
        tags: item.tags.map((ct) => ct.tag),
    };
}

// GET /api/content  — public list with optional ?category= and ?tagId= filters
router.get("/", async (req, res) => {
    try {
        const { category, tagId } = req.query;

        const where = {};
        if (category) where.category = category;
        if (tagId) {
            const tid = Number(tagId);
            if (Number.isInteger(tid) && tid > 0) {
                where.tags = { some: { tagId: tid } };
            }
        }

        const content = await prisma.content.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: { tags: { include: { tag: true } } },
        });

        return res.status(200).json({ ok: true, content: content.map(formatContent) });
    } catch (err) {
        console.error("listContent public error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
});

// GET /api/content/:id  — public single item
router.get("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ ok: false, message: "invalid id" });
        }

        const item = await prisma.content.findUnique({
            where: { id },
            include: { tags: { include: { tag: true } } },
        });

        if (!item) return res.status(404).json({ ok: false, message: "content not found" });

        return res.status(200).json({ ok: true, content: formatContent(item) });
    } catch (err) {
        console.error("getContent public error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
});

module.exports = router;