import { StatusCodes } from "http-status-codes";
import Artist from "../../models/Artist.js";
import ArtistRequest from "../../models/ArtistRequest.js";
import { AppError } from "../../utils/AppError.js";
import { normalizeArtistName } from "./artist.name.normalizer.js";

export const ARTIST_STAGE_NAME_CONFLICT_CODE = "ARTIST_STAGE_NAME_EXISTS";
export const ARTIST_STAGE_NAME_CONFLICT_MESSAGE =
    "Nghệ danh này đã được sử dụng. Vui lòng chọn nghệ danh khác.";

export const createArtistStageNameConflictError = () =>
    new AppError(
        ARTIST_STAGE_NAME_CONFLICT_MESSAGE,
        StatusCodes.CONFLICT,
        {
            code: ARTIST_STAGE_NAME_CONFLICT_CODE,
            field: "stageName",
            message: ARTIST_STAGE_NAME_CONFLICT_MESSAGE,
        }
    );

const hasLegacyArtistNameConflict = (artists, nameKey) =>
    artists.some((artist) => normalizeArtistName(artist.name) === nameKey);

const hasLegacyPendingRequestConflict = (requests, nameKey) =>
    requests.some((request) => normalizeArtistName(request.stageName) === nameKey);

export const assertArtistStageNameAvailable = async (
    value,
    { excludeArtistId = null, excludeRequestId = null } = {}
) => {
    const nameKey = normalizeArtistName(value);

    if (!nameKey) return nameKey;

    const artistIdFilter = excludeArtistId ? { _id: { $ne: excludeArtistId } } : {};
    const requestIdFilter = excludeRequestId ? { _id: { $ne: excludeRequestId } } : {};

    const [existingArtist, legacyArtists, existingRequest, legacyRequests] =
        await Promise.all([
            Artist.findOne({
                ...artistIdFilter,
                nameKey,
                isDeleted: { $ne: true },
            })
                .select("_id name nameKey")
                .lean(),
            Artist.find({
                ...artistIdFilter,
                nameKey: { $exists: false },
                isDeleted: { $ne: true },
            })
                .select("_id name nameKey")
                .lean(),
            ArtistRequest.findOne({
                ...requestIdFilter,
                stageNameKey: nameKey,
                status: "pending",
            })
                .select("_id stageName stageNameKey status")
                .lean(),
            ArtistRequest.find({
                ...requestIdFilter,
                stageNameKey: { $exists: false },
                status: "pending",
            })
                .select("_id stageName stageNameKey status")
                .lean(),
        ]);

    if (
        existingArtist ||
        hasLegacyArtistNameConflict(legacyArtists, nameKey) ||
        existingRequest ||
        hasLegacyPendingRequestConflict(legacyRequests, nameKey)
    ) {
        throw createArtistStageNameConflictError();
    }

    return nameKey;
};

export default {
    normalizeArtistName,
    assertArtistStageNameAvailable,
    createArtistStageNameConflictError,
};
