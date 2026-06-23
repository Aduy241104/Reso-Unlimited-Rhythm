import artistRevenueService from "../services/revenue/artistRevenue.service.js";
import formatResponse from "../utils/formatResponse.js";

const getLatestArtistRevenueDashboard = async (req, res, next) => {
    try {
        const revenueDashboard =
            await artistRevenueService.getLatestArtistRevenueDashboard(
                req.user.id
            );

        return formatResponse.success(
            res,
            revenueDashboard,
            "Artist latest revenue fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getLatestArtistRevenueDashboard,
};
