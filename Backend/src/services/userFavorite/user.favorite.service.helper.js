import mongoose from "mongoose";
import Interaction from "../../models/Interaction.js";
import Track from "../../models/Track.js";
import { AppError } from "../../utils/AppError.js";

const validateTrackId = (trackId) => {
    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Track id is invalid.", 400, {
            field: "trackId",
        });
    }

    return trackId;
};

const buildTrackFavoriteFilter = (userId, trackId) => ({
    userId,
    targetType: "Track",
    targetId: trackId,
    action: "like",
});

const buildFavoriteTracksFilter = (userId) => ({
    userId,
    targetType: "Track",
    action: "like",
});

const getTrackOrThrow = async (trackId) => {
    const track = await Track.findById(trackId).select("_id").lean();

    if (!track) {
        throw new AppError("Track not found.", 404, {
            field: "trackId",
        });
    }

    return track;
};

const getTrackFavoriteInteraction = async (userId, trackId) =>
    Interaction.findOne(buildTrackFavoriteFilter(userId, trackId))
        .select("_id")
        .lean();

export {
    validateTrackId,
    buildTrackFavoriteFilter,
    buildFavoriteTracksFilter,
    getTrackOrThrow,
    getTrackFavoriteInteraction,
};

export default {
    validateTrackId,
    buildTrackFavoriteFilter,
    buildFavoriteTracksFilter,
    getTrackOrThrow,
    getTrackFavoriteInteraction,
};
