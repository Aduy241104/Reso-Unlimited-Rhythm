import adminReportService from "../services/report/admin.report.service.js";
import formatResponse from "../utils/formatResponse.js";

const getGroupedReports = async (req, res, next) => {
    try {
        const { groups, meta } = await adminReportService.getGroupedReports(req.query);

        return formatResponse.success(
            res,
            { groups },
            "Grouped reports fetched successfully",
            meta
        );
    } catch (error) {
        next(error);
    }
};

const getGroupedReportDetail = async (req, res, next) => {
    try {
        const { targetType, targetId } = req.params;
        const detail = await adminReportService.getGroupedReportDetail(targetType, targetId);

        return formatResponse.success(
            res,
            { detail },
            "Grouped report detail fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const resolveGroupedReport = async (req, res, next) => {
    try {
        const { targetType, targetId } = req.params;
        const adminId = req.user?.id;
        const result = await adminReportService.resolveGroupedReport(
            targetType,
            targetId,
            req.body,
            adminId
        );

        return formatResponse.success(
            res,
            { result },
            "Grouped report resolved successfully"
        );
    } catch (error) {
        next(error);
    }
};

const getReports = async (req, res, next) => {
    return getGroupedReports(req, res, next);
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
            req.user?.id
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
    getGroupedReports,
    getGroupedReportDetail,
    resolveGroupedReport,
    getReports,
    getReportDetail,
    updateReportStatus,
};
