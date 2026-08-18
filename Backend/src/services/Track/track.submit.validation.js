import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../utils/AppError.js";
import Track from "../../models/Track.js";
import {
    assertArtistCanCreateTrack,
    LYRICS_STATIC_MAX_LENGTH,
    MAX_COVER_IMAGES,
    validateDraftTitle,
    validateOptionalAlbumForDraft,
    validateOptionalAudioFiles,
    validateOptionalGenreIds,
} from "./track.draft.validation.js";
import { validateCopyrightForSubmit as validateCopyrightDeclaration } from "./copyright.validation.service.js";

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

export const validateCopyrightForSubmit = (copyright = {}) =>
    validateCopyrightDeclaration(copyright);

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const assertTrackTitleIsAvailable = async (title, artistId, excludedTrackId = null) => {
    const normalizedTitle = typeof title === "string" ? title.trim() : "";
    if (!normalizedTitle || !artistId) return;

    const titlePattern = new RegExp(`^${escapeRegExp(normalizedTitle)}$`, "i");
    const query = {
        artist_artistId: artistId,
        isDeleted: { $ne: true },
        $or: [
            { title: titlePattern },
            { "pendingUpdate.data.title": titlePattern },
        ],
    };

    if (excludedTrackId) {
        query._id = { $ne: excludedTrackId };
    }

    const duplicate = await Track.findOne(query);
    if (!duplicate) return;
    if (excludedTrackId && String(duplicate._id || "") === String(excludedTrackId)) return;

    throw new AppError(
        "Tên bài hát này đã tồn tại trong kho nhạc của bạn. Vui lòng chọn tên khác.",
        StatusCodes.CONFLICT,
        {
            code: "TRACK_TITLE_EXISTS",
            field: "title",
        },
    );
};

// The edit screen can display a rejected/pending version from pendingUpdate.data.
// Submission must validate that same version instead of the currently published
// track snapshot, otherwise the UI and the submit validator inspect different data.
export const getTrackSubmissionData = (track) => {
    const pendingStatus = track?.pendingUpdate?.status;
    const pendingData = track?.pendingUpdate?.data;

    if (pendingData && (pendingStatus === "rejected" || pendingStatus === "pending")) {
        const current = track?.toObject?.() || track || {};
        const pendingCopyright = pendingData.copyright && typeof pendingData.copyright === "object"
            ? pendingData.copyright
            : {};
        const currentCopyright = current.copyright && typeof current.copyright === "object"
            ? current.copyright
            : {};

        // A rejected/pending snapshot may predate the current copyright form
        // or contain only a partial edit. Validate the same effective values
        // shown to the artist instead of rejecting valid live metadata because
        // an old pending payload omitted required copyright fields.
        return {
            ...current,
            ...pendingData,
            copyright: {
                ...currentCopyright,
                ...pendingCopyright,
            },
        };
    }

    return track;
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

    const submissionData = getTrackSubmissionData(track);

    validateDraftTitle(submissionData.title);
    await assertTrackTitleIsAvailable(submissionData.title, artist._id, track._id);

    await validateRequiredGenreIds(submissionData.genreIds);
    validateRequiredAudioFiles(submissionData.audioFiles);

    const duration = Number(submissionData.duration);

    if (!Number.isFinite(duration) || duration <= 0) {
        throw new AppError(
            "Thời lượng phải lớn hơn 0 trước khi gửi duyệt.",
            StatusCodes.BAD_REQUEST,
            { field: "duration" }
        );
    }

    if (!hasCoverOrAvatar(submissionData)) {
        throw new AppError(
            "Cần có ảnh bìa hoặc ảnh đại diện bài hát trước khi gửi duyệt.",
            StatusCodes.BAD_REQUEST,
            { field: "coverImage" }
        );
    }

    const coverCount = Array.isArray(submissionData.coverImage)
        ? submissionData.coverImage.filter(Boolean).length
        : 0;

    if (coverCount > MAX_COVER_IMAGES) {
        throw new AppError(
            `Một bài hát chỉ được có tối đa ${MAX_COVER_IMAGES} ảnh bìa.`,
            StatusCodes.BAD_REQUEST,
            { field: "coverImage" }
        );
    }

    const lyricsLength = String(submissionData.lyricsStatic || "").length;

    if (lyricsLength > LYRICS_STATIC_MAX_LENGTH) {
        throw new AppError(
            `Lời bài hát tĩnh không được vượt quá ${LYRICS_STATIC_MAX_LENGTH} ký tự.`,
            StatusCodes.BAD_REQUEST,
            { field: "lyricsStatic" }
        );
    }

    validateCopyrightForSubmit(submissionData.copyright);

    if (!track.artist_artistId?.equals?.(artist._id)) {
        const trackArtistId = track.artist_artistId?.toString?.() || String(track.artist_artistId);

        if (!mongoose.Types.ObjectId.isValid(trackArtistId) || !artist._id.equals(trackArtistId)) {
            throw new AppError(
                "Bạn chỉ có thể gửi duyệt bài hát thuộc hồ sơ nghệ sĩ của mình.",
                StatusCodes.FORBIDDEN
            );
        }
    }

    return submissionData;
};
