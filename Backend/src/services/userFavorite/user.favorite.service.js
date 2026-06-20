import Interaction from "../../models/Interaction.js";
import { AppError } from "../../utils/AppError.js";
import {
    buildTrackFavoriteFilter,
    getTrackFavoriteInteraction,
    getTrackOrThrow,
    validateTrackId,
} from "./user.favorite.service.helper.js";

const addTrackToFavorite = async (userId, trackId) => {
    if (!userId) {
        throw new AppError("Unauthorized.", 401);
    }

    const normalizedTrackId = validateTrackId(trackId);

    await getTrackOrThrow(normalizedTrackId);

    const existingInteraction = await getTrackFavoriteInteraction(
        userId,
        normalizedTrackId
    );

    if (existingInteraction) {
        return {
            isFavorite: true,
        };
    }

    try {
        await Interaction.create(buildTrackFavoriteFilter(userId, normalizedTrackId));
    } catch (error) {
        if (error?.code === 11000) {
            return {
                isFavorite: true,
            };
        }

        throw error;
    }

    return {
        isFavorite: true,
    };
};

const removeTrackFromFavorite = async (userId, trackId) => {
    if (!userId) {
        throw new AppError("Unauthorized.", 401);
    }

    const normalizedTrackId = validateTrackId(trackId);

    await getTrackOrThrow(normalizedTrackId);

    await Interaction.deleteOne(
        buildTrackFavoriteFilter(userId, normalizedTrackId)
    );

    return {
        isFavorite: false,
    };
};

const getTrackFavoriteStatus = async (userId, trackId) => {
    if (!userId) {
        throw new AppError("Unauthorized.", 401);
    }

    const normalizedTrackId = validateTrackId(trackId);

    const existingInteraction = await getTrackFavoriteInteraction(
        userId,
        normalizedTrackId
    );

    return {
        isFavorite: Boolean(existingInteraction),
    };
};

export { addTrackToFavorite, removeTrackFromFavorite, getTrackFavoriteStatus };

export default {
    addTrackToFavorite,
    removeTrackFromFavorite,
    getTrackFavoriteStatus,
};
