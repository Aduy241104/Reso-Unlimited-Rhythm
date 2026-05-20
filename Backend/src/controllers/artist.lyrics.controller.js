import lyricsService from "../services/Lyrics/artist.lyrics.service.js";
import formatResponse from "../utils/formatResponse.js";

const addStaticLyrics = async (req, res, next) => {
    try {
        const track = await lyricsService.addStaticLyrics(
            req.user.id,
            req.params.id,
            req.body.lyricsStatic
        );

        return formatResponse.success(
            res,
            { track },
            "Static lyrics added successfully"
        );
    } catch (error) {
        next(error);
    }
};

const updateSyncLyrics = async (req, res, next) => {
    try {
        const track = await lyricsService.updateSyncLyrics(
            req.user.id,
            req.params.id,
            req.file
        );

        return formatResponse.success(
            res,
            { track },
            "Synced lyrics updated successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    addStaticLyrics,
    updateSyncLyrics,
};
