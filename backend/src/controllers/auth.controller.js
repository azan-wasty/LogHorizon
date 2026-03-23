const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../prismaClient");

function isValidEmail(email) {
    return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function safeUser(user) {
    if (!user) return null;
    const { passwordHash, ...rest } = user;
    return rest;
}

async function register(req, res) {
    try {
        const { username, email, password } = req.body || {};

        if (typeof username !== "string" || username.trim().length < 3) {
            return res.status(400).json({ ok: false, message: "username must be at least 3 characters" });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ ok: false, message: "email is invalid" });
        }
        if (typeof password !== "string" || password.length < 8) {
            return res.status(400).json({ ok: false, message: "password must be at least 8 characters" });
        }

        const normalizedUsername = username.trim();
        const normalizedEmail = email.trim().toLowerCase();

        const [existingByEmail, existingByUsername] = await Promise.all([
            prisma.user.findUnique({ where: { email: normalizedEmail } }),
            prisma.user.findUnique({ where: { username: normalizedUsername } }),
        ]);

        if (existingByEmail) return res.status(409).json({ ok: false, message: "email already in use" });
        if (existingByUsername) return res.status(409).json({ ok: false, message: "username already in use" });

        const passwordHash = await bcrypt.hash(password, 12);

        const created = await prisma.user.create({
            data: { username: normalizedUsername, email: normalizedEmail, passwordHash },
        });

        return res.status(201).json({ ok: true, message: "registered", user: safeUser(created) });
    } catch (err) {
        if (err && err.code === "P2002") {
            return res.status(409).json({ ok: false, message: "username or email already in use" });
        }
        console.error("register error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

async function login(req, res) {
    try {
        const { email, password } = req.body || {};

        if (!isValidEmail(email)) return res.status(400).json({ ok: false, message: "email is invalid" });
        if (typeof password !== "string" || password.length === 0) {
            return res.status(400).json({ ok: false, message: "password is required" });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!user) return res.status(401).json({ ok: false, message: "invalid credentials" });

        const matches = await bcrypt.compare(password, user.passwordHash);
        if (!matches) return res.status(401).json({ ok: false, message: "invalid credentials" });

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) return res.status(500).json({ ok: false, message: "server misconfigured" });

        const token = jwt.sign(
            { sub: String(user.id), role: user.role },
            jwtSecret,
            { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
        );

        return res.status(200).json({ ok: true, message: "logged in", token, user: safeUser(user) });
    } catch (err) {
        console.error("login error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

module.exports = { register, login };