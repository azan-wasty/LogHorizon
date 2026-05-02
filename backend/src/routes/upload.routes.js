const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { requireAuth } = require("../middleware/auth.middleware");

// Ensure directory exists
const uploadDir = path.join(__dirname, "../../uploads/avatars");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "avatar-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    console.log("Filtering file:", file.originalname, file.mimetype);
    const allowedExtensions = /^\.(jpe?g|png|webp|gif)$/i;
    const allowedMimeTypes = /^image\/(jpe?g|png|webp|gif)$/i;
    
    const ext = path.extname(file.originalname).toLowerCase();
    const isExtAllowed = allowedExtensions.test(ext);
    const isMimeAllowed = allowedMimeTypes.test(file.mimetype);

    if (isExtAllowed && isMimeAllowed) {
      return cb(null, true);
    }
    console.log("File rejected:", { ext, mimetype: file.mimetype });
    cb(new Error("Only images are allowed (jpg, jpeg, png, webp, gif)"));
  },
});

router.post("/upload-avatar", requireAuth, upload.single("avatar"), (req, res) => {
  console.log("Avatar upload request received");
  if (!req.file) {
    console.log("No file in request");
    return res.status(400).json({ ok: false, message: "No file uploaded" });
  }

  console.log("File uploaded:", req.file.filename);
  // Return the relative path for the frontend
  const filePath = `/uploads/avatars/${req.file.filename}`;
  res.json({ ok: true, url: filePath });
});

module.exports = router;
