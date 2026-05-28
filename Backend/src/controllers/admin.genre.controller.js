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

const getGenre = async (req, res, next) => {
    try {
        const genre = await adminGenreService.getGenreById(req.params.id);

        return formatResponse.success(
            res,
            { genre },
            "Genre fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const updateGenre = async (req, res, next) => {
    try {
        const genre = await adminGenreService.updateGenre(req.params.id, req.body);

        return formatResponse.success(
            res,
            { genre },
            "Genre updated successfully"
        );
    } catch (error) {
        next(error);
    }
};

const uploadGenreImage = async (req, res, next) => {
    try {
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: "No genre image file provided.",
            });
        }

        const imageUrl = await adminGenreService.uploadGenreImage(file.buffer);

        return formatResponse.success(
            res,
            { url: imageUrl },
            "Genre image uploaded successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getGenres,
    createGenre,
    getGenre,
    updateGenre,
    uploadGenreImage,
};
