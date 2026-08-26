const prisma = require("../prismaClient");
const achievementsService = require("../services/AchievementsService");

// Accepts:
//  - a data URI we generated ourselves from the upload endpoint (data:image/...)
//  - an http(s) URL that plainly points at an image file
// Rejects everything else (javascript:, arbitrary non-image URLs, etc).
const DATA_IMAGE_RE = /^data:image\/(jpe?g|png|webp|gif);base64,/i;
const IMAGE_URL_RE = /^https?:\/\/[^\s]+\.(jpe?g|png|webp|gif|avif)(\?[^\s]*)?$/i;

function isValidAvatarUrl(url) {
  if (!url) return true; // clearing the avatar is fine
  return DATA_IMAGE_RE.test(url) || IMAGE_URL_RE.test(url);
}

function safeUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

async function getMe(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId || Number.isNaN(Number(userId))) {
      return res.status(401).json({ ok: false, message: "unauthorized" });
    }

    const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
    if (!user) return res.status(404).json({ ok: false, message: "user not found" });

    const achievements = await achievementsService.getUserAchievements(Number(userId));
    const pinnedAchievements = achievements.filter(a => a.pinned);

    const favourites = await prisma.favourite.findMany({
      where: { userId: Number(userId) },
      include: {
        content: {
          select: {
            id: true,
            title: true,
            category: true,
            coverImage: true,
            rating: true,
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.status(200).json({ ok: true, user: safeUser(user), achievements, pinnedAchievements, favourites });
  } catch (err) {
    console.error("getMe error:", err);
    return res.status(500).json({ ok: false, message: "internal server error" });
  }
}

async function updateMe(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ ok: false, message: "unauthorized" });

    const { bio, avatarUrl } = req.body || {};

    if (avatarUrl !== undefined && !isValidAvatarUrl(avatarUrl)) {
      return res.status(400).json({ ok: false, message: "Avatar must be an uploaded image or a direct link to a .jpg/.png/.webp/.gif image" });
    }

    const updateData = {};
    if (bio !== undefined) updateData.bio = bio;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    const user = await prisma.user.update({
      where: { id: Number(userId) },
      data: updateData
    });

    return res.status(200).json({ ok: true, user: safeUser(user) });
  } catch (err) {
    console.error("updateMe error:", err);
    return res.status(500).json({ ok: false, message: "internal server error" });
  }
}

module.exports = { getMe, updateMe, togglePinnedAchievement };


async function togglePinnedAchievement(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ ok: false, message: "unauthorized" });

    const { key } = req.params;
    const { pinned } = req.body || {};

    const result = await achievementsService.setPinned(Number(userId), key, !!pinned);
    if (!result) return res.status(404).json({ ok: false, message: "achievement not found or not unlocked" });

    return res.json({ ok: true, achievement: result });
  } catch (err) {
    if (err.code === "PIN_LIMIT") {
      return res.status(400).json({ ok: false, message: err.message });
    }
    console.error("togglePinnedAchievement error:", err);
    return res.status(500).json({ ok: false, message: "internal server error" });
  }
}