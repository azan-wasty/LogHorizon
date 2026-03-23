const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const {
    getPreferenceOptions,
    getMyPreferences,
    setMyPreferences,
    seedPreferenceOptions,
} = require("../controllers/preferences.controller");

const router = express.Router();

router.get("/options", getPreferenceOptions);
router.get("/me", requireAuth, getMyPreferences);

router.post("/", requireAuth, setMyPreferences);
router.post("/seed", seedPreferenceOptions);

module.exports = router;