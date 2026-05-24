import multer from "multer";

// Store files in memory before uploading to Cloudinary
const storage = multer.memoryStorage();

const ALLOWED_AUDIO_FORMATS = [
  "audio/mpeg",      // MP3
  "audio/mp4",       // M4A, MP4 audio
  "audio/wav",       // WAV
  "audio/webm",      // WebM
  "audio/ogg",       // OGG
  "video/mp4",       // MP4 video container (for audio)
];

const fileFilter = (req, file, cb) => {
  // Accept audio files (for audioFiles)
  if (file.fieldname === "audioFiles" && (file.mimetype.startsWith("audio/") || ALLOWED_AUDIO_FORMATS.includes(file.mimetype))) {
    cb(null, true);
  }
  // Sync o3ics: .lrc (timed text)
  else if (file.fieldname === "o3icsSync") {
    const name = (file.originalname || "").toLowerCase();
    const extOk = name.endsWith(".lrc");
    const mimeOk =
      file.mimetype.startsWith("text/") ||
      file.mimetype === "application/octet-stream" ||
      file.mimetype === "application/x-subrip";

    if (extOk || mimeOk) {
      cb(null, true);
    } else {
      cb(new Error("Sync o3ics must be a .lrc file (or plain text)."), false);
    }
  }
  // Accept image files (for avatar and coverImages)
  else if (
    (file.fieldname === "avatar" || file.fieldname === "coverImages" || file.fieldname === "coverImage") &&
    file.mimetype.startsWith("image/")
  ) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type for ${file.fieldname}. Allowed audio formats: ${ALLOWED_AUDIO_FORMATS.join(", ")}`), false);
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
