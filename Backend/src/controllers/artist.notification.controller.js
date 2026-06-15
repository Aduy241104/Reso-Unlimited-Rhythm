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

export default {
    getMyArtistNotifications,
};
