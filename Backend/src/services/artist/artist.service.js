import { StatusCodes } from "http-status-codes";
import Artist from "../../models/Artist.js";
import { AppError } from "../../utils/AppError.js";
import { formatArtistProfile } from "./artist.helper.js";

const getMyProfileByUserId = async (userId) => {
    const artist = await Artist.findOne({ userId })
        .populate({
            path: "userId",
            select: "email profile avatar role activeStatus",
        })
        .lean();

    if (!artist) {
        throw new AppError(
            "Artist profile not found for this account.",
            StatusCodes.NOT_FOUND
        );
    }

    return formatArtistProfile(artist);
};

export default {
    getMyProfileByUserId,
};
