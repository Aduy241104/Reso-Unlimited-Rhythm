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

export default {
  createReport,
};
