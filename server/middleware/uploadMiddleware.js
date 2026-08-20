const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const imageOrPdfTypes = new Set([...imageTypes, "application/pdf"]);

// Files are stored on the server disk under /uploads and served by Nginx.
function makeUploader(folder, allowedTypes = imageTypes) {
  const dest = path.join(UPLOAD_ROOT, folder);
  fs.mkdirSync(dest, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => {
      const ext = (path.extname(file.originalname) || "").toLowerCase();
      cb(null, crypto.randomBytes(16).toString("hex") + ext);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!allowedTypes.has(file.mimetype)) {
        return cb(new Error(allowedTypes === imageOrPdfTypes
          ? "Only JPG, PNG, WEBP, GIF or PDF files are allowed"
          : "Only JPG, PNG, WEBP or GIF images are allowed"));
      }
      cb(null, true);
    },
  });

  const toPublic = (f) => { if (f && f.filename) f.path = `/uploads/${folder}/${f.filename}`; };

  const wrap = (mw) => (req, res, next) =>
    mw(req, res, (err) => {
      if (err) return next(err);
      if (req.file) toPublic(req.file);
      if (Array.isArray(req.files)) req.files.forEach(toPublic);
      else if (req.files) Object.values(req.files).flat().forEach(toPublic);
      next();
    });

  return {
    single: (field) => wrap(upload.single(field)),
    array: (field, max) => wrap(upload.array(field, max)),
    fields: (fields) => wrap(upload.fields(fields)),
  };
}

const uploadProduct = makeUploader("products");
const uploadDocument = makeUploader("documents");
const uploadLogo = makeUploader("logos");
const uploadCustomerPhoto = makeUploader("customers");
const uploadCustomerIdDocument = makeUploader("customer-ids", imageOrPdfTypes);
const uploadSupportAttachment = makeUploader("support");

module.exports = {
  uploadProduct,
  uploadDocument,
  uploadLogo,
  uploadCustomerPhoto,
  uploadCustomerIdDocument,
  uploadSupportAttachment
};