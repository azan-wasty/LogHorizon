const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");
const {
    listContent,
    getContent,
    createContent,
    updateContent,
    deleteContent,
    listTags,
    getTag,
    createTag,
    updateTag,
    deleteTag,
} = require("../controllers/admin.controller");

const router = express.Router();

// All admin routes require a valid JWT AND Admin role
router.use(requireAuth, requireAdmin);

// ── Content ──────────────────────────────
router.get("/content", listContent);
router.get("/content/:id", getContent);
router.post("/content", createContent);
router.put("/content/:id", updateContent);
router.delete("/content/:id", deleteContent);

// ── Tags ─────────────────────────────────
router.get("/tags", listTags);
router.get("/tags/:id", getTag);
router.post("/tags", createTag);
router.put("/tags/:id", updateTag);
router.delete("/tags/:id", deleteTag);

module.exports = router;
