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

const getArtistRevenuePeriods = async (req, res, next) => {
    try {
        const result = await artistRevenueService.getArtistRevenuePeriods(
            req.user.id,
            req.query
        );

        return formatResponse.success(
            res,
            { revenuePeriods: result.revenuePeriods },
            "Artist revenue periods fetched successfully",
            result.pagination
        );
    } catch (error) {
        next(error);
    }
};

const getArtistRevenuePeriodDetail = async (req, res, next) => {
    try {
        const revenuePeriod = await artistRevenueService.getArtistRevenuePeriodDetail(
            req.user.id,
            req.params.id
        );

        return formatResponse.success(
            res,
            revenuePeriod,
            "Artist revenue period fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getLatestArtistRevenueDashboard,
    getArtistRevenuePeriods,
    getArtistRevenuePeriodDetail,
};
