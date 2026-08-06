import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../utils/AppError.js";
import {
    assertArtistCanCreateTrack,
    LYRICS_STATIC_MAX_LENGTH,
    MAX_COVER_IMAGES,
    validateDraftTitle,
    validateOptionalAlbumForDraft,
    validateOptionalAudioFiles,
    validateOptionalGenreIds,
} from "./track.draft.validation.js";

export const MIN_GENRE_IDS_SUBMIT = 1;

const hasCoverOrAvatar = (track) => {
    const avatar = typeof track?.avatar === "string" ? track.avatar.trim() : "";
    const coverImages = Array.isArray(track?.coverImage)
        ? track.coverImage.filter(Boolean)
        : [];

    return Boolean(avatar) || coverImages.length > 0;
};

export const validateRequiredAudioFiles = (audioFiles) => {
    const normalizedFiles = validateOptionalAudioFiles(audioFiles);

    if (normalizedFiles.length === 0) {
        throw new AppError(
            "Cần ít nhất một tệp âm thanh trước khi gửi duyệt.",
            StatusCodes.BAD_REQUEST,
            { field: "audioFiles" }
        );
    }

    const labels = normalizedFiles.map((file) => file.label);

    if (!labels.includes("original")) {
        throw new AppError(
            "Cần có tệp âm thanh gốc trước khi gửi duyệt.",
            StatusCodes.BAD_REQUEST,
            { field: "audioFiles" }
        );
    }

    return normalizedFiles;
};

export const validateRequiredGenreIds = async (genreIds) => {
    if (!Array.isArray(genreIds) || genreIds.length === 0) {
        throw new AppError(
            "Cần chọn ít nhất một thể loại trước khi gửi duyệt.",
            StatusCodes.BAD_REQUEST,
            { field: "genreIds" }
        );
    }

    return validateOptionalGenreIds(genreIds);
};

export const validateCopyrightForSubmit = (copyright = {}) => {
    const copyrightOwner = String(copyright.copyrightOwner || "").trim();
    const recordingOwner = String(copyright.recordingOwner || "").trim();

    if (!copyrightOwner) {
        throw new AppError("Chủ sở hữu bản quyền là bắt buộc.", StatusCodes.BAD_REQUEST, {
            field: "copyright.copyrightOwner",
        });
    }

    if (!recordingOwner) {
        throw new AppError("Chủ sở hữu bản ghi âm là bắt buộc.", StatusCodes.BAD_REQUEST, {
            field: "copyright.recordingOwner",
        });
    }

    if (copyright.declarationAccepted !== true) {
        throw new AppError(
            "Bạn phải chấp nhận tuyên bố bản quyền trước khi gửi duyệt.",
            StatusCodes.BAD_REQUEST,
            { field: "copyright.declarationAccepted" }
        );
    }

    const hasThirdPartyRights =
        Boolean(copyright.isCover) ||
        Boolean(copyright.isRemix) ||
        Boolean(copyright.usesSample) ||
        Boolean(copyright.usesLicensedBeat);

    if (copyright.isOriginal && hasThirdPartyRights) {
        throw new AppError(
            "Tác phẩm gốc không thể đồng thời được đánh dấu là bản hát lại, bản phối lại, có đoạn nhạc mẫu hoặc phần nhạc nền được cấp phép.",
            StatusCodes.BAD_REQUEST,
            { field: "copyright.isOriginal" }
        );
    }

    if (hasThirdPartyRights) {
        const licenseUrls = Array.isArray(copyright.licenseDocumentUrls)
            ? copyright.licenseDocumentUrls.filter(Boolean)
            : [];

        if (licenseUrls.length === 0) {
            throw new AppError(
                "Cần có tài liệu cấp phép cho bản hát lại, bản phối lại, đoạn nhạc mẫu hoặc phần nhạc nền được cấp phép.",
                StatusCodes.BAD_REQUEST,
                { field: "copyright.licenseDocumentUrls" }
            );
        }

        if (!String(copyright.originalTrackTitle || "").trim()) {
            throw new AppError(
                "Tên bài hát gốc là bắt buộc khi sử dụng quyền của bên thứ ba.",
                StatusCodes.BAD_REQUEST,
                { field: "copyright.originalTrackTitle" }
            );
        }

        if (!String(copyright.originalArtistName || "").trim()) {
            throw new AppError(
                "Tên nghệ sĩ gốc là bắt buộc khi sử dụng quyền của bên thứ ba.",
                StatusCodes.BAD_REQUEST,
                { field: "copyright.originalArtistName" }
            );
        }
    }
};

