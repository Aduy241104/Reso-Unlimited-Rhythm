import { getGenreList } from "../services/userGenre/user.genre.service.js";
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

export { getGenreListHandler };

export default {
    getGenreListHandler,
};
