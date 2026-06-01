import ArtistRequest from "../../models/ArtistRequest.js";

const getArtistRequests = async (query) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, parseInt(query.limit, 10) || 20);
    const q = (query.q || "").trim();

    const filter = {};

    if (query.status) {
        filter.status = query.status;
    }

    if (q) {
        const regex = new RegExp(q, "i");
        filter.$or = [
            { stageName: regex },
            { bio: regex },
            { "identityInfo.fullName": regex },
            { "identityInfo.idNumber": regex },
        ];
    }

    const total = await ArtistRequest.countDocuments(filter);

    const artistRequests = await ArtistRequest.find(filter)
        .populate("userId", "_id email role activeStatus profile.fullName avatar")
        .populate("reviewedBy", "_id email profile.fullName")
        .select(
            [
                "_id",
                "userId",
                "stageName",
                "bio",
                "avatar",
                "genres",
                "socialLinks",
                "identityInfo.fullName",
                "identityInfo.idNumber",
                "status",
                "reviewedBy",
                "reviewedAt",
                "rejectReason",
                "createdAt",
                "updatedAt",
            ].join(" ")
        )
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    const meta = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    };

    return { artistRequests, meta };
};

export default {
    getArtistRequests,
};
