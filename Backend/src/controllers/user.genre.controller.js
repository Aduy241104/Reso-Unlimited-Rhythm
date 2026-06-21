import {
    getGenreList,
    getGenreTracksByGenreId,
} from "../services/userGenre/user.genre.service.js";
import formatResponse from "../utils/formatResponse.js";

const getGenreListHandler = async (req, res, next) => {
    try {
        const genres = await getGenreList();

        return formatResponse.success(
            res,
            { genres },
            "Genres fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const getGenreTracksByGenreIdHandler = async (req, res, next) => {
    try {
        const result = await getGenreTracksByGenreId(
            req.params.genreId,
            req.query
        );

        return formatResponse.success(
            res,
            result,
            "Genre tracks fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

export { getGenreListHandler, getGenreTracksByGenreIdHandler };

export default {
    getGenreListHandler,
    getGenreTracksByGenreIdHandler,
};
