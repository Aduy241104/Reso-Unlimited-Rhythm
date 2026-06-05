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
            "At least one audio file is required before submitting for approval.",
            StatusCodes.BAD_REQUEST,
            { field: "audioFiles" }
        );
    }

    const labels = normalizedFiles.map((file) => file.label);

    if (!labels.includes("original")) {
        throw new AppError(
            "Original audio file is required before submitting for approval.",
            StatusCodes.BAD_REQUEST,
            { field: "audioFiles" }
        );
    }

    return normalizedFiles;
};

export const validateRequiredGenreIds = async (genreIds) => {
    if (!Array.isArray(genreIds) || genreIds.length === 0) {
        throw new AppError(
            "At least one genre is required before submitting for approval.",
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
        throw new AppError("Copyright owner is required.", StatusCodes.BAD_REQUEST, {
            field: "copyright.copyrightOwner",
        });
    }

    if (!recordingOwner) {
        throw new AppError("Recording owner is required.", StatusCodes.BAD_REQUEST, {
            field: "copyright.recordingOwner",
        });
    }

    if (copyright.declarationAccepted !== true) {
        throw new AppError(
            "You must accept the copyright declaration before submitting.",
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
            "Original track cannot be marked as cover, remix, sample, or licensed beat.",
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
                "License documents are required for cover/remix/sample/licensed beat.",
                StatusCodes.BAD_REQUEST,
                { field: "copyright.licenseDocumentUrls" }
            );
        }

        if (!String(copyright.originalTrackTitle || "").trim()) {
            throw new AppError(
                "Original track title is required for third-party rights.",
                StatusCodes.BAD_REQUEST,
                { field: "copyright.originalTrackTitle" }
            );
        }

        if (!String(copyright.originalArtistName || "").trim()) {
            throw new AppError(
                "Original artist name is required for third-party rights.",
                StatusCodes.BAD_REQUEST,
                { field: "copyright.originalArtistName" }
            );
        }
    }
};

export const assertTrackCanBeSubmitted = (track) => {
    if (!track) {
        throw new AppError("Track not found.", StatusCodes.NOT_FOUND);
    }

    if (track.approvalStatus === "pending") {
        throw new AppError(
            "Track is already pending review and cannot be submitted again.",
            StatusCodes.BAD_REQUEST
        );
    }

    if (track.approvalStatus === "approved") {
        throw new AppError(
            "Approved tracks cannot be submitted again.",
            StatusCodes.BAD_REQUEST
        );
    }
};

export const assertTrackEditableByArtist = (track) => {
    if (!track) {
        throw new AppError("Track not found.", StatusCodes.NOT_FOUND);
    }

    if (track.approvalStatus === "pending") {
        throw new AppError(
            "Cannot edit a track while it is pending review.",
            StatusCodes.BAD_REQUEST
        );
    }

    if (track.approvalStatus === "approved") {
        throw new AppError(
            "Approved tracks cannot be edited. Contact support if changes are required.",
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
            "Duration must be greater than 0 before submitting for approval.",
            StatusCodes.BAD_REQUEST,
            { field: "duration" }
        );
    }

    if (!hasCoverOrAvatar(track)) {
        throw new AppError(
            "Cover image or track avatar is required before submitting for approval.",
            StatusCodes.BAD_REQUEST,
            { field: "coverImage" }
        );
    }

    const coverCount = Array.isArray(track.coverImage)
        ? track.coverImage.filter(Boolean).length
        : 0;

    if (coverCount > MAX_COVER_IMAGES) {
        throw new AppError(
            `A track can have at most ${MAX_COVER_IMAGES} cover images.`,
            StatusCodes.BAD_REQUEST,
            { field: "coverImage" }
        );
    }

    const lyricsLength = String(track.lyricsStatic || "").length;

    if (lyricsLength > LYRICS_STATIC_MAX_LENGTH) {
        throw new AppError(
            `Static lyrics cannot exceed ${LYRICS_STATIC_MAX_LENGTH} characters.`,
            StatusCodes.BAD_REQUEST,
            { field: "lyricsStatic" }
        );
    }

    validateCopyrightForSubmit(track.copyright);

    if (track.album_albumId) {
        const albumId = track.album_albumId._id
            ? track.album_albumId._id.toString()
            : track.album_albumId.toString();

        await validateOptionalAlbumForDraft(albumId, artist._id);
    }

    if (!track.artist_artistId?.equals?.(artist._id)) {
        const trackArtistId = track.artist_artistId?.toString?.() || String(track.artist_artistId);

        if (!mongoose.Types.ObjectId.isValid(trackArtistId) || !artist._id.equals(trackArtistId)) {
            throw new AppError(
                "You can only submit tracks that belong to your artist profile.",
                StatusCodes.FORBIDDEN
            );
        }
    }
};
