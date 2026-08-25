import { ARTIST_INPUT_LIMITS } from "../constants/artistInputLimits";

export const TITLE_MAX_LENGTH = ARTIST_INPUT_LIMITS.trackTitle;
export const DESCRIPTION_MAX_LENGTH = ARTIST_INPUT_LIMITS.trackDescription;
export const LYRICS_STATIC_MAX_LENGTH = ARTIST_INPUT_LIMITS.trackLyrics;
export const MAX_GENRE_IDS = 5;
export const MAX_COVER_IMAGES = 3;
export const MIN_GENRE_IDS_SUBMIT = 1;
export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 50;

const PRIMARY_TYPES = ["original", "cover", "remix"];
const COPYRIGHT_PARTY_MAX_LENGTH = 500;
const COPYRIGHT_NOTE_MAX_LENGTH = 2000;
const LICENSE_TYPES = ["exclusive", "non_exclusive", "custom", "other"];
const PLACEHOLDER_COPYRIGHT_TEXT = /^(?:-+|_+|\.+|123+|abc+)$/i;
const COPYRIGHT_FORM_KEYS = [
  "copyrightOwner", "recordingOwner", "composer", "lyricist", "producer",
  "isOriginal", "isCover", "isRemix", "usesSample", "usesThirdPartyBeat", "usesLicensedBeat",
  "primaryCopyrightType", "rightsConfirmed", "originalTrackTitle", "originalArtistName",
  "originalComposer", "originalISRC", "originalISWC", "sampleSourceTitle", "sampleSourceArtist",
  "sampleSourceISRC", "sampleStartTime", "sampleEndTime", "beatTitle", "beatProducer",
  "beatSourceUrl", "licenseType", "licenseDocumentUrls", "copyrightEvidenceDocuments",
  "declarationAccepted", "copyrightNote", "copyrightNotes", "isrc", "iswc",
];

export const isHttpUrl = (value) => {
  if (!value || typeof value !== "string") return false;
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
  usesThirdPartyBeat: false,
  usesLicensedBeat: false,
  primaryCopyrightType: "original",
  rightsConfirmed: false,
  originalTrackTitle: "",
  originalArtistName: "",
  originalComposer: "",
  originalISRC: "",
  originalISWC: "",
  sampleSourceTitle: "",
  sampleSourceArtist: "",
  sampleSourceISRC: "",
  sampleStartTime: null,
  sampleEndTime: null,
  beatTitle: "",
  beatProducer: "",
  beatSourceUrl: "",
  licenseType: "",
  licenseDocumentUrls: [],
  declarationAccepted: false,
  copyrightNote: "",
  copyrightNotes: "",
  copyrightEvidenceDocuments: [],
  isrc: "",
  iswc: "",
});

const resolvePrimaryType = (form) => {
  if (PRIMARY_TYPES.includes(form.primaryCopyrightType)) return form.primaryCopyrightType;
  if (form.isCover) return "cover";
  if (form.isRemix) return "remix";
  return "original";
};

export const mapTrackCopyrightToForm = (copyright) => {
  const form = defaultCopyrightForm();
  if (!copyright || typeof copyright !== "object") return form;

  COPYRIGHT_FORM_KEYS.forEach((key) => {
    if (copyright[key] !== undefined && copyright[key] !== null) form[key] = copyright[key];
  });
  form.primaryCopyrightType = resolvePrimaryType(form);
  form.usesSample = Boolean(form.usesSample || copyright.primaryCopyrightType === "sample");
  form.usesThirdPartyBeat = Boolean(form.usesThirdPartyBeat || form.usesLicensedBeat || copyright.primaryCopyrightType === "licensed_beat");
  form.usesLicensedBeat = form.usesThirdPartyBeat;
  form.isOriginal = form.primaryCopyrightType === "original";
  form.isCover = form.primaryCopyrightType === "cover";
  form.isRemix = form.primaryCopyrightType === "remix";
  form.licenseDocumentUrls = Array.isArray(form.licenseDocumentUrls)
    ? form.licenseDocumentUrls.map((url) => String(url).trim()).filter(Boolean)
    : [];
  form.copyrightEvidenceDocuments = Array.isArray(form.copyrightEvidenceDocuments)
    ? form.copyrightEvidenceDocuments
    : [];
  form.declarationAccepted = Boolean(form.declarationAccepted);
  form.rightsConfirmed = Boolean(form.rightsConfirmed);
  return form;
};

