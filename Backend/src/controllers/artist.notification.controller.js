import artistNotificationService from "../services/notification/artist.notification.service.js";
import formatResponse from "../utils/formatResponse.js";

const getMyArtistNotifications = async (req, res, next) => {
    try {
        const { notifications, meta } =
            await artistNotificationService.getMyArtistNotifications(
                req.user.id,
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
        const notification =
            await artistNotificationService.getMyArtistNotificationDetail(
                req.user.id,
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
