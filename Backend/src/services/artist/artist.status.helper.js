import { StatusCodes } from "http-status-codes";
import { AppError } from "../../utils/AppError.js";

export const assertArtistOperational = (artist) => {
    if (!artist) {
        throw new AppError("Artist profile does not exist.", StatusCodes.NOT_FOUND);
    }

    if (artist.isDeleted === true) {
        throw new AppError("This artist profile has been deleted.", StatusCodes.FORBIDDEN);
    }

    if (artist.activeStatus === "blocked") {
        throw new AppError("This artist profile is blocked.", StatusCodes.FORBIDDEN);
    }

    if (artist.activeStatus === "inactive") {
        throw new AppError("This artist profile is inactive.", StatusCodes.FORBIDDEN);
    }

    return artist;
};

export const publicArtistMatch = {
    activeStatus: "active",
    isDeleted: { $ne: true },
};
