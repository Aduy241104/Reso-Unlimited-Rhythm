import { StatusCodes } from "http-status-codes";
import { AppError } from "../../utils/AppError.js";

export const PRIMARY_COPYRIGHT_TYPES = ["original", "cover", "remix"];
export const LEGACY_COPYRIGHT_TYPES = ["sample", "licensed_beat"];
export const COPYRIGHT_TYPES = [...PRIMARY_COPYRIGHT_TYPES];
export const COPYRIGHT_EVIDENCE_TYPES = [
    "license",
    "contract",
    "copyright_certificate",
    "sample_clearance",
    "beat_license",
    "remix_permission",
    "other",
];
export const LICENSE_TYPES = ["exclusive", "non_exclusive", "custom", "other"];
export const MAX_COPYRIGHT_PARTY_LENGTH = 500;
export const MAX_COPYRIGHT_NOTE_LENGTH = 2000;
export const MAX_EVIDENCE_DOCUMENTS = 5;
export const MAX_EVIDENCE_SIZE = 25 * 1024 * 1024;

const PLACEHOLDER_TEXT = /^(?:-+|_+|\.+|123+|abc+)$/i;
const ALLOWED_EVIDENCE_MIME = new Set([
    "application/pdf",
    "application/zip",
    "application/octet-stream",
    "audio/mpeg",
    "audio/wav",
    "audio/x-wav",
    "audio/flac",
    "audio/mp4",
]);
const ALLOWED_EVIDENCE_EXTENSIONS = new Set([".pdf", ".zip", ".mp3", ".wav", ".flac", ".m4a"]);

const asPlainObject = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }

    // Mongoose nested documents expose schema values through getters, while
    // object spread only copies internal keys such as `_doc` and `$__`.
    // Convert them before normalization so persisted copyright fields are not
    // accidentally treated as missing during submission validation.
    if (typeof value.toObject === "function") {
        const plainValue = value.toObject();
        if (plainValue && typeof plainValue === "object" && !Array.isArray(plainValue)) {
            return plainValue;
        }
    }

    return value;
};

