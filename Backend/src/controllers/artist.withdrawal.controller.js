import artistWithdrawalService from "../services/artist/artist.withdrawal.service.js";
import formatResponse from "../utils/formatResponse.js";

const getMyRevenueSummary = async (req, res, next) => {
    try {
        const revenue = await artistWithdrawalService.getMyRevenueSummaryByUserId(
            req.user.id
        );

        return formatResponse.success(
            res,
            { revenue },
            "Artist revenue summary fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getMyRevenueSummary,
};
