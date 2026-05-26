import adminGenreService from "../services/genre/admin.genre.service.js";
import formatResponse from "../utils/formatResponse.js";

const getGenres = async (req, res, next) => {
    try {
        const { genres, meta } = await adminGenreService.getGenres(req.query);

        return formatResponse.success(
            res,
            { genres },
            "Genres fetched successfully",
            meta
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getGenres,
};
