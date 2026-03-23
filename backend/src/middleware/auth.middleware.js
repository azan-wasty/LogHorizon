const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
    try {
        const header = req.headers.authorization || req.headers.Authorization;

        if (!header || typeof header !== "string") {
            return res.status(401).json({ ok: false, message: "missing Authorization header" });
        }

        const [scheme, token] = header.split(" ");
        if (scheme !== "Bearer" || !token) {
            return res.status(401).json({ ok: false, message: "invalid Authorization header format" });
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error("Missing JWT_SECRET env var");
            return res.status(500).json({ ok: false, message: "server misconfigured" });
        }

        const payload = jwt.verify(token, jwtSecret);

        // Attach minimal identity info to request
        req.user = {
            id: Number(payload.sub),
            role: payload.role,
        };

        return next();
    } catch (err) {
        // Token expired / invalid / signature mismatch
        return res.status(401).json({ ok: false, message: "invalid or expired token" });
    }
}

module.exports = { requireAuth };