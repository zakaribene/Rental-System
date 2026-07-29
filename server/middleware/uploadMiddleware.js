const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const imageOrPdfTypes = new Set([...imageTypes, "application/pdf"]);

// Uploads go straight to Cloudinary instead of local disk, so they survive
// redeploys/restarts on ephemeral hosting (Render, Vercel, etc.) where the
// filesystem is wiped between runs.
function makeUploader(folder, allowedTypes = imageTypes) {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `rental-system/${folder}`,
      resource_type: "auto",
      allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "pdf"]
    }
  });

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!allowedTypes.has(file.mimetype)) {
        return cb(new Error(allowedTypes === imageOrPdfTypes ? "Only JPG, PNG, WEBP, GIF or PDF files are allowed" : "Only JPG, PNG, WEBP or GIF images are allowed"));
      }
      cb(null, true);
    }
  });
}

const uploadProduct = makeUploader("products");
const uploadDocument = makeUploader("documents");
const uploadLogo = makeUploader("logos");
const uploadCustomerPhoto = makeUploader("customers");
const uploadCustomerIdDocument = makeUploader("customer-ids", imageOrPdfTypes);

module.exports = { uploadProduct, uploadDocument, uploadLogo, uploadCustomerPhoto, uploadCustomerIdDocument };