const ARTIST_EDITABLE_EVIDENCE_FIELDS = [
  "documentId", "type", "version", "originalName", "fileName", "mimeType", "size",
  "storageUrl", "url", "publicId", "sha256", "hash", "evidenceType", "uploadStatus",
];

export const serializeArtistCopyrightForUpdate = (copyright) => {
  const form = mapTrackCopyrightToForm(copyright);
  const primaryCopyrightType = resolvePrimaryType(form);
  form.primaryCopyrightType = primaryCopyrightType;
  form.isOriginal = primaryCopyrightType === "original";
  form.isCover = primaryCopyrightType === "cover";
  form.isRemix = primaryCopyrightType === "remix";
  form.usesSample = Boolean(form.usesSample);
  form.usesThirdPartyBeat = Boolean(form.usesThirdPartyBeat || form.usesLicensedBeat);
  form.usesLicensedBeat = form.usesThirdPartyBeat;
  form.licenseDocumentUrls = form.licenseDocumentUrls.filter((url) => isHttpUrl(url));
  form.copyrightEvidenceDocuments = (Array.isArray(form.copyrightEvidenceDocuments)
    ? form.copyrightEvidenceDocuments
    : []).map((document) => ARTIST_EDITABLE_EVIDENCE_FIELDS.reduce((result, field) => {
      if (document?.[field] !== undefined && document?.[field] !== null) {
        result[field] = document[field];
      }
      return result;
    }, {}));
  if (primaryCopyrightType === "original" && !form.usesSample && !form.usesThirdPartyBeat) {
    form.licenseDocumentUrls = [];
    form.originalTrackTitle = "";
    form.originalArtistName = "";
  }
  return form;
};

// Backward-compatible name used by existing artist forms and submit actions.
export const serializeCopyrightForApi = serializeArtistCopyrightForUpdate;

export const hasCoverOrAvatar = (track) => {
  const avatar = typeof track?.avatar === "string" ? track.avatar.trim() : "";
  const covers = Array.isArray(track?.coverImage) ? track.coverImage.filter(Boolean) : [];
  return Boolean(avatar) || covers.length > 0;
};

export const hasOriginalAudio = (track) => (Array.isArray(track?.audioFiles) ? track.audioFiles : [])
  .some((file) => file?.label === "original");

export const usesThirdPartyRights = (copyright) => Boolean(
  ["cover", "remix"].includes(copyright?.primaryCopyrightType) ||
  copyright?.isCover || copyright?.isRemix || copyright?.usesSample ||
  copyright?.usesThirdPartyBeat || copyright?.usesLicensedBeat
);

const addCopyrightError = (errors, field, message) => {
  if (!errors[field]) errors[field] = message;
};

const normalizeText = (value) => typeof value === "string" ? value.trim() : "";

const validateRequiredCopyrightText = (errors, copyright, field, label, { rejectPlaceholder = false } = {}) => {
  const value = copyright[field];
  const normalized = normalizeText(value);

  if (!normalized) {
    addCopyrightError(errors, field, `Vui lòng nhập ${label}.`);
    return;
  }

  if (normalized.length > COPYRIGHT_PARTY_MAX_LENGTH) {
    addCopyrightError(errors, field, `${label} không được vượt quá ${COPYRIGHT_PARTY_MAX_LENGTH} ký tự.`);
  } else if (normalized.length < 2 || (rejectPlaceholder && PLACEHOLDER_COPYRIGHT_TEXT.test(normalized))) {
    addCopyrightError(errors, field, `${label} không hợp lệ. Vui lòng nhập tên thực tế.`);
  }
};

