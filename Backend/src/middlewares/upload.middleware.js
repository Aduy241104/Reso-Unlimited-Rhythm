import multer from "multer";

// Store files in memory before uploading to Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accept audio files (for audioFiles)
  if (file.fieldname === "audioFiles" && file.mimetype.startsWith("audio/")) {
    cb(null, true);
  }
  // Accept image files (for avatar and coverImages)
  else if (
    (file.fieldname === "avatar" || file.fieldname === "coverImages") &&
    file.mimetype.startsWith("image/")
  ) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type for ${file.fieldname}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
});

export default upload;