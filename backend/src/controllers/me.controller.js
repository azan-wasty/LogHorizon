const prisma = require("../prismaClient");
const achievementsService = require("../services/AchievementsService");

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

    return res.status(200).json({ ok: true, user: safeUser(user), achievements });
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

module.exports = { getMe, updateMe };