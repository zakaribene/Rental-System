const cloudinary = require("cloudinary").v2;

// CLOUDINARY_URL env var is picked up automatically by the SDK.
cloudinary.config({ secure: true });

module.exports = cloudinary;
