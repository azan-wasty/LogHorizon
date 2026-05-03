const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");
const { listEvents, listPendingEvents, approveEvent, createEvent, updateEvent, deleteEvent } = require("../controllers/events.controller");

const router = express.Router();

// Public — list events (only approved by default)
router.get("/", listEvents);

// Admin — list pending events
router.get("/pending", requireAuth, requireAdmin, listPendingEvents);

// Admin — approve/reject an event
router.put("/:id/approve", requireAuth, requireAdmin, approveEvent);

// Auth required — create / update / delete
router.post("/", requireAuth, createEvent);
router.put("/:id", requireAuth, updateEvent);
router.delete("/:id", requireAuth, deleteEvent);

module.exports = router;