import { ARTIST_INPUT_LIMITS } from "../constants/artistInputLimits";

export const TITLE_MAX_LENGTH = ARTIST_INPUT_LIMITS.trackTitle;
export const DESCRIPTION_MAX_LENGTH = ARTIST_INPUT_LIMITS.trackDescription;
export const LYRICS_STATIC_MAX_LENGTH = ARTIST_INPUT_LIMITS.trackLyrics;
export const MAX_GENRE_IDS = 5;
export const MAX_COVER_IMAGES = 3;
export const MIN_GENRE_IDS_SUBMIT = 1;
export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 50;

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
    return ["Thiếu dữ liệu bài hát."];
  }

  const issues = [];
  const title = String(track.title || "").trim();
  const copyright = track.copyright || defaultCopyrightForm();
  const genresSource = track.genres || track.genreIds || [];
  const audioFiles = Array.isArray(track.audioFiles) ? track.audioFiles : [];
  const duration = Number(track.duration);

  if (!title) {
    issues.push("Vui lòng nhập tên bài hát.");
  } else if (title.length > TITLE_MAX_LENGTH) {
    issues.push(`Tên bài hát không được vượt quá ${TITLE_MAX_LENGTH} ký tự.`);
  }

  const genreCount = Array.isArray(genresSource) ? genresSource.length : 0;

  if (genreCount < MIN_GENRE_IDS_SUBMIT) {
    issues.push("Vui lòng chọn ít nhất một thể loại.");
  }

  const audioCount = Array.isArray(audioFiles) ? audioFiles.length : 0;

  if (audioCount < 1) {
    issues.push("Vui lòng tải lên ít nhất một tệp âm thanh.");
  } else if (!hasOriginalAudio({ audioFiles })) {
    issues.push("Cần có ít nhất một tệp âm thanh gốc.");
  }

  if (!duration || duration <= 0) {
    issues.push("Thời lượng bài hát phải lớn hơn 0 giây.");
  }

  if (!hasCoverOrAvatar(track)) {
    issues.push("Vui lòng thêm ảnh đại diện hoặc ít nhất một ảnh bìa.");
  }

  if (!String(copyright.copyrightOwner || "").trim()) {
    issues.push("Vui lòng nhập chủ sở hữu bản quyền.");
  }

  if (!String(copyright.recordingOwner || "").trim()) {
    issues.push("Vui lòng nhập chủ sở hữu bản ghi.");
  }

  if (!copyright.declarationAccepted) {
    issues.push("Vui lòng xác nhận cam kết bản quyền.");
  }

  if (copyright.isOriginal && usesThirdPartyRights(copyright)) {
    issues.push("Bài hát gốc không thể đồng thời đánh dấu là cover, remix, sample hoặc licensed beat.");
  }

  if (usesThirdPartyRights(copyright)) {
    const validLicenseUrls = Array.isArray(copyright.licenseDocumentUrls)
      ? copyright.licenseDocumentUrls.filter((url) => isHttpUrl(url))
      : [];

    if (validLicenseUrls.length < 1) {
      issues.push("Vui lòng cung cấp ít nhất một URL giấy phép hợp lệ (http/https).");
    }

    if (!String(copyright.originalTrackTitle || "").trim()) {
      issues.push("Vui lòng nhập tên bài gốc khi sử dụng quyền của bên thứ ba.");
    }

    if (!String(copyright.originalArtistName || "").trim()) {
      issues.push("Vui lòng nhập tên nghệ sĩ gốc khi sử dụng quyền của bên thứ ba.");
    }
  }

  if (String(track.lyricsStatic || "").length > LYRICS_STATIC_MAX_LENGTH) {
    issues.push(`Lời bài hát không được vượt quá ${LYRICS_STATIC_MAX_LENGTH} ký tự.`);
  }

  return issues;
};

export const canArtistEditTrack = (track) =>
  Boolean(track) &&
  track?.approvalStatus !== "pending" &&
  track?.pendingUpdate?.status !== "pending" &&
  track?.activeStatus !== "blocked";

export const canArtistSubmitTrack = (track) =>
  track?.approvalStatus === "draft" ||
  track?.approvalStatus === "rejected";

export const getTrackPendingUpdateStatus = (track) =>
  track?.pendingUpdate?.status || "none";

export const getArtistTrackReviewStatus = (track) => {
  const pendingStatus = getTrackPendingUpdateStatus(track);

  if (pendingStatus === "pending") {
    return "pending";
  }

  if (pendingStatus === "rejected") {
    return "rejected";
  }

  return track?.approvalStatus || "draft";
};
