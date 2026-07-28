import searchService from "../services/search/search.service.js";
import formatResponse from "../utils/formatResponse.js";

const searchAllHandler = async (req, res, next) => {
    try {
        const result = await searchService.searchAll(req.query);

        return formatResponse.success(
            res,
            result,
            "Search results fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const searchSongsHandler = async (req, res, next) => {
    try {
        const result = await searchService.searchSongs(req.query);

        return formatResponse.success(
            res,
            { items: result.items, pagination: result.pagination },
            "Songs search fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const searchArtistsHandler = async (req, res, next) => {
    try {
        const result = await searchService.searchArtists(req.query);

        return formatResponse.success(
            res,
            { items: result.items, pagination: result.pagination },
            "Artists search fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const searchAlbumsHandler = async (req, res, next) => {
    try {
        const result = await searchService.searchAlbums(req.query);

        return formatResponse.success(
            res,
            { items: result.items, pagination: result.pagination },
            "Albums search fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    searchAllHandler,
    searchSongsHandler,
    searchArtistsHandler,
    searchAlbumsHandler,
};