export const assertTrackCanBeSubmitted = (track) => {
    if (!track) {
        throw new AppError("Không tìm thấy bài hát.", StatusCodes.NOT_FOUND);
    }

    if (track.approvalStatus === "pending") {
        throw new AppError(
            "Bài hát đang chờ duyệt nên không thể gửi lại.",
            StatusCodes.BAD_REQUEST
        );
    }

    if (track.approvalStatus === "approved") {
        throw new AppError(
            "Bài hát đã được phê duyệt không thể gửi lại.",
            StatusCodes.BAD_REQUEST
        );
    }
};

export const assertTrackEditableByArtist = (track) => {
    if (!track) {
        throw new AppError("Không tìm thấy bài hát.", StatusCodes.NOT_FOUND);
    }

    if (track.activeStatus === "blocked") {
        throw new AppError(
            "Không thể chỉnh sửa bài hát đang bị khóa.",
            StatusCodes.BAD_REQUEST
        );
    }

    if (track.approvalStatus === "pending") {
        throw new AppError(
            "Không thể chỉnh sửa bài hát khi đang chờ duyệt.",
            StatusCodes.BAD_REQUEST
        );
    }

    if (track.pendingUpdate?.status === "pending") {
        throw new AppError(
            "Không thể chỉnh sửa bài hát khi bản cập nhật đang được xem xét.",
            StatusCodes.BAD_REQUEST
        );
    }
};

export const validateTrackForSubmit = async (track, artist) => {
    assertArtistCanCreateTrack(artist);
    assertTrackCanBeSubmitted(track);

    validateDraftTitle(track.title);

    await validateRequiredGenreIds(track.genreIds);
    validateRequiredAudioFiles(track.audioFiles);

    const duration = Number(track.duration);

    if (!Number.isFinite(duration) || duration <= 0) {
        throw new AppError(
            "Thời lượng phải lớn hơn 0 trước khi gửi duyệt.",
            StatusCodes.BAD_REQUEST,
            { field: "duration" }
        );
    }

    if (!hasCoverOrAvatar(track)) {
        throw new AppError(
            "Cần có ảnh bìa hoặc ảnh đại diện bài hát trước khi gửi duyệt.",
            StatusCodes.BAD_REQUEST,
            { field: "coverImage" }
        );
    }

    const coverCount = Array.isArray(track.coverImage)
        ? track.coverImage.filter(Boolean).length
        : 0;

    if (coverCount > MAX_COVER_IMAGES) {
        throw new AppError(
            `Một bài hát chỉ được có tối đa ${MAX_COVER_IMAGES} ảnh bìa.`,
            StatusCodes.BAD_REQUEST,
            { field: "coverImage" }
        );
    }

    const lyricsLength = String(track.lyricsStatic || "").length;

    if (lyricsLength > LYRICS_STATIC_MAX_LENGTH) {
        throw new AppError(
            `Lời bài hát tĩnh không được vượt quá ${LYRICS_STATIC_MAX_LENGTH} ký tự.`,
            StatusCodes.BAD_REQUEST,
            { field: "lyricsStatic" }
        );
    }

    validateCopyrightForSubmit(track.copyright);

    if (!track.artist_artistId?.equals?.(artist._id)) {
        const trackArtistId = track.artist_artistId?.toString?.() || String(track.artist_artistId);

        if (!mongoose.Types.ObjectId.isValid(trackArtistId) || !artist._id.equals(trackArtistId)) {
            throw new AppError(
                "Bạn chỉ có thể gửi duyệt bài hát thuộc hồ sơ nghệ sĩ của mình.",
                StatusCodes.FORBIDDEN
            );
        }
    }
};
