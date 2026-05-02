const prisma = require("../prismaClient");

const VALID_TYPES = ["WATCH_PARTY", "DISCUSSION", "TOURNAMENT", "COMMUNITY"];
const VALID_STATUSES = ["UPCOMING", "LIVE", "ENDED"];

/**
 * GET /api/events
 * List events sorted: LIVE first, then UPCOMING by date, then ENDED.
 * Optional query: ?type=WATCH_PARTY
 */
async function listEvents(req, res) {
    try {
        const { type } = req.query;
        const where = {};
        if (type && VALID_TYPES.includes(type)) {
            where.type = type;
        }

        const events = await prisma.event.findMany({
            where,
            include: {
                host: {
                    select: { id: true, username: true, avatarUrl: true },
                },
            },
            orderBy: { startDate: "asc" },
        });

        // Custom sort: LIVE > UPCOMING > ENDED
        const ORDER = { LIVE: 0, UPCOMING: 1, ENDED: 2 };
        events.sort((a, b) => {
            const statusDiff = ORDER[a.status] - ORDER[b.status];
            if (statusDiff !== 0) return statusDiff;
            return new Date(a.startDate) - new Date(b.startDate);
        });

        return res.status(200).json({ ok: true, events });
    } catch (err) {
        console.error("listEvents error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * POST /api/events
 * Auth required. Body: { title, description, type, startDate, endDate? }
 */
async function createEvent(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ ok: false, message: "unauthorized" });

        const { title, description, type, startDate, endDate } = req.body || {};

        if (!title || typeof title !== "string" || title.trim().length === 0) {
            return res.status(400).json({ ok: false, message: "title is required" });
        }
        if (!description || typeof description !== "string" || description.trim().length === 0) {
            return res.status(400).json({ ok: false, message: "description is required" });
        }
        if (!type || !VALID_TYPES.includes(type)) {
            return res.status(400).json({ ok: false, message: `type must be one of: ${VALID_TYPES.join(", ")}` });
        }
        if (!startDate || isNaN(new Date(startDate).getTime())) {
            return res.status(400).json({ ok: false, message: "valid startDate is required" });
        }

        const event = await prisma.event.create({
            data: {
                title: title.trim(),
                description: description.trim(),
                type,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                createdBy: userId,
                status: "UPCOMING",
            },
            include: {
                host: {
                    select: { id: true, username: true, avatarUrl: true },
                },
            },
        });

        return res.status(201).json({ ok: true, event });
    } catch (err) {
        console.error("createEvent error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * PUT /api/events/:id
 * Auth required. Admins can update any event; owners can update their own.
 * Body: { title?, description?, type?, startDate?, endDate?, status? }
 */
async function updateEvent(req, res) {
    try {
        const userId = req.user?.id;
        const isAdmin = req.user?.role?.toUpperCase() === "ADMIN";
        if (!userId) return res.status(401).json({ ok: false, message: "unauthorized" });

        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ ok: false, message: "invalid id" });
        }

        const existing = await prisma.event.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ ok: false, message: "event not found" });

        if (!isAdmin && existing.createdBy !== userId) {
            return res.status(403).json({ ok: false, message: "forbidden" });
        }

        const { title, description, type, startDate, endDate, status } = req.body || {};
        const data = {};

        if (title !== undefined) data.title = title.trim();
        if (description !== undefined) data.description = description.trim();
        if (type !== undefined) {
            if (!VALID_TYPES.includes(type)) return res.status(400).json({ ok: false, message: "invalid type" });
            data.type = type;
        }
        if (startDate !== undefined) data.startDate = new Date(startDate);
        if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
        if (status !== undefined) {
            if (!VALID_STATUSES.includes(status)) return res.status(400).json({ ok: false, message: "invalid status" });
            data.status = status;
        }

        const updated = await prisma.event.update({
            where: { id },
            data,
            include: { host: { select: { id: true, username: true, avatarUrl: true } } },
        });

        return res.status(200).json({ ok: true, event: updated });
    } catch (err) {
        console.error("updateEvent error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * DELETE /api/events/:id
 * Auth required. Admins can delete any event; owners can delete their own.
 */
async function deleteEvent(req, res) {
    try {
        const userId = req.user?.id;
        const isAdmin = req.user?.role?.toUpperCase() === "ADMIN";
        if (!userId) return res.status(401).json({ ok: false, message: "unauthorized" });

        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ ok: false, message: "invalid id" });
        }

        const existing = await prisma.event.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ ok: false, message: "event not found" });

        if (!isAdmin && existing.createdBy !== userId) {
            return res.status(403).json({ ok: false, message: "forbidden" });
        }

        await prisma.event.delete({ where: { id } });

        return res.status(200).json({ ok: true, message: "event deleted" });
    } catch (err) {
        console.error("deleteEvent error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

module.exports = { listEvents, createEvent, updateEvent, deleteEvent };