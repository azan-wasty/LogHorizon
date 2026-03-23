function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== "Admin") {
        return res.status(403).json({ ok: false, message: "forbidden: admins only" });
    }
    return next();
}

module.exports = { requireAdmin };