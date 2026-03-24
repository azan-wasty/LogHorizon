const prisma = require("../prismaClient");
const ingestionService = require("../services/IngestionService");

// ─────────────────────────────────────────
// CONTENT
// ─────────────────────────────────────────

/**
 * POST /api/admin/content/ingest
 * Body: { title, category }
 */
async function ingestContent(req, res) {
    try {
        const { title, category } = req.body || {};
        if (!title || !category) {
            return res.status(400).json({ ok: false, message: "title and category are required" });
        }

        let result;
        if (category === "Anime" || category === "Manga") {
            result = await ingestionService.ingestAnime(title);
        } else if (category === "Movie" || category === "TV") {
            result = await ingestionService.ingestMovie(title, category === "TV");
        } else if (category === "Book") {
            result = await ingestionService.ingestBook(title);
        } else {
            return res.status(400).json({ ok: false, message: `Category '${category}' ingestion not supported yet.` });
        }

        if (!result.ok) {
            return res.status(500).json({ ok: false, message: result.message });
        }

        return res.status(201).json({ ok: true, content: result.content });
    } catch (err) {
        console.error("ingestContent error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * GET /api/admin/content
 * List all content with their tags.
 */
async function listContent(req, res) {
    try {
        const content = await prisma.content.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                tags: {
                    include: { tag: true },
                },
            },
        });

        const formatted = content.map(formatContent);
        return res.status(200).json({ ok: true, content: formatted });
    } catch (err) {
        console.error("listContent error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * GET /api/admin/content/:id
 */
async function getContent(req, res) {
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
        console.error("getContent error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * POST /api/admin/content
 * Body: { title, category, description, discordLink?, tagIds? }
 */
async function createContent(req, res) {
    try {
        const { title, category, description, discordLink, tagIds,
            externalId, source, coverImage, rating } = req.body || {};

        const errors = validateContentBody({ title, category, description });
        if (errors) return res.status(400).json({ ok: false, message: errors });

        const resolvedTagIds = await resolveTagIds(tagIds);
        if (resolvedTagIds.error) {
            return res.status(400).json({ ok: false, message: resolvedTagIds.error, missing: resolvedTagIds.missing });
        }

        const created = await prisma.content.create({
            data: {
                title: title.trim(),
                category: category.trim(),
                description: description.trim(),
                discordLink: discordLink?.trim() || null,
                externalId: externalId?.trim() || null,
                source: source?.trim() || null,
                coverImage: coverImage?.trim() || null,
                rating: rating != null ? Number(rating) : null,
                tags: {
                    create: resolvedTagIds.ids.map((tagId) => ({ tagId })),
                },
            },
            include: { tags: { include: { tag: true } } },
        });

        return res.status(201).json({ ok: true, content: formatContent(created) });
    } catch (err) {
        console.error("createContent error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * PUT /api/admin/content/:id
 * Body: { title?, category?, description?, discordLink?, tagIds? }
 * Replaces tags entirely if tagIds is provided.
 */
async function updateContent(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ ok: false, message: "invalid id" });
        }

        const existing = await prisma.content.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ ok: false, message: "content not found" });

        const { title, category, description, discordLink, tagIds,
            externalId, source, coverImage, rating } = req.body || {};

        const dataUpdate = {};
        if (title !== undefined) {
            if (typeof title !== "string" || title.trim().length === 0)
                return res.status(400).json({ ok: false, message: "title cannot be empty" });
            dataUpdate.title = title.trim();
        }
        if (category !== undefined) {
            if (typeof category !== "string" || category.trim().length === 0)
                return res.status(400).json({ ok: false, message: "category cannot be empty" });
            dataUpdate.category = category.trim();
        }
        if (description !== undefined) {
            if (typeof description !== "string" || description.trim().length === 0)
                return res.status(400).json({ ok: false, message: "description cannot be empty" });
            dataUpdate.description = description.trim();
        }
        if (discordLink !== undefined) dataUpdate.discordLink = discordLink?.trim() || null;
        if (externalId !== undefined) dataUpdate.externalId = externalId?.trim() || null;
        if (source !== undefined) dataUpdate.source = source?.trim() || null;
        if (coverImage !== undefined) dataUpdate.coverImage = coverImage?.trim() || null;
        if (rating !== undefined) dataUpdate.rating = rating != null ? Number(rating) : null;

        // Handle tags replacement in a transaction
        let updated;
        if (tagIds !== undefined) {
            const resolvedTagIds = await resolveTagIds(tagIds);
            if (resolvedTagIds.error) {
                return res.status(400).json({ ok: false, message: resolvedTagIds.error, missing: resolvedTagIds.missing });
            }

            await prisma.$transaction([
                prisma.contentTag.deleteMany({ where: { contentId: id } }),
                prisma.contentTag.createMany({
                    data: resolvedTagIds.ids.map((tagId) => ({ contentId: id, tagId })),
                }),
                prisma.content.update({ where: { id }, data: dataUpdate }),
            ]);

            updated = await prisma.content.findUnique({
                where: { id },
                include: { tags: { include: { tag: true } } },
            });
        } else {
            updated = await prisma.content.update({
                where: { id },
                data: dataUpdate,
                include: { tags: { include: { tag: true } } },
            });
        }

        return res.status(200).json({ ok: true, content: formatContent(updated) });
    } catch (err) {
        console.error("updateContent error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * DELETE /api/admin/content/:id
 */
async function deleteContent(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ ok: false, message: "invalid id" });
        }

        const existing = await prisma.content.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ ok: false, message: "content not found" });

        await prisma.content.delete({ where: { id } });

        return res.status(200).json({ ok: true, message: "content deleted" });
    } catch (err) {
        console.error("deleteContent error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

// ─────────────────────────────────────────
// TAGS
// ─────────────────────────────────────────

/**
 * GET /api/admin/tags
 */
async function listTags(req, res) {
    try {
        const tags = await prisma.tag.findMany({
            orderBy: [{ type: "asc" }, { name: "asc" }],
        });
        return res.status(200).json({ ok: true, tags });
    } catch (err) {
        console.error("listTags error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * GET /api/admin/tags/:id
 */
async function getTag(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ ok: false, message: "invalid id" });
        }

        const tag = await prisma.tag.findUnique({ where: { id } });
        if (!tag) return res.status(404).json({ ok: false, message: "tag not found" });

        return res.status(200).json({ ok: true, tag });
    } catch (err) {
        console.error("getTag error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * POST /api/admin/tags
 * Body: { type, name }
 */
async function createTag(req, res) {
    try {
        const { type, name } = req.body || {};

        if (typeof type !== "string" || type.trim().length === 0)
            return res.status(400).json({ ok: false, message: "type is required" });
        if (typeof name !== "string" || name.trim().length === 0)
            return res.status(400).json({ ok: false, message: "name is required" });

        const tag = await prisma.tag.create({
            data: { type: type.trim(), name: name.trim() },
        });

        return res.status(201).json({ ok: true, tag });
    } catch (err) {
        if (err?.code === "P2002") {
            return res.status(409).json({ ok: false, message: "tag with this type and name already exists" });
        }
        console.error("createTag error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * PUT /api/admin/tags/:id
 * Body: { type?, name? }
 */
async function updateTag(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ ok: false, message: "invalid id" });
        }

        const existing = await prisma.tag.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ ok: false, message: "tag not found" });

        const { type, name } = req.body || {};
        const dataUpdate = {};

        if (type !== undefined) {
            if (typeof type !== "string" || type.trim().length === 0)
                return res.status(400).json({ ok: false, message: "type cannot be empty" });
            dataUpdate.type = type.trim();
        }
        if (name !== undefined) {
            if (typeof name !== "string" || name.trim().length === 0)
                return res.status(400).json({ ok: false, message: "name cannot be empty" });
            dataUpdate.name = name.trim();
        }

        const updated = await prisma.tag.update({ where: { id }, data: dataUpdate });

        return res.status(200).json({ ok: true, tag: updated });
    } catch (err) {
        if (err?.code === "P2002") {
            return res.status(409).json({ ok: false, message: "tag with this type and name already exists" });
        }
        console.error("updateTag error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * DELETE /api/admin/tags/:id
 */
async function deleteTag(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ ok: false, message: "invalid id" });
        }

        const existing = await prisma.tag.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ ok: false, message: "tag not found" });

        await prisma.tag.delete({ where: { id } });

        return res.status(200).json({ ok: true, message: "tag deleted" });
    } catch (err) {
        console.error("deleteTag error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

// ─────────────────────────────────────────
// USERS
// ─────────────────────────────────────────

/**
 * GET /api/admin/users
 */
async function listUsers(req, res) {
    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                createdAt: true
            }
        });
        return res.status(200).json({ ok: true, users });
    } catch (err) {
        console.error("listUsers error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * PUT /api/admin/users/:id/role
 * Body: { role }
 */
async function updateUserRole(req, res) {
    try {
        const id = Number(req.params.id);
        const { role } = req.body || {};

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ ok: false, message: "invalid id" });
        }

        if (role !== "ADMIN" && role !== "USER") {
            return res.status(400).json({ ok: false, message: "invalid role. Use 'ADMIN' or 'USER'" });
        }

        const updated = await prisma.user.update({
            where: { id },
            data: { role },
            select: { id: true, username: true, role: true }
        });

        return res.status(200).json({ ok: true, user: updated });
    } catch (err) {
        console.error("updateUserRole error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function validateContentBody({ title, category, description }) {
    if (typeof title !== "string" || title.trim().length === 0) return "title is required";
    if (typeof category !== "string" || category.trim().length === 0) return "category is required";
    if (typeof description !== "string" || description.trim().length === 0) return "description is required";
    return null;
}

async function resolveTagIds(tagIds) {
    if (tagIds === undefined || tagIds === null) return { ids: [] };

    if (!Array.isArray(tagIds)) return { error: "tagIds must be an array" };

    const ids = [...new Set(tagIds)]
        .map((x) => Number(x))
        .filter((n) => Number.isInteger(n) && n > 0);

    if (ids.length === 0) return { ids: [] };

    const existing = await prisma.tag.findMany({
        where: { id: { in: ids } },
        select: { id: true },
    });
    const existingIds = new Set(existing.map((t) => t.id));
    const missing = ids.filter((id) => !existingIds.has(id));

    if (missing.length > 0) {
        return { error: "some tagIds do not exist", missing };
    }

    return { ids };
}

function formatContent(item) {
    return {
        ...item,
        tags: item.tags?.map((ct) => ct.tag) || [],
    };
}

module.exports = {
    ingestContent,
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
    listUsers,
    updateUserRole,
};