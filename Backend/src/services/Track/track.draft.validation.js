import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import Album from "../../models/Album.js";
import Genre from "../../models/Genre.js";
import { AppError } from "../../utils/AppError.js";

export const TITLE_MIN_LENGTH = 1;
export const TITLE_MAX_LENGTH = 150;
export const DESCRIPTION_MAX_LENGTH = 5000;
export const LYRICS_STATIC_MAX_LENGTH = 20000;
export const MAX_GENRE_IDS = 5;
export const MAX_COVER_IMAGES = 3;
export const MAX_AUDIO_FILES = 5;
export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 50;
export const MIN_AUDIO_BITRATE = 64;

export const AUDIO_FORMATS = new Set(["mp3", "wav", "flac", "aac", "m4a"]);
export const AUDIO_LABELS = new Set(["original", "high", "medium", "low", "lowest"]);

export const FORBIDDEN_ARTIST_TRACK_FIELDS = [
    "stats",
    "activeStatus",
    "releaseStatus",
    "releasedAt",
    "approvalStatus",
    "moderation",
    "rejectReason",
    "blockedReason",
    "hiddenReason",
    "hiddenAt",
];

const isHttpUrl = (value) => {
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

export const assertPayloadHasNoForbiddenFields = (payload = {}) => {
    for (const key of FORBIDDEN_ARTIST_TRACK_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(payload, key)) {
            throw new AppError(
                `Nghệ sĩ không được phép thiết lập trường "${key}".`,
                StatusCodes.BAD_REQUEST,
                { field: key }
            );
        }
    }

    if (
        payload.copyright &&
        Object.prototype.hasOwnProperty.call(payload.copyright, "copyrightStatus")
    ) {
        throw new AppError(
            'Nghệ sĩ không được phép thiết lập trường "copyright.copyrightStatus".',
            StatusCodes.BAD_REQUEST,
            { field: "copyright.copyrightStatus" }
        );
    }
};

export const validateDraftTitle = (title) => {
    const normalizedTitle = typeof title === "string" ? title.trim() : "";

    if (!normalizedTitle) {
        throw new AppError("Tên bài hát là bắt buộc.", StatusCodes.BAD_REQUEST, {
            field: "title",
        });
    }

    if (normalizedTitle.length > TITLE_MAX_LENGTH) {
        throw new AppError(
            `Tên bài hát không được vượt quá ${TITLE_MAX_LENGTH} ký tự.`,
            StatusCodes.BAD_REQUEST,
            { field: "title" }
        );
    }

    return normalizedTitle;
};

export const validateOptionalDescription = (description) => {
    if (description === undefined || description === null) {
        return "";
    }

    const normalizedDescription = String(description).trim();

    if (normalizedDescription.length > DESCRIPTION_MAX_LENGTH) {
        throw new AppError(
            `Mô tả không được vượt quá ${DESCRIPTION_MAX_LENGTH} ký tự.`,
            StatusCodes.BAD_REQUEST,
            { field: "description" }
        );
    }

    return normalizedDescription;
};

export const validateOptionalTags = (tags) => {
    if (tags === undefined || tags === null) {
        return [];
    }

    if (!Array.isArray(tags)) {
        throw new AppError("Danh sách thẻ phải là một mảng.", StatusCodes.BAD_REQUEST, {
            field: "tags",
        });
    }

    const normalizedTags = tags
        .map((tag) => String(tag || "").trim())
        .filter(Boolean);

    if (normalizedTags.length > MAX_TAGS) {
        throw new AppError(
            `Một bài hát chỉ được có tối đa ${MAX_TAGS} thẻ.`,
            StatusCodes.BAD_REQUEST,
            { field: "tags" }
        );
    }

    normalizedTags.forEach((tag, index) => {
        if (tag.length > MAX_TAG_LENGTH) {
            throw new AppError(
                `Mỗi thẻ không được vượt quá ${MAX_TAG_LENGTH} ký tự.`,
                StatusCodes.BAD_REQUEST,
                { field: `tags[${index}]` }
            );
        }
    });

    if (new Set(normalizedTags.map((tag) => tag.toLowerCase())).size !== normalizedTags.length) {
        throw new AppError("Không được phép dùng thẻ trùng lặp.", StatusCodes.BAD_REQUEST, {
            field: "tags",
        });
    }

    return normalizedTags;
};

export const resolveArtistIdForCreate = (trackData, artist) => {
    const rawArtistId = trackData?.artist_artistId;

    if (rawArtistId === undefined || rawArtistId === null || String(rawArtistId).trim() === "") {
        return artist._id;
    }

    const artistId = String(rawArtistId).trim();

    if (!mongoose.Types.ObjectId.isValid(artistId)) {
        throw new AppError("Mã nghệ sĩ không hợp lệ.", StatusCodes.BAD_REQUEST, {
            field: "artist_artistId",
        });
    }

    if (!artist._id.equals(artistId)) {
        throw new AppError(
            "Bạn chỉ có thể tạo bài hát cho hồ sơ nghệ sĩ của mình.",
            StatusCodes.FORBIDDEN,
            { field: "artist_artistId" }
        );
    }

    return artist._id;
};

export const assertArtistCanCreateTrack = (artist) => {
    if (artist.activeStatus === "blocked") {
        throw new AppError(
            "Tài khoản nghệ sĩ của bạn đã bị khóa nên không thể tạo bài hát.",
            StatusCodes.FORBIDDEN
        );
    }

    if (artist.activeStatus === "inactive") {
        throw new AppError(
            "Tài khoản nghệ sĩ của bạn chưa hoạt động nên không thể tạo bài hát.",
            StatusCodes.FORBIDDEN
        );
    }
};

const validateSingleAudioFile = (file, index) => {
    const fieldPrefix = `audioFiles[${index}]`;

    if (!file?.url || !isHttpUrl(file.url)) {
        throw new AppError("Địa chỉ tệp âm thanh phải là địa chỉ http(s) hợp lệ.", StatusCodes.BAD_REQUEST, {
            field: `${fieldPrefix}.url`,
        });
    }

    const format = String(file.format || "").trim().toLowerCase();

    if (!AUDIO_FORMATS.has(format)) {
        throw new AppError(
            `Định dạng âm thanh phải là một trong các loại: ${[...AUDIO_FORMATS].join(", ")}.`,
            StatusCodes.BAD_REQUEST,
            { field: `${fieldPrefix}.format` }
        );
    }

    const bitrate = Number(file.bitrate);

    if (!Number.isFinite(bitrate) || bitrate < MIN_AUDIO_BITRATE) {
        throw new AppError(
            `Tốc độ bit của âm thanh phải đạt ít nhất ${MIN_AUDIO_BITRATE}.`,
            StatusCodes.BAD_REQUEST,
            { field: `${fieldPrefix}.bitrate` }
        );
    }

    const label = String(file.label || "original").trim().toLowerCase();

    if (!AUDIO_LABELS.has(label)) {
        throw new AppError(
            `Nhãn âm thanh phải là một trong các giá trị: ${[...AUDIO_LABELS].join(", ")}.`,
            StatusCodes.BAD_REQUEST,
            { field: `${fieldPrefix}.label` }
        );
    }

    const priority = file.priority !== undefined ? Number(file.priority) : 0;

    if (!Number.isFinite(priority) || priority < 0) {
        throw new AppError("Độ ưu tiên âm thanh phải là số lớn hơn hoặc bằng 0.", StatusCodes.BAD_REQUEST, {
            field: `${fieldPrefix}.priority`,
        });
    }

    return {
        url: file.url.trim(),
        format,
        bitrate,
        label,
        priority,
    };
};

export const validateOptionalAudioFiles = (audioFiles) => {
    if (audioFiles === undefined || audioFiles === null) {
        return [];
    }

    if (!Array.isArray(audioFiles)) {
        throw new AppError("Danh sách tệp âm thanh phải là một mảng.", StatusCodes.BAD_REQUEST, {
            field: "audioFiles",
        });
    }

    if (audioFiles.length === 0) {
        return [];
    }

    if (audioFiles.length > MAX_AUDIO_FILES) {
        throw new AppError(
            `Một bài hát chỉ được có tối đa ${MAX_AUDIO_FILES} tệp âm thanh.`,
            StatusCodes.BAD_REQUEST,
            { field: "audioFiles" }
        );
    }

    const normalizedFiles = audioFiles.map((file, index) => {
        if (typeof file === "string") {
            return validateSingleAudioFile(
                {
                    url: file,
                    format: "mp3",
                    bitrate: 128,
                    label: "original",
                    priority: 0,
                },
                index
            );
        }

        return validateSingleAudioFile(file, index);
    });

    const labels = normalizedFiles.map((file) => file.label);

    if (new Set(labels).size !== labels.length) {
        throw new AppError("Nhãn của các tệp âm thanh không được trùng nhau.", StatusCodes.BAD_REQUEST, {
            field: "audioFiles",
        });
    }

    return normalizedFiles.sort((a, b) => b.priority - a.priority);
};

