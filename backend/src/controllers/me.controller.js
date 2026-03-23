const prisma = require("../prismaClient");

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

    return res.status(200).json({ ok: true, user: safeUser(user) });
  } catch (err) {
    console.error("getMe error:", err);
    return res.status(500).json({ ok: false, message: "internal server error" });
  }
}

module.exports = { getMe };