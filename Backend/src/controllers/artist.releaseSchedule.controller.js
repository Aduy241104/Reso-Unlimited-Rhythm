import artistReleaseScheduleService from "../services/artist.releaseSchedule.service.js";
import formatResponse from "../utils/formatResponse.js";

const getMyReleaseSchedules = async (req, res, next) => {
    try {
        const result = await artistReleaseScheduleService.getMyReleaseSchedules(
            req.user.id,
            req.query
        );

        return formatResponse.success(
            res,
            {
                artist: result.artist,
                releaseSchedules: result.releaseSchedules,
                filters: result.filters,
            },
            "Artist release schedules fetched successfully",
            result.pagination
        );
    } catch (error) {
        next(error);
    }
};

const getMyReleaseScheduleDetail = async (req, res, next) => {
    try {
        const result = await artistReleaseScheduleService.getMyReleaseScheduleDetail(
            req.user.id,
            req.params.id
        );

        return formatResponse.success(
            res,
            {
                artist: result.artist,
                releaseSchedule: result.releaseSchedule,
            },
            "Artist release schedule detail fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const cancelMyReleaseSchedule = async (req, res, next) => {
    try {
        const result = await artistReleaseScheduleService.cancelMyReleaseSchedule(
            req.user.id,
            req.params.id
        );

        return formatResponse.success(
            res,
            {
                artist: result.artist,
                releaseSchedule: result.releaseSchedule,
            },
            "Artist release schedule cancelled successfully"
        );
    } catch (error) {
        next(error);
    }
};

const createMyReleaseSchedule = async (req, res, next) => {
    try {
        const io = req.app.get("io");
        const result = await artistReleaseScheduleService.createMyReleaseSchedule(
            req.user.id,
            req.body,
            io
        );

        return formatResponse.success(
            res,
            {
                artist: result.artist,
                releaseSchedule: result.releaseSchedule,
            },
            "Artist release schedule created successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    cancelMyReleaseSchedule,
    createMyReleaseSchedule,
    getMyReleaseScheduleDetail,
    getMyReleaseSchedules,
};