export const validateOptionalDuration = (duration, hasAudioFiles) => {
    if (duration === undefined || duration === null || duration === "") {
        return hasAudioFiles ? 0 : 0;
    }

    const parsedDuration = Number(duration);

    if (!Number.isFinite(parsedDuration) || parsedDuration < 0) {
        throw new AppError("Thời lượng phải là số lớn hơn hoặc bằng 0.", StatusCodes.BAD_REQUEST, {
            field: "duration",
        });
    }

    if (hasAudioFiles && parsedDuration <= 0) {
        throw new AppError("Thời lượng phải lớn hơn 0 khi có tệp âm thanh.", StatusCodes.BAD_REQUEST, {
            field: "duration",
        });
    }

    return parsedDuration;
};

export const validateDurationFromAudioAnalysis = (audioAnalysis, hasAudioFiles) => {
    if (!hasAudioFiles) {
        return 0;
    }

    const parsedDuration = Number(audioAnalysis?.duration);

    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
        throw new AppError(
            "Thời lượng phải được trích xuất từ tệp âm thanh đã tải lên.",
            StatusCodes.BAD_REQUEST,
            { field: "audioAnalysis.duration" }
        );
    }

    return parsedDuration;
};

export const validateOptionalGenreIds = async (genreIds) => {
    if (genreIds === undefined || genreIds === null) {
        return [];
    }

    if (!Array.isArray(genreIds)) {
        throw new AppError("Danh sách mã thể loại phải là một mảng.", StatusCodes.BAD_REQUEST, {
            field: "genreIds",
        });
    }

    if (genreIds.length === 0) {
        return [];
    }

    if (genreIds.length > MAX_GENRE_IDS) {
        throw new AppError(
            `Một bài hát chỉ được có tối đa ${MAX_GENRE_IDS} thể loại.`,
            StatusCodes.BAD_REQUEST,
            { field: "genreIds" }
        );
    }

    const normalizedIds = genreIds.map((id) => String(id).trim()).filter(Boolean);

    if (normalizedIds.length !== genreIds.length) {
        throw new AppError("Mã thể loại không được để trống.", StatusCodes.BAD_REQUEST, {
            field: "genreIds",
        });
    }

    const uniqueIds = [...new Set(normalizedIds)];

    if (uniqueIds.length !== normalizedIds.length) {
        throw new AppError("Không được phép dùng mã thể loại trùng lặp.", StatusCodes.BAD_REQUEST, {
            field: "genreIds",
        });
    }

    const invalidIds = uniqueIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));

    if (invalidIds.length > 0) {
        throw new AppError("Một hoặc nhiều mã thể loại không hợp lệ.", StatusCodes.BAD_REQUEST, {
            field: "genreIds",
        });
    }

    const objectIds = uniqueIds.map((id) => new mongoose.Types.ObjectId(id));
    const existingCount = await Genre.countDocuments({
        _id: { $in: objectIds },
        isActive: true,
    });

    if (existingCount !== uniqueIds.length) {
        throw new AppError("Một hoặc nhiều thể loại không tồn tại hoặc chưa hoạt động.", StatusCodes.BAD_REQUEST, {
            field: "genreIds",
        });
    }

    return objectIds;
};

export const validateOptionalAlbumForDraft = async (albumId, artistId) => {
    if (!albumId) {
        return null;
    }

    if (!mongoose.Types.ObjectId.isValid(albumId)) {
        throw new AppError("Mã album không hợp lệ.", StatusCodes.BAD_REQUEST, {
            field: "album_albumId",
        });
    }

    const album = await Album.findById(albumId);

    if (!album) {
        throw new AppError("Không tìm thấy album.", StatusCodes.NOT_FOUND, {
            field: "album_albumId",
        });
    }

    if (!album.artistId.equals(artistId)) {
        throw new AppError(
            "Bạn không thể thêm bài hát vào album của nghệ sĩ khác.",
            StatusCodes.FORBIDDEN,
            { field: "album_albumId" }
        );
    }

    if (album.status === "blocked" || album.status === "hidden") {
        throw new AppError(
            "Không thể thêm bài hát vào album đang bị ẩn hoặc bị khóa.",
            StatusCodes.BAD_REQUEST,
            { field: "album_albumId" }
        );
    }

    if (album.releaseDate && album.releaseDate <= new Date()) {
        throw new AppError(
            "Không thể thêm bài hát vào album đã phát hành.",
            StatusCodes.BAD_REQUEST,
            { field: "album_albumId" }
        );
    }

    return album;
};

export const sanitizeArtistCopyright = (copyright = {}) => {
    if (!copyright || typeof copyright !== "object") {
        return undefined;
    }

    const {
        copyrightStatus,
        _id,
        ...allowed
    } = copyright;

    if (Array.isArray(allowed.licenseDocumentUrls)) {
        allowed.licenseDocumentUrls = allowed.licenseDocumentUrls
            .map((url) => String(url).trim())
            .filter((url) => isHttpUrl(url));
    }

    return allowed;
};
