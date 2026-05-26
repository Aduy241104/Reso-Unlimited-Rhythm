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

const createGenre = async (req, res, next) => {
    try {
        const genre = await adminGenreService.createGenre(req.body);

        return formatResponse.success(
            res,
            { genre },
            "Genre created successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getGenres,
    createGenre,
};