const validateOptionalCopyrightText = (errors, copyright, field, label, maxLength = COPYRIGHT_PARTY_MAX_LENGTH) => {
  const value = copyright[field];
  if (value === undefined || value === null || value === "") return;

  if (typeof value !== "string") {
    addCopyrightError(errors, field, `${label} phải là chuỗi ký tự.`);
    return;
  }

  if (value.trim().length > maxLength) {
    addCopyrightError(errors, field, `${label} không được vượt quá ${maxLength} ký tự.`);
  }
};

const isValidISRCValue = (value) => /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(
  String(value || "").trim().toUpperCase().replace(/[\s-]/g, "")
);

const isValidISWCValue = (value) => /^T\d{10}$/.test(
  String(value || "").trim().toUpperCase().replace(/[\s.-]/g, "")
);

const validateOptionalIdentifier = (errors, copyright, field, label, validator, example) => {
  if (copyright[field] === undefined || copyright[field] === null || copyright[field] === "") return;
  if (!validator(copyright[field])) addCopyrightError(errors, field, `${label} không đúng định dạng. Ví dụ: ${example}.`);
};

export const getCopyrightValidationErrors = (input = {}) => {
  const copyright = mapTrackCopyrightToForm(input);
  const errors = {};
  const primary = resolvePrimaryType(copyright);

  validateRequiredCopyrightText(errors, copyright, "copyrightOwner", "chủ sở hữu bản quyền", { rejectPlaceholder: true });
  validateRequiredCopyrightText(errors, copyright, "recordingOwner", "chủ sở hữu bản ghi", { rejectPlaceholder: true });
  validateOptionalCopyrightText(errors, copyright, "composer", "nhạc sĩ / composer");
  validateOptionalCopyrightText(errors, copyright, "lyricist", "người viết lời");
  validateOptionalCopyrightText(errors, copyright, "producer", "nhà sản xuất");
  validateOptionalCopyrightText(errors, copyright, "copyrightNote", "ghi chú bản quyền", COPYRIGHT_NOTE_MAX_LENGTH);
  validateOptionalCopyrightText(errors, copyright, "copyrightNotes", "ghi chú bản quyền", COPYRIGHT_NOTE_MAX_LENGTH);

  if (primary === "original" && !normalizeText(copyright.composer)) {
    addCopyrightError(errors, "composer", "Tác phẩm gốc phải khai báo nhạc sĩ / composer.");
  }

  if (copyright.rightsConfirmed !== true) {
    addCopyrightError(errors, "rightsConfirmed", "Bạn phải xác nhận quyền sở hữu hoặc quyền sử dụng.");
  }
  if (copyright.declarationAccepted !== true) {
    addCopyrightError(errors, "declarationAccepted", "Bạn phải chấp nhận chính sách bản quyền.");
  }

  validateOptionalIdentifier(errors, copyright, "isrc", "ISRC", isValidISRCValue, "AA-6QZ-20-00047");
  validateOptionalIdentifier(errors, copyright, "iswc", "ISWC", isValidISWCValue, "T-034.524.680-1");

  if (["cover", "remix"].includes(primary)) {
    validateOptionalCopyrightText(errors, copyright, "originalTrackTitle", "tên tác phẩm gốc");
    validateOptionalCopyrightText(errors, copyright, "originalArtistName", "nghệ sĩ gốc");
    if (!normalizeText(copyright.originalTrackTitle)) addCopyrightError(errors, "originalTrackTitle", "Vui lòng nhập tên tác phẩm gốc.");
    if (!normalizeText(copyright.originalArtistName)) addCopyrightError(errors, "originalArtistName", "Vui lòng nhập nghệ sĩ gốc.");
    validateOptionalIdentifier(errors, copyright, "originalISRC", "ISRC tác phẩm gốc", isValidISRCValue, "AA-6QZ-20-00047");
    validateOptionalIdentifier(errors, copyright, "originalISWC", "ISWC tác phẩm gốc", isValidISWCValue, "T-034.524.680-1");
  }

  if (copyright.usesSample) {
    validateRequiredCopyrightText(errors, copyright, "sampleSourceTitle", "tên nguồn sample", { rejectPlaceholder: true });
    validateRequiredCopyrightText(errors, copyright, "sampleSourceArtist", "nghệ sĩ nguồn sample", { rejectPlaceholder: true });
    validateOptionalIdentifier(errors, copyright, "sampleSourceISRC", "ISRC nguồn sample", isValidISRCValue, "AA-6QZ-20-00047");
    if (copyright.sampleStartTime !== undefined && copyright.sampleStartTime !== null && copyright.sampleStartTime !== "" && (!Number.isFinite(Number(copyright.sampleStartTime)) || Number(copyright.sampleStartTime) < 0)) {
      addCopyrightError(errors, "sampleStartTime", "Thời điểm bắt đầu sample không hợp lệ.");
    }
    if (copyright.sampleEndTime !== undefined && copyright.sampleEndTime !== null && copyright.sampleEndTime !== "" && (!Number.isFinite(Number(copyright.sampleEndTime)) || Number(copyright.sampleEndTime) < 0)) {
      addCopyrightError(errors, "sampleEndTime", "Thời điểm kết thúc sample không hợp lệ.");
    }
    if (Number.isFinite(Number(copyright.sampleStartTime)) && Number.isFinite(Number(copyright.sampleEndTime)) && Number(copyright.sampleEndTime) <= Number(copyright.sampleStartTime)) {
      addCopyrightError(errors, "sampleEndTime", "Thời điểm kết thúc sample phải lớn hơn thời điểm bắt đầu.");
    }
  }

  if (copyright.usesThirdPartyBeat) {
    validateRequiredCopyrightText(errors, copyright, "beatTitle", "tên beat", { rejectPlaceholder: true });
    validateRequiredCopyrightText(errors, copyright, "beatProducer", "nhà sản xuất beat", { rejectPlaceholder: true });
    if (!LICENSE_TYPES.includes(copyright.licenseType)) addCopyrightError(errors, "licenseType", "Vui lòng chọn loại giấy phép beat hợp lệ.");
    if (copyright.beatSourceUrl && !isHttpUrl(copyright.beatSourceUrl)) {
      addCopyrightError(errors, "beatSourceUrl", "URL beat phải dùng http hoặc https.");
    }
  }

  const licenseUrls = Array.isArray(copyright.licenseDocumentUrls) ? copyright.licenseDocumentUrls : [];
  licenseUrls.forEach((url, index) => {
    if (!isHttpUrl(url)) addCopyrightError(errors, `licenseDocumentUrls.${index}`, "Mỗi URL tài liệu phải dùng http hoặc https.");
  });

  const requiresEvidence = ["original", "cover", "remix"].includes(primary);
  if (requiresEvidence) {
    const documents = Array.isArray(copyright.copyrightEvidenceDocuments)
      ? copyright.copyrightEvidenceDocuments
      : [];
    if (documents.length > 5) addCopyrightError(errors, "copyrightEvidenceDocuments", "Chỉ được tải lên tối đa 5 tài liệu.");
    const validDocuments = documents.filter((document) => (
      document?.uploadStatus === "uploaded" &&
      isHttpUrl(document?.url || document?.storageUrl) &&
      /^[a-f0-9]{64}$/i.test(String(document?.hash || document?.sha256 || "")) &&
      Number(document?.size) > 0
    ));
    if (validDocuments.length === 0) {
      addCopyrightError(errors, "copyrightEvidenceDocuments", "Phải tải lên ít nhất một tài liệu chứng minh quyền sở hữu hoặc quyền sử dụng hợp lệ.");
    }
  }

  return errors;
};

