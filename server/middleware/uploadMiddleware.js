const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "rental-system/deposit-documents",
    allowed_formats: ["jpg", "jpeg", "png", "pdf"]
  }
});

const upload = multer({ storage });

module.exports = upload;
