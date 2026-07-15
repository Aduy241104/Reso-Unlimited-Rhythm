export const TITLE_MAX_LENGTH = 150;
export const LYRICS_STATIC_MAX_LENGTH = 20000;
export const MAX_GENRE_IDS = 5;
export const MAX_COVER_IMAGES = 3;
export const MIN_GENRE_IDS_SUBMIT = 1;

const COPYRIGHT_FORM_KEYS = [
  "copyrightOwner",
  "recordingOwner",
  "composer",
  "lyricist",
  "producer",
  "isOriginal",
  "isCover",
  "isRemix",
  "usesSample",
  "usesLicensedBeat",
  "originalTrackTitle",
  "originalArtistName",
  "licenseDocumentUrls",
  "declarationAccepted",
  "copyrightNote",
];

export const isHttpUrl = (value) => {
  if (!value || typeof value !== "string") {
    return false;
  }

  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export const defaultCopyrightForm = () => ({
  copyrightOwner: "",
  recordingOwner: "",
  composer: "",
  lyricist: "",
  producer: "",
  isOriginal: true,
  isCover: false,
  isRemix: false,
  usesSample: false,
  usesLicensedBeat: false,
  originalTrackTitle: "",
  originalArtistName: "",
  licenseDocumentUrls: [],
  declarationAccepted: false,
  copyrightNote: "",
});

export const mapTrackCopyrightToForm = (copyright) => {
  const form = defaultCopyrightForm();

  if (!copyright || typeof copyright !== "object") {
    return form;
  }

  COPYRIGHT_FORM_KEYS.forEach((key) => {
    if (copyright[key] !== undefined && copyright[key] !== null) {
      form[key] = copyright[key];
    }
  });

  form.licenseDocumentUrls = Array.isArray(copyright.licenseDocumentUrls)
    ? copyright.licenseDocumentUrls.map((url) => String(url).trim()).filter(Boolean)
    : [];

  form.declarationAccepted = Boolean(copyright.declarationAccepted);

  return form;
};

/** Payload gửi API — bỏ field hệ thống và URL license không hợp lệ. */
export const serializeCopyrightForApi = (copyright) => {
  const form = mapTrackCopyrightToForm(copyright);

  form.licenseDocumentUrls = form.licenseDocumentUrls.filter((url) => isHttpUrl(url));

  if (!usesThirdPartyRights(form)) {
    form.licenseDocumentUrls = [];
    form.originalTrackTitle = "";
    form.originalArtistName = "";
  }

  return form;
};

export const hasCoverOrAvatar = (track) => {
  const avatar = typeof track?.avatar === "string" ? track.avatar.trim() : "";
  const covers = Array.isArray(track?.coverImage)
    ? track.coverImage.filter(Boolean)
    : [];

  return Boolean(avatar) || covers.length > 0;
};

export const hasOriginalAudio = (track) => {
  const files = Array.isArray(track?.audioFiles) ? track.audioFiles : [];
  return files.some((file) => file?.label === "original");
};

export const usesThirdPartyRights = (copyright) =>
  Boolean(
    copyright?.isCover ||
      copyright?.isRemix ||
      copyright?.usesSample ||
      copyright?.usesLicensedBeat
  );

export const getSubmitReadinessIssues = (track) => {
  if (!track) {
    return ["Track data is missing."];
  }

  const issues = [];
  const title = String(track.title || "").trim();
  const copyright = track.copyright || defaultCopyrightForm();

  if (!title) {
    issues.push("Title is required.");
  } else if (title.length > TITLE_MAX_LENGTH) {
    issues.push(`Title cannot exceed ${TITLE_MAX_LENGTH} characters.`);
  }

  const genreCount = Array.isArray(track.genres)
    ? track.genres.length
    : Array.isArray(track.genreIds)
      ? track.genreIds.length
      : 0;

  if (genreCount < MIN_GENRE_IDS_SUBMIT) {
    issues.push("Select at least one genre.");
  }

  const audioCount = Array.isArray(track.audioFiles) ? track.audioFiles.length : 0;

  if (audioCount < 1) {
    issues.push("Upload at least one audio file.");
  } else if (!hasOriginalAudio(track)) {
    issues.push("An original-quality audio file is required.");
  }

  if (!Number(track.duration) || Number(track.duration) <= 0) {
    issues.push("Duration must be greater than 0 seconds.");
  }

  if (!hasCoverOrAvatar(track)) {
    issues.push("Add a track avatar or at least one cover image.");
  }

  if (!String(copyright.copyrightOwner || "").trim()) {
    issues.push("Copyright owner is required.");
  }

  if (!String(copyright.recordingOwner || "").trim()) {
    issues.push("Recording owner is required.");
  }

  if (!copyright.declarationAccepted) {
    issues.push("Accept the copyright declaration.");
  }

  if (copyright.isOriginal && usesThirdPartyRights(copyright)) {
    issues.push("Original tracks cannot also be marked as cover/remix/sample/beat.");
  }

  if (usesThirdPartyRights(copyright)) {
    const validLicenseUrls = Array.isArray(copyright.licenseDocumentUrls)
      ? copyright.licenseDocumentUrls.filter((url) => isHttpUrl(url))
      : [];

    if (validLicenseUrls.length < 1) {
      issues.push("Provide at least one valid license document URL (http/https).");
    }

    if (!String(copyright.originalTrackTitle || "").trim()) {
      issues.push("Original track title is required for third-party rights.");
    }

    if (!String(copyright.originalArtistName || "").trim()) {
      issues.push("Original artist name is required for third-party rights.");
    }
  }

  if (String(track.lyricsStatic || "").length > LYRICS_STATIC_MAX_LENGTH) {
    issues.push(`Static lyrics cannot exceed ${LYRICS_STATIC_MAX_LENGTH} characters.`);
  }

  return issues;
};

export const canArtistEditTrack = (track) =>
  track?.approvalStatus === "draft" || track?.approvalStatus === "rejected";

export const canArtistSubmitTrack = (track) =>
  track?.approvalStatus === "draft" || track?.approvalStatus === "rejected";
