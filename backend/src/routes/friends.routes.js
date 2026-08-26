const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const { getMyFriends, addFriend, removeFriend } = require("../controllers/friends.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/", getMyFriends);
router.post("/:userId", addFriend);
router.delete("/:userId", removeFriend);

module.exports = router;