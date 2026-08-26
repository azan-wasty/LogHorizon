const express = require("express");
const router = express.Router();
const multer = require("multer");
const { requireAuth } = require("../middleware/auth.middleware");

// NOTE: this backend runs as a Vercel serverless function (see vercel.json /
// serverless-http in index.js). Serverless functions have a read-only /
// ephemeral filesystem, so writing avatars to disk (the old approach) silently
// lost every uploaded file between invocations. Instead we keep the upload in
// memory and hand back a base64 data URI, which the frontend already stores
// directly in `avatarUrl` and renders with a plain <img src=...>.
const storage = multer.memoryStorage();

const ALLOWED_EXT = /\.(jpe?g|png|webp|gif)$/i;
const ALLOWED_MIME = /^image\/(jpe?g|png|webp|gif)$/i;
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2MB — kept small since this ends up as text in Postgres

const upload = multer({
  storage,
  limits: { fileSize: MAX_AVATAR_BYTES },
  fileFilter: (req, file, cb) => {
    const isMimeAllowed = ALLOWED_MIME.test(file.mimetype);
    const isExtAllowed = ALLOWED_EXT.test(file.originalname || "");

    if (isMimeAllowed && isExtAllowed) {
      return cb(null, true);
    }
    cb(new Error("Only images are allowed (jpg, jpeg, png, webp, gif)"));
  },
});

router.post("/upload-avatar", requireAuth, (req, res) => {
  upload.single("avatar")(req, res, (err) => {
    if (err) {
      const message = err.code === "LIMIT_FILE_SIZE"
        ? "File is too large (max 2MB)"
        : (err.message || "Upload failed");
      return res.status(400).json({ ok: false, message });
    }

    if (!req.file) {
      return res.status(400).json({ ok: false, message: "No file uploaded" });
    }

    // Double-check the real bytes look like an image, not just a spoofed
    // extension/mimetype header — reject anything that isn't a known image
    // magic-number signature.
    if (!looksLikeImage(req.file.buffer)) {
      return res.status(400).json({ ok: false, message: "File does not appear to be a valid image" });
    }

    const base64 = req.file.buffer.toString("base64");
    const dataUri = `data:${req.file.mimetype};base64,${base64}`;
    return res.json({ ok: true, url: dataUri });
  });
});

// Minimal magic-number sniffing for the four formats we accept.
function looksLikeImage(buf) {
  if (!buf || buf.length < 12) return false;
  const hex = buf.subarray(0, 12).toString("hex");
  if (hex.startsWith("ffd8ff")) return true; // JPEG
  if (hex.startsWith("89504e470d0a1a0a")) return true; // PNG
  if (hex.startsWith("47494638")) return true; // GIF
  if (hex.startsWith("52494646") && buf.subarray(8, 12).toString("ascii") === "WEBP") return true; // WEBP (RIFF....WEBP)
  return false;
}

module.exports = router;