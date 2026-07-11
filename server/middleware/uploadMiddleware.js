const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function makeUploader(subfolder) {
  const dir = path.join(__dirname, "..", "uploads", subfolder);
  fs.mkdirSync(dir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!allowedTypes.has(file.mimetype)) {
        return cb(new Error("Only JPG, PNG, WEBP or GIF images are allowed"));
      }
      cb(null, true);
    },
  });
}

const uploadProduct = makeUploader("products");
const uploadDocument = makeUploader("documents");
const uploadLogo = makeUploader("logos");

module.exports = { uploadProduct, uploadDocument, uploadLogo };
