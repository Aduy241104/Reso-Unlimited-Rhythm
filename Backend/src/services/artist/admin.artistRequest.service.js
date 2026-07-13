import Artist from "../../models/Artist.js";
import ArtistRequest from "../../models/ArtistRequest.js";
import User from "../../models/User.js";
import { AppError } from "../../utils/AppError.js";
import {
    applyReviewFields,
    assertApprovalChecklist,
    assertArtistRequestId,
    buildArtistDetailQuery,
    buildArtistPayloadFromRequest,
    buildArtistRequestDetailQuery,
} from "./admin.artistRequest.service.helper.js";

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
        .populate("userId", "_id email profile.fullName avatar")
        .select(
            [
                "_id",
                "userId",
                "stageName",
                "avatar",
                "status",
                "createdAt",
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

const getArtistRequestDetail = async (artistRequestId) => {
    assertArtistRequestId(artistRequestId);

    const artistRequest = await buildArtistRequestDetailQuery(artistRequestId);

    if (!artistRequest) {
        throw new AppError("Artist request not found.", 404);
    }

    return artistRequest;
};

const reviewArtistRequest = async (artistRequestId, payload = {}, adminUserId) => {
    assertArtistRequestId(artistRequestId);

    const artistRequest = await ArtistRequest.findById(artistRequestId);

    if (!artistRequest) {
        throw new AppError("Artist request not found.", 404);
    }

    if (artistRequest.status === "approved") {
        throw new AppError(
            "This artist request has already been approved and cannot be reviewed again.",
            409
        );
    }

    applyReviewFields(artistRequest, payload, adminUserId);

    if (payload.status === "approved") {
        assertApprovalChecklist(payload.checklist);

        const [user, existingArtist] = await Promise.all([
            User.findById(artistRequest.userId),
            Artist.findOne({ userId: artistRequest.userId }).lean(),
        ]);

        if (!user) {
            throw new AppError("User for this artist request was not found.", 404, {
                field: "userId",
            });
        }

        if (existingArtist) {
            throw new AppError(
                "An artist profile already exists for this user.",
                409,
                {
                    field: "userId",
                }
            );
        }

        const previousUserRole = user.role;
        let artist = null;

        try {
            artist = await Artist.create(buildArtistPayloadFromRequest(artistRequest));

            user.role = "artist";
            await user.save();

            artistRequest.status = "approved";
            artistRequest.rejectReason = "";
            await artistRequest.save();
        } catch (error) {
            if (artist?._id) {
                await Artist.deleteOne({ _id: artist._id }).catch(() => null);
            }

            if (user.role !== previousUserRole) {
                user.role = previousUserRole;
                await user.save().catch(() => null);
            }

            throw error;
        }

        return {
            artistRequest: await buildArtistRequestDetailQuery(artistRequest._id),
            artist: await buildArtistDetailQuery(artist._id),
        };
    }

    artistRequest.status = "rejected";
    artistRequest.rejectReason = payload.rejectReason?.trim() || "";
    await artistRequest.save();

    return {
        artistRequest: await buildArtistRequestDetailQuery(artistRequest._id),
        artist: null,
    };
};

export default {
    getArtistRequests,
    getArtistRequestDetail,
    reviewArtistRequest,
};
