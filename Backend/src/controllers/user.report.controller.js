import reportService from "../services/report/user.report.service.js";
import formatResponse from "../utils/formatResponse.js";

const createReport = async (req, res, next) => {
  try {
    const report = await reportService.createReportByUserId(
      req.user.id,
      req.body,
      req.files?.images ?? []
    );

    return formatResponse.success(
      res,
      { report },
      "Report submitted successfully"
    );
  } catch (error) {
    next(error);
  }
};

const getMyReports = async (req, res, next) => {
  try {
    const result = await reportService.getReportsByUserId(req.user.id, req.query);

    return formatResponse.success(
      res,
      result,
      "Reports fetched successfully"
    );
  } catch (error) {
    next(error);
  }
};

const getMyReportDetail = async (req, res, next) => {
  try {
    const report = await reportService.getReportById(req.user.id, req.params.id);

    return formatResponse.success(
      res,
      { report },
      "Report detail fetched successfully"
    );
  } catch (error) {
    next(error);
  }
};

export default {
  createReport,
  getMyReports,
  getMyReportDetail,
};
