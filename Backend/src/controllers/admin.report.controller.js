import adminReportService from "../services/report/admin.report.service.js";
import formatResponse from "../utils/formatResponse.js";

const getReports = async (req, res, next) => {
    try {
        const { reports, meta } = await adminReportService.getReports(req.query);

        return formatResponse.success(
            res,
            { reports },
            "Reports fetched successfully",
            meta
        );
    } catch (error) {
        next(error);
    }
};

const getReportDetail = async (req, res, next) => {
    try {
        const report = await adminReportService.getReportDetail(req.params.id);

        return formatResponse.success(
            res,
            { report },
            "Report fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const updateReportStatus = async (req, res, next) => {
    try {
        const report = await adminReportService.updateReportStatus(
            req.params.id,
            req.body,
            req.user.id
        );

        return formatResponse.success(
            res,
            { report },
            "Report status updated successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getReports,
    getReportDetail,
    updateReportStatus,
};