const getCopyrightValidationIssues = (copyright) => Object.values(getCopyrightValidationErrors(copyright));

const getTrackSubmissionSource = (track) => {
  const pendingData = track?.pendingUpdate?.status === "rejected"
    ? track.pendingUpdate.data
    : null;
  return pendingData && typeof pendingData === "object"
    ? { ...track, ...pendingData }
    : track;
};

export const getSubmitReadinessIssues = (track) => {
  if (!track) return ["Thiếu dữ liệu bài hát."];
  const source = getTrackSubmissionSource(track);
  const issues = [];
  const title = String(source.title || "").trim();
  const copyright = mapTrackCopyrightToForm(source.copyright || {});
  const genresSource = source.genres || source.genreIds || [];
  const audioFiles = Array.isArray(source.audioFiles) ? source.audioFiles : [];
  const duration = Number(source.duration);

  if (!title) issues.push("Vui lòng nhập tên bài hát.");
  else if (title.length > TITLE_MAX_LENGTH) issues.push(`Tên bài hát không được vượt quá ${TITLE_MAX_LENGTH} ký tự.`);
  if (!Array.isArray(genresSource) || genresSource.length < MIN_GENRE_IDS_SUBMIT) issues.push("Vui lòng chọn ít nhất một thể loại.");
  if (audioFiles.length < 1) issues.push("Vui lòng tải lên ít nhất một tệp âm thanh.");
  else if (!hasOriginalAudio({ audioFiles })) issues.push("Cần có ít nhất một tệp âm thanh gốc.");
  if (!duration || duration <= 0) issues.push("Thời lượng bài hát phải lớn hơn 0 giây.");
  if (!hasCoverOrAvatar(source)) issues.push("Vui lòng thêm ảnh đại diện hoặc ít nhất một ảnh bìa.");
  issues.push(...getCopyrightValidationIssues(copyright));
  if (String(source.lyricsStatic || "").length > LYRICS_STATIC_MAX_LENGTH) issues.push(`Lời bài hát không được vượt quá ${LYRICS_STATIC_MAX_LENGTH} ký tự.`);
  return issues;
};

