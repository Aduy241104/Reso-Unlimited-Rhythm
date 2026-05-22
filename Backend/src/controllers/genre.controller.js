import genreService from "../services/genre/genre.service.js";
import formatResponse from "../utils/formatResponse.js";

const listGenres = async (req, res, next) => {
    try {
        const genres = await genreService.listActiveGenres();

        return formatResponse.success(
            res,
            { genres },
            "Genres fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    listGenres,
};
