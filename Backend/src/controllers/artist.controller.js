import artistService from "../services/artist/artist.service.js";
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

export default {
    getArtistProfile,
    getArtistTracks,
};
