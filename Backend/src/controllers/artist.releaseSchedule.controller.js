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

export default {
    getMyReleaseSchedules,
};