export const isHttpUrl = (value) => {
    if (typeof value !== "string" || !value.trim()) return false;
    try {
        const parsed = new URL(value.trim());
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
};

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

const normalizeString = (value) => typeof value === "string" ? value.trim() : value;

export const normalizeISRC = (value) => {
    if (value === undefined || value === null || value === "") return "";
    const compact = String(value).trim().toUpperCase().replace(/[\s-]/g, "");
    if (!/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(compact)) return String(value).trim().toUpperCase();
    return `${compact.slice(0, 2)}-${compact.slice(2, 5)}-${compact.slice(5, 7)}-${compact.slice(7)}`;
};

export const isValidISRC = (value) => /^[A-Z]{2}-[A-Z0-9]{3}-\d{2}-\d{5}$/.test(String(value || ""));

export const normalizeISWC = (value) => {
    if (value === undefined || value === null || value === "") return "";
    const compact = String(value).trim().toUpperCase().replace(/[\s.-]/g, "");
    if (!/^T\d{9}[A-Z]$/.test(compact)) return String(value).trim().toUpperCase();
    return `T-${compact.slice(1, 4)}.${compact.slice(4, 7)}.${compact.slice(7, 10)}-${compact.slice(10)}`;
};

export const isValidISWC = (value) => /^T-\d{3}\.\d{3}\.\d{3}-[A-Z]$/.test(String(value || ""));

const getLegacyPrimaryFlags = (copyright = {}) => [
    ["isOriginal", "original"],
    ["isCover", "cover"],
    ["isRemix", "remix"],
].filter(([field]) => hasOwn(copyright, field) && copyright[field] === true)
    .map(([, type]) => type);

const resolvePrimaryType = (source) => {
    if (PRIMARY_COPYRIGHT_TYPES.includes(source.primaryCopyrightType)) {
        return source.primaryCopyrightType;
    }

    const legacyFlags = getLegacyPrimaryFlags(source);
    if (legacyFlags.length > 0) return legacyFlags[0];
    return "original";
};

export const getDeclaredCopyrightTypes = (copyright = {}) => {
    const source = asPlainObject(copyright);
    const explicitFlags = getLegacyPrimaryFlags(source);
    if (explicitFlags.length > 0) return [...new Set(explicitFlags)];
    if (PRIMARY_COPYRIGHT_TYPES.includes(source.primaryCopyrightType)) return [source.primaryCopyrightType];
    if (source.primaryCopyrightType === "sample" || source.usesSample === true) return ["original"];
    if (source.primaryCopyrightType === "licensed_beat" || source.usesLicensedBeat === true) return ["original"];
    return [];
};

export const normalizeCopyrightDeclaration = (copyright = {}) => {
    const source = asPlainObject(copyright);
    const primaryCopyrightType = resolvePrimaryType(source);
    const usesSample = source.usesSample === true || source.primaryCopyrightType === "sample";
    const usesThirdPartyBeat = source.usesThirdPartyBeat === true || source.usesLicensedBeat === true || source.primaryCopyrightType === "licensed_beat";
    const copyrightNote = normalizeString(source.copyrightNotes ?? source.copyrightNote) || "";

    return {
        ...source,
        primaryCopyrightType,
        isOriginal: primaryCopyrightType === "original",
        isCover: primaryCopyrightType === "cover",
        isRemix: primaryCopyrightType === "remix",
        usesSample,
        usesThirdPartyBeat,
        // Keep the old API field in sync for clients that still send it.
        usesLicensedBeat: usesThirdPartyBeat,
        copyrightNote,
        copyrightNotes: copyrightNote,
        isrc: normalizeISRC(source.isrc),
        iswc: normalizeISWC(source.iswc),
        originalISRC: normalizeISRC(source.originalISRC),
        originalISWC: normalizeISWC(source.originalISWC),
        sampleSourceISRC: normalizeISRC(source.sampleSourceISRC),
        licenseDocumentUrls: Array.isArray(source.licenseDocumentUrls)
            ? source.licenseDocumentUrls.map(normalizeString).filter(Boolean)
            : [],
    };
};

const addError = (errors, field, message, code = "INVALID") => {
    errors.push({ field, message, code });
};

const validateBoolean = (errors, copyright, field) => {
    if (hasOwn(copyright, field) && typeof copyright[field] !== "boolean") {
        addError(errors, `copyright.${field}`, `${field} phải là boolean.`, "INVALID_TYPE");
    }
};

const validateRequiredText = (errors, copyright, field, label) => {
    const value = copyright[field];
    const isMissing = value === undefined || value === null || value === "" || (
        typeof value === "string" && !value.trim()
    );

    if (isMissing) {
        addError(errors, `copyright.${field}`, `Vui lòng nhập ${label.toLowerCase()}.`, "REQUIRED");
        return "";
    }

    if (typeof value !== "string") {
        addError(errors, `copyright.${field}`, `${label} phải là chuỗi ký tự.`, "INVALID_TYPE");
        return "";
    }

    const normalized = value.trim();
    if (!normalized) {
        addError(errors, `copyright.${field}`, `Vui lòng nhập ${label.toLowerCase()}.`, "REQUIRED");
    } else if (normalized.length > MAX_COPYRIGHT_PARTY_LENGTH) {
        addError(errors, `copyright.${field}`, `${label} không được vượt quá ${MAX_COPYRIGHT_PARTY_LENGTH} ký tự.`, "MAX_LENGTH");
    } else if (normalized.length < 2 || PLACEHOLDER_TEXT.test(normalized)) {
        addError(errors, `copyright.${field}`, `${label} không hợp lệ. Vui lòng nhập tên thực tế.`, "INVALID_VALUE");
    }
    return normalized;
};

const validateOptionalText = (errors, copyright, field, label, max = MAX_COPYRIGHT_PARTY_LENGTH) => {
    const value = copyright[field];
    if (value === undefined || value === null || value === "") return "";
    if (typeof value !== "string") {
        addError(errors, `copyright.${field}`, `${label} phải là chuỗi ký tự.`, "INVALID_TYPE");
        return "";
    }

    const normalized = value.trim();
    if (normalized.length > max) {
        addError(errors, `copyright.${field}`, `${label} không được vượt quá ${max} ký tự.`, "MAX_LENGTH");
    }
    return normalized;
};

const validateIdentifier = (errors, copyright, field, normalizer, validator, label) => {
    if (copyright[field] === undefined || copyright[field] === null || copyright[field] === "") return "";
    const normalized = normalizer(copyright[field]);
    if (!validator(normalized)) addError(errors, `copyright.${field}`, `${label} không đúng định dạng.`, "INVALID_FORMAT");
    return normalized;
};

const validateEvidence = (errors, copyright) => {
    const urls = copyright.licenseDocumentUrls;
    const documents = copyright.copyrightEvidenceDocuments;

    if (urls !== undefined && !Array.isArray(urls)) {
        addError(errors, "copyright.licenseDocumentUrls", "Danh sách tài liệu bản quyền phải là một mảng.", "INVALID_TYPE");
    }

    const normalizedUrls = Array.isArray(urls) ? urls : [];
    normalizedUrls.forEach((url, index) => {
        if (typeof url !== "string" || !isHttpUrl(url)) {
            addError(errors, `copyright.licenseDocumentUrls.${index}`, "URL tài liệu phải dùng http hoặc https.", "INVALID_URL");
        }
    });

    if (documents !== undefined && !Array.isArray(documents)) {
        addError(errors, "copyright.copyrightEvidenceDocuments", "Tài liệu bằng chứng phải là một mảng.", "INVALID_TYPE");
        return { urls: normalizedUrls, documents: [] };
    }

    const normalizedDocuments = Array.isArray(documents) ? documents : [];
    if (normalizedDocuments.length > MAX_EVIDENCE_DOCUMENTS) {
        addError(errors, "copyright.copyrightEvidenceDocuments", `Chỉ được gửi tối đa ${MAX_EVIDENCE_DOCUMENTS} tài liệu.`, "MAX_ITEMS");
    }

    normalizedDocuments.forEach((document, index) => {
        const prefix = `copyright.copyrightEvidenceDocuments.${index}`;
        if (!document || typeof document !== "object" || Array.isArray(document)) {
            addError(errors, prefix, "Tài liệu bằng chứng không hợp lệ.", "INVALID_TYPE");
            return;
        }
        if (document.type !== undefined && !COPYRIGHT_EVIDENCE_TYPES.includes(document.type)) {
            addError(errors, `${prefix}.type`, "Loại tài liệu không hợp lệ.", "INVALID_TYPE");
        }
        if (document.uploadStatus !== "uploaded") {
            addError(errors, `${prefix}.uploadStatus`, "Tài liệu chưa được tải lên thành công.", "UPLOAD_INCOMPLETE");
        }
        const url = document.url || document.storageUrl;
        if (typeof url !== "string" || !isHttpUrl(url)) {
            addError(errors, `${prefix}.url`, "Tài liệu không có URL lưu trữ hợp lệ.", "INVALID_URL");
        }
        const hash = document.hash || document.sha256;
        if (!/^[a-f0-9]{64}$/i.test(String(hash || ""))) {
            addError(errors, `${prefix}.hash`, "Tài liệu phải có mã SHA-256 hợp lệ.", "MISSING_HASH");
        }
        if (!Number.isFinite(Number(document.size)) || Number(document.size) <= 0 || Number(document.size) > MAX_EVIDENCE_SIZE) {
            addError(errors, `${prefix}.size`, "Kích thước tài liệu không hợp lệ hoặc vượt quá 25 MB.", "INVALID_SIZE");
        }
    });

    return { urls: normalizedUrls, documents: normalizedDocuments };
};

export const validateCopyrightForSubmit = (input = {}) => {
    const source = asPlainObject(input);
    const copyright = normalizeCopyrightDeclaration(source);
    const errors = [];
    const declaredTypes = getDeclaredCopyrightTypes(source);

    for (const field of ["isOriginal", "isCover", "isRemix", "usesSample", "usesThirdPartyBeat", "usesLicensedBeat"]) {
        validateBoolean(errors, source, field);
    }

    validateRequiredText(errors, copyright, "copyrightOwner", "chủ sở hữu bản quyền");
    validateRequiredText(errors, copyright, "recordingOwner", "chủ sở hữu bản ghi");
    validateOptionalText(errors, copyright, "composer", "nhạc sĩ / composer");
    validateOptionalText(errors, copyright, "lyricist", "người viết lời");
    validateOptionalText(errors, copyright, "producer", "nhà sản xuất");
    validateOptionalText(errors, copyright, "copyrightNote", "ghi chú bản quyền", MAX_COPYRIGHT_NOTE_LENGTH);
    validateOptionalText(errors, copyright, "copyrightNotes", "ghi chú bản quyền", MAX_COPYRIGHT_NOTE_LENGTH);

    if (!PRIMARY_COPYRIGHT_TYPES.includes(copyright.primaryCopyrightType)) {
        addError(errors, "copyright.primaryCopyrightType", "Loại quyền sử dụng chính không hợp lệ.", "INVALID_TYPE");
    }
    if (declaredTypes.length > 1 || (declaredTypes.length === 1 && declaredTypes[0] !== copyright.primaryCopyrightType && ["original", "cover", "remix"].includes(declaredTypes[0]))) {
        addError(errors, "copyright.primaryCopyrightType", "Chỉ được chọn một loại quyền sử dụng chính.", "CONFLICTING_TYPES");
    }
    if (source.rightsConfirmed !== true) {
        addError(errors, "copyright.rightsConfirmed", "Bạn phải xác nhận quyền sở hữu hoặc quyền sử dụng.", "CONFIRMATION_REQUIRED");
    }
    if (source.declarationAccepted !== true) {
        addError(errors, "copyright.declarationAccepted", "Bạn phải chấp nhận chính sách bản quyền.", "CONFIRMATION_REQUIRED");
    }

    validateIdentifier(errors, copyright, "isrc", normalizeISRC, isValidISRC, "ISRC");
    validateIdentifier(errors, copyright, "iswc", normalizeISWC, isValidISWC, "ISWC");
    const evidence = validateEvidence(errors, copyright);
    const sourceTitle = validateOptionalText(errors, copyright, "originalTrackTitle", "tên tác phẩm gốc");
    const sourceArtist = validateOptionalText(errors, copyright, "originalArtistName", "nghệ sĩ gốc");
    validateOptionalText(errors, copyright, "originalComposer", "composer của tác phẩm gốc");
    validateIdentifier(errors, copyright, "originalISRC", normalizeISRC, isValidISRC, "ISRC tác phẩm gốc");
    validateIdentifier(errors, copyright, "originalISWC", normalizeISWC, isValidISWC, "ISWC tác phẩm gốc");

    const primary = copyright.primaryCopyrightType;
    if (evidence.documents.length === 0) {
        const evidenceLabel = primary === "original"
            ? "Tác phẩm gốc phải cung cấp ít nhất một tài liệu chứng minh quyền sở hữu hoặc quá trình tạo bản ghi."
            : primary === "cover"
                ? "Bản cover phải cung cấp ít nhất một tài liệu chứng minh quyền sử dụng tác phẩm gốc."
                : "Bản phối lại phải cung cấp ít nhất một tài liệu cấp phép hoặc bằng chứng quyền sử dụng.";
        addError(errors, "copyright.copyrightEvidenceDocuments", evidenceLabel, "EVIDENCE_REQUIRED");
    }
    if (primary === "original" && !String(copyright.composer || "").trim()) {
        addError(errors, "copyright.composer", "Tác phẩm gốc phải khai báo nhạc sĩ / composer.", "REQUIRED");
    }
    if (["cover", "remix"].includes(primary)) {
        if (!sourceTitle) addError(errors, "copyright.originalTrackTitle", "Vui lòng nhập tên tác phẩm gốc.", "REQUIRED");
        if (!sourceArtist) addError(errors, "copyright.originalArtistName", "Vui lòng nhập nghệ sĩ gốc.", "REQUIRED");
    }

    if (copyright.usesSample) {
        validateRequiredText(errors, copyright, "sampleSourceTitle", "tên nguồn sample");
        validateRequiredText(errors, copyright, "sampleSourceArtist", "nghệ sĩ nguồn sample");
        validateIdentifier(errors, copyright, "sampleSourceISRC", normalizeISRC, isValidISRC, "ISRC nguồn sample");
        if (copyright.sampleStartTime !== undefined && copyright.sampleStartTime !== null && (!Number.isFinite(Number(copyright.sampleStartTime)) || Number(copyright.sampleStartTime) < 0)) {
            addError(errors, "copyright.sampleStartTime", "Thời điểm bắt đầu sample không hợp lệ.", "INVALID_VALUE");
        }
        if (copyright.sampleEndTime !== undefined && copyright.sampleEndTime !== null && (!Number.isFinite(Number(copyright.sampleEndTime)) || Number(copyright.sampleEndTime) < 0)) {
            addError(errors, "copyright.sampleEndTime", "Thời điểm kết thúc sample không hợp lệ.", "INVALID_VALUE");
        }
        if (Number.isFinite(Number(copyright.sampleStartTime)) && Number.isFinite(Number(copyright.sampleEndTime)) && Number(copyright.sampleEndTime) <= Number(copyright.sampleStartTime)) {
            addError(errors, "copyright.sampleEndTime", "Thời điểm kết thúc sample phải lớn hơn thời điểm bắt đầu.", "INVALID_VALUE");
        }
    }

    if (copyright.usesThirdPartyBeat) {
        validateRequiredText(errors, copyright, "beatTitle", "tên beat");
        validateRequiredText(errors, copyright, "beatProducer", "nhà sản xuất beat");
        if (!LICENSE_TYPES.includes(copyright.licenseType)) addError(errors, "copyright.licenseType", "Loại giấy phép beat không hợp lệ.", "REQUIRED");
        if (copyright.beatSourceUrl && !isHttpUrl(copyright.beatSourceUrl)) addError(errors, "copyright.beatSourceUrl", "URL beat phải dùng http hoặc https.", "INVALID_URL");
    }

    if (errors.length > 0) {
        throw new AppError("Thông tin bản quyền chưa hợp lệ.", StatusCodes.UNPROCESSABLE_ENTITY, errors);
    }

    return copyright;
};

export const validateEvidenceUploadFile = (file) => {
    const extension = String(file?.originalname || "").toLowerCase().replace(/^.*(\.[^.]*)$/, "$1");
    const mimeType = String(file?.mimetype || "").toLowerCase();
    const isAllowedBinary = mimeType !== "application/octet-stream"
        ? ALLOWED_EVIDENCE_MIME.has(mimeType)
        : ALLOWED_EVIDENCE_EXTENSIONS.has(extension);

    if (!file?.buffer || !Number.isFinite(Number(file.size)) || Number(file.size) <= 0) return "Tài liệu không có nội dung hợp lệ.";
    if (Number(file.size) > MAX_EVIDENCE_SIZE) return "Mỗi tài liệu không được vượt quá 25 MB.";
    if (!mimeType.startsWith("image/") && !isAllowedBinary) return "Chỉ chấp nhận ảnh, PDF, ZIP hoặc tệp audio làm bằng chứng.";
    return null;
};

export default {
    COPYRIGHT_TYPES,
    PRIMARY_COPYRIGHT_TYPES,
    COPYRIGHT_EVIDENCE_TYPES,
    normalizeCopyrightDeclaration,
    normalizeISRC,
    normalizeISWC,
    validateCopyrightForSubmit,
    validateEvidenceUploadFile,
};