export const canArtistEditTrack = (track) => Boolean(track)
  && track?.approvalStatus !== "pending"
  && track?.pendingUpdate?.status !== "pending"
  && (track?.activeStatus !== "blocked" || track?.approvalStatus === "rejected");
export const hasMeaningfulChangeSinceRejection = (track) => {
  if (track?.approvalStatus !== "rejected") return true;
  const lastRejection = track?.moderation?.lastRejection;
  const automaticRejection = track?.moderation?.automatic;
  const snapshot = lastRejection?.rejectionId
    ? lastRejection
    : ["auto_reject", "enforcement_block"].includes(automaticRejection?.decision)
      ? automaticRejection
      : null;
  if (!snapshot) return false;
  return [
    ["submissionVersion", "submissionVersion"],
    ["audioVersion", "audioVersion"],
    ["copyrightVersion", "copyrightVersion"],
    ["evidenceVersion", "evidenceVersion"],
  ].some(([currentKey, snapshotKey]) => (
    Number(track?.[currentKey] || 1) > Number(snapshot?.[snapshotKey] || 1)
  ));
};

export const canArtistSubmitTrack = (track) => (
  track?.approvalStatus === "draft" ||
  (track?.approvalStatus === "rejected" && hasMeaningfulChangeSinceRejection(track))
);
export const getTrackPendingUpdateStatus = (track) => track?.pendingUpdate?.status || "none";
export const getArtistTrackReviewStatus = (track) => {
  const pendingStatus = getTrackPendingUpdateStatus(track);
  if (pendingStatus === "pending") return "pending";
  if (pendingStatus === "rejected") return "rejected";
  return track?.approvalStatus || "draft";
};
