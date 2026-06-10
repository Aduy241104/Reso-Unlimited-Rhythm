import ArtistRequest from "../../models/ArtistRequest.js";
import { AppError } from "../../utils/AppError.js";

const PROJECTION_FIELDS = [
    "_id",
    "status",
    "stageName",
    "avatar",
    "bio",
    "genres",
    "review",
    "rejectReason",
    "reviewedAt",
    "createdAt",
    "updatedAt",
];

const POPULATE_USER_FIELDS = "_id email profile.fullName avatar";

const getMyArtistRegistrationRequests = async (userId, query = {}) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, parseInt(query.limit, 10) || 10);
    const status = query.status;

    const filter = { userId };

    if (status && ["pending", "approved", "rejected"].includes(status)) {
        filter.status = status;
    }

    const [total, requests] = await Promise.all([
        ArtistRequest.countDocuments(filter),
        ArtistRequest.find(filter)
            .populate("userId", POPULATE_USER_FIELDS)
            .select(PROJECTION_FIELDS.join(" "))
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
    ]);

    return {
        requests,
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

const getMyArtistRegistrationRequestDetail = async (userId, requestId) => {
    if (!requestId) {
        throw new AppError("Request id is required.", 400, { field: "id" });
    }

    const request = await ArtistRequest.findOne({
        _id: requestId,
        userId,
    })
        .populate("userId", POPULATE_USER_FIELDS)
        .populate("reviewedBy", "_id email profile.fullName avatar")
        .lean();

    if (!request) {
        throw new AppError("Artist registration request not found.", 404);
    }

    return request;
};

const cancelArtistRegistrationRequest = async (userId, requestId) => {
    if (!requestId) {
        throw new AppError("Request id is required.", 400, { field: "id" });
    }

    const request = await ArtistRequest.findOne({
        _id: requestId,
        userId,
    });

    if (!request) {
        throw new AppError("Artist registration request not found.", 404);
    }

    if (request.status !== "pending") {
        throw new AppError(
            "Only pending requests can be cancelled.",
            400,
            { field: "status" }
        );
    }

    await ArtistRequest.deleteOne({ _id: requestId });

    return { deleted: true, requestId };
};

export default {
    getMyArtistRegistrationRequests,
    getMyArtistRegistrationRequestDetail,
    cancelArtistRegistrationRequest,
};
