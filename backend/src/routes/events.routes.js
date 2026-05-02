const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const { listEvents, createEvent, updateEvent, deleteEvent } = require("../controllers/events.controller");

const router = express.Router();

// Public — list events
router.get("/", listEvents);

// Auth required — create / update / delete
router.post("/", requireAuth, createEvent);
router.put("/:id", requireAuth, updateEvent);
router.delete("/:id", requireAuth, deleteEvent);

module.exports = router;