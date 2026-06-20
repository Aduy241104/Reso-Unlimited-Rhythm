import userFavoriteService from "../services/userFavorite/user.favorite.service.js";
import formatResponse from "../utils/formatResponse.js";

const addTrackToFavorite = async (req, res, next) => {
    try {
        const trackId = req.params.trackId;
        const userId = req.user?.id || req.user?._id;
        const result = await userFavoriteService.addTrackToFavorite(userId, trackId);

        return formatResponse.success(
            res,
            result,
            "Track added to favorites successfully"
        );
    } catch (error) {
        next(error);
    }
};

const removeTrackFromFavorite = async (req, res, next) => {
    try {
        const trackId = req.params.trackId;
        const userId = req.user?.id || req.user?._id;
        const result = await userFavoriteService.removeTrackFromFavorite(userId, trackId);

        return formatResponse.success(
            res,
            result,
            "Track removed from favorites successfully"
        );
    } catch (error) {
        next(error);
    }
};

const getTrackFavoriteStatus = async (req, res, next) => {
    try {
        const trackId = req.params.trackId;
        const userId = req.user?.id || req.user?._id;
        const result = await userFavoriteService.getTrackFavoriteStatus(userId, trackId);

        return formatResponse.success(
            res,
            result,
            "Track favorite status fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

export { addTrackToFavorite, removeTrackFromFavorite, getTrackFavoriteStatus };

export default {
    addTrackToFavorite,
    removeTrackFromFavorite,
    getTrackFavoriteStatus,
};
