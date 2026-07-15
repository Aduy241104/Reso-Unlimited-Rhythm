import multer from "multer";

// Store files in memory before uploading to Cloudinary
const storage = multer.memoryStorage();

const ALLOWED_AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/x-aac",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/vnd.wave",
  "audio/flac",
  "audio/x-flac",
]);

const ALLOWED_AUDIO_EXTENSIONS = new Set([
  ".mp3",
  ".m4a",
  ".aac",
  ".wav",
  ".flac",
]);

const fileFilter = (req, file, cb) => {
  const lowerFileName = String(file.originalname || "").toLowerCase();
  const hasAllowedAudioExtension = [...ALLOWED_AUDIO_EXTENSIONS].some((extension) =>
    lowerFileName.endsWith(extension)
  );
  const hasAllowedAudioMimeType = ALLOWED_AUDIO_MIME_TYPES.has(file.mimetype);

  // Accept audio files (for audioFiles)
  if (
    file.fieldname === "audioFiles" &&
    (hasAllowedAudioMimeType || hasAllowedAudioExtension)
  ) {
    cb(null, true);
  }
  // Sync lyrics: .lrc (timed text)
  else if (file.fieldname === "lyricsSync") {
    const extOk = lowerFileName.endsWith(".lrc");
    const mimeOk =
      file.mimetype.startsWith("text/") ||
      file.mimetype === "application/octet-stream" ||
      file.mimetype === "application/x-subrip";

    if (extOk || mimeOk) {
      cb(null, true);
    } else {
      cb(new Error("Sync lyrics must be a .lrc file (or plain text)."), false);
    }
  }
  // Accept image files (for avatar and coverImages)
  else if (
    (file.fieldname === "avatar" || file.fieldname === "coverImages" || file.fieldname === "coverImage") &&
    file.mimetype.startsWith("image/")
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type for ${file.fieldname}. Allowed source audio formats: ${[
          ...ALLOWED_AUDIO_EXTENSIONS,
        ].join(", ")}`
      ),
      false
    );
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
