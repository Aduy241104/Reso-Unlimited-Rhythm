import artistNotificationService from "../services/notification/artist.notification.service.js";
import formatResponse from "../utils/formatResponse.js";

const getMyArtistNotifications = async (req, res, next) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const userRole = req.user?.role;
        const { notifications, meta } =
            await artistNotificationService.getMyArtistNotifications(
                userId,
                userRole,
                req.query
            );

        return formatResponse.success(
            res,
            { notifications },
            "Artist notifications fetched successfully",
            meta
        );
    } catch (error) {
        next(error);
    }
};

const getMyArtistNotificationDetail = async (req, res, next) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const userRole = req.user?.role;
        const notification =
            await artistNotificationService.getMyArtistNotificationDetail(
                userId,
                userRole,
                req.params.id
            );

        return formatResponse.success(
            res,
            { notification },
            "Artist notification detail fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getMyArtistNotifications,
    getMyArtistNotificationDetail,
};
