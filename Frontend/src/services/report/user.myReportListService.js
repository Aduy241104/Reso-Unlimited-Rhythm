import axiosClient from "../../axios/axiosClient";

const REPORT_API_PREFIX = "/api/users/reports";

export const getMyReportsService = async (params = {}, config = {}) => {
    const { data } = await axiosClient.get(REPORT_API_PREFIX, {
        params,
        ...config,
    });
    return data;
};

export const getMyReportDetailService = async (reportId, config = {}) => {
    const { data } = await axiosClient.get(
        `${REPORT_API_PREFIX}/${reportId}`,
        config
    );
    return data;
};
