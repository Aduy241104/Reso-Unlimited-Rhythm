import artistService from "../services/artistBrowse/artistBrowse.service.js";
import formatResponse from "../utils/formatResponse.js";

const getArtistProfile = async (req, res, next) => {
    try {
        const artistProfile = await artistService.getArtistProfile(req.params.id);

        return formatResponse.success(
            res,
            artistProfile,
            "Artist profile fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const getArtistTracks = async (req, res, next) => {
    try {
        const result = await artistService.getArtistTracks(req.params.id, req.query);

        return formatResponse.success(
            res,
            { tracks: result.tracks },
            "Artist tracks fetched successfully",
            result.pagination
        );
    } catch (error) {
        next(error);
    }
};

const getArtistAlbums = async (req, res, next) => {
    try {
        const result = await artistService.getArtistAlbums(req.params.id, req.query);

        return formatResponse.success(
            res,
            { albums: result.albums },
            "Artist albums fetched successfully",
            result.pagination
        );
    } catch (error) {
        next(error);
    }
};

const getArtistComingReleases = async (req, res, next) => {
    try {
        const result = await artistService.getArtistComingReleases(
            req.params.id,
            req.query
        );

        return formatResponse.success(
            res,
            { comingReleases: result.comingReleases },
            "Artist coming releases fetched successfully",
            result.pagination
        );
    } catch (error) {
        next(error);
    }
};

const getDailyTopArtists = async (req, res, next) => {
    try {
        const { topArtists, meta } = await artistService.getDailyTopArtists(req.query);

        return formatResponse.success(
            res,
            { topArtists },
            "Daily top artists fetched successfully",
            meta
        );
    } catch (error) {
        next(error);
    }
};

const getMonthlyTopArtists = async (req, res, next) => {
    try {
        const { topArtists, meta } = await artistService.getMonthlyTopArtists(req.query);

        return formatResponse.success(
            res,
            { topArtists },
            "Monthly top artists fetched successfully",
            meta
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getDailyTopArtists,
    getMonthlyTopArtists,
    getArtistProfile,
    getArtistAlbums,
    getArtistComingReleases,
    getArtistTracks,
};
