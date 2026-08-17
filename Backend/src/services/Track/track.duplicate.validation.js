import { StatusCodes } from "http-status-codes";
import Track from "../../models/Track.js";
import { AppError } from "../../utils/AppError.js";

export const TRACK_TITLE_VERSION_EXISTS_CODE = "TRACK_TITLE_VERSION_EXISTS";

export const normalizeTrackVersionTitle = (versionTitle) =>
    typeof versionTitle === "string" ? versionTitle.trim() : "";

export const buildTrackTitleVersionExistsError = () =>
    new AppError(
        "Bạn đã có một bài hát cùng tên và cùng phiên bản. Vui lòng đổi tên bài hát hoặc tên phiên bản.",
        StatusCodes.CONFLICT,
        {
            code: TRACK_TITLE_VERSION_EXISTS_CODE,
            field: "title",
            fields: ["artist_artistId", "title", "versionTitle"],
            message: "Bài hát cùng tên và cùng phiên bản đã tồn tại.",
        }
    );

export const assertTrackTitleVersionAvailable = async ({
    artistId,
    title,
    versionTitle = "",
    excludeTrackId = null,
} = {}) => {
    if (!artistId || !title) {
        return;
    }

    const filter = {
        artist_artistId: artistId,
        title,
        versionTitle: normalizeTrackVersionTitle(versionTitle),
        isDeleted: { $ne: true },
    };

    if (excludeTrackId) {
        filter._id = { $ne: excludeTrackId };
    }

    const existingTrack = await Track.findOne(filter)
        .select("_id title versionTitle")
        .lean();

    if (existingTrack) {
        throw buildTrackTitleVersionExistsError();
    }
};
