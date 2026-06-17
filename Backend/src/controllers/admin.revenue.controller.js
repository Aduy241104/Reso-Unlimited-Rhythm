import adminRevenueService from "../services/revenue/admin.revenue.service.js";
import formatResponse from "../utils/formatResponse.js";

const getRevenueDashboard = async (req, res, next) => {
    try {
        const dashboard = await adminRevenueService.getRevenueDashboard(req.query);

        return formatResponse.success(
            res,
            dashboard,
            "Revenue dashboard fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getRevenueDashboard,
};
