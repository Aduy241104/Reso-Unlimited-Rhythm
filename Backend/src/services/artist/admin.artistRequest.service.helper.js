import mongoose from "mongoose";
import Artist from "../../models/Artist.js";
import ArtistRequest from "../../models/ArtistRequest.js";
import { AppError } from "../../utils/AppError.js";

const CHECKLIST_KEYS = [
    "profileComplete",
    "identityVerified",
    "hasMusicActivity",
    "socialLinksValid",
    "noImpersonation",
    "acceptedCopyrightPolicy",
];

export const assertArtistRequestId = (artistRequestId) => {
    if (!mongoose.Types.ObjectId.isValid(artistRequestId)) {
        throw new AppError("Artist request id is invalid.", 400, {
            field: "id",
        });
    }
};

export const buildArtistRequestDetailQuery = (artistRequestId) =>
    ArtistRequest.findById(artistRequestId)
        .populate("userId", "_id email role activeStatus profile.fullName avatar")
        .populate("reviewedBy", "_id email profile.fullName avatar")
        .lean();

export const buildArtistDetailQuery = (artistId) =>
    Artist.findById(artistId)
        .populate("userId", "_id email role activeStatus profile.fullName avatar")
        .lean();

const normalizeChecklist = (checklist = {}) =>
    CHECKLIST_KEYS.reduce((result, key) => {
        result[key] = checklist[key] === true;
        return result;
    }, {});

export const applyReviewFields = (artistRequest, payload, adminUserId) => {
    const currentReview = artistRequest.review?.toObject?.() ?? artistRequest.review ?? {};

    artistRequest.review = {
        ...currentReview,
        adminNote: payload.adminNote?.trim() || "",
        checklist: normalizeChecklist(payload.checklist),
    };
    artistRequest.reviewedBy = adminUserId;
    artistRequest.reviewedAt = new Date();
    artistRequest.markModified("review");
};

export const assertApprovalChecklist = (checklist) => {
    const failedKeys = CHECKLIST_KEYS.filter((key) => checklist[key] !== true);

    if (failedKeys.length > 0) {
        throw new AppError(
            "All review checklist items must be accepted before approving this artist request.",
            400,
            failedKeys.map((key) => ({
                field: `checklist.${key}`,
                message: "This item must be checked before approval.",
            }))
        );
    }
};

export const buildArtistPayloadFromRequest = (artistRequest) => ({
    userId: artistRequest.userId,
    name: artistRequest.stageName,
    bio: artistRequest.bio || "",
    avatar: artistRequest.avatar || "",
    socialLinks: {
        facebook: artistRequest.socialLinks?.facebook || "",
        instagram: artistRequest.socialLinks?.instagram || "",
        youtube: artistRequest.socialLinks?.youtube || "",
    },
    activeStatus: "active",
});

export default {
    assertArtistRequestId,
    buildArtistRequestDetailQuery,
    buildArtistDetailQuery,
    applyReviewFields,
    assertApprovalChecklist,
    buildArtistPayloadFromRequest,
};
