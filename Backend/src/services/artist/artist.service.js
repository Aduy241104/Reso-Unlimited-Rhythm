import { StatusCodes } from "http-status-codes";
import Artist from "../../models/Artist.js";
import ArtistVerificationRequest from "../../models/ArtistVerificationRequest.js";
import { AppError } from "../../utils/AppError.js";
import { uploadImageBuffer, deleteImageByPublicId } from "../cloudinaryService.js";
import { extractPublicIdFromUrl } from "../../utils/uploadCloud.js";
import { formatArtistProfile } from "./artist.helper.js";

const CLOUDINARY_ARTIST_FOLDER = "reso/artists";

const findOwnedArtistDocumentOrThrow = async (userId) => {
    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError(
            "Artist profile not found for this account.",
            StatusCodes.NOT_FOUND
        );
    }

    if (artist.activeStatus === "blocked") {
        throw new AppError(
            "Your artist profile cannot be updated while it is blocked.",
            StatusCodes.FORBIDDEN
        );
    }

    return artist;
};

const enrichArtistProfilePayload = async (artistLean) => {
    const formatted = formatArtistProfile(artistLean);
    const pending = await ArtistVerificationRequest.exists({
        artistId: artistLean._id,
        status: "open",
    });

    return {
        ...formatted,
        hasPendingVerificationRequest: Boolean(pending),
    };
};

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

    return enrichArtistProfilePayload(artist);
};

const getMyBlockStatusByUserId = async (userId) => {
    const artist = await Artist.findOne({ userId })
        .select("activeStatus blockedReason")
        .lean();

    if (!artist) {
        throw new AppError(
            "Artist profile not found for this account.",
            StatusCodes.NOT_FOUND
        );
    }

    const isBlocked = artist.activeStatus === "blocked";

    return {
        isBlocked,
        activeStatus: artist.activeStatus,
        blockedReason: isBlocked ? artist.blockedReason ?? "" : "",
    };
};

const updateMyProfileByUserId = async (userId, payload) => {
    const artist = await findOwnedArtistDocumentOrThrow(userId);

    if (payload.name !== undefined) {
        artist.name = payload.name;
    }

    if (payload.bio !== undefined) {
        artist.bio = payload.bio;
    }

    if (payload.removeAvatar === true) {
        const currentAvatarUrl = artist.avatar;
        if (currentAvatarUrl) {
            const publicId = extractPublicIdFromUrl(currentAvatarUrl);
            if (publicId) {
                try {
                    const result = await deleteImageByPublicId(publicId, true);
                    console.log("[DEBUG] Delete avatar result:", result);
                } catch (err) {
                    console.error("[ERROR] Delete avatar failed:", err);
                }
            }
        }
        artist.avatar = "";
    }

    if (payload.removeCover === true) {
        const currentCoverUrl = artist.coverImage;
        if (currentCoverUrl) {
            const publicId = extractPublicIdFromUrl(currentCoverUrl);
            if (publicId) {
                try {
                    const result = await deleteImageByPublicId(publicId, true);
                    console.log("[DEBUG] Delete cover result:", result);
                } catch (err) {
                    console.error("[ERROR] Delete cover failed:", err);
                }
            }
        }
        artist.coverImage = "";
    }

    if (payload.socialLinks) {
        const current = artist.socialLinks?.toObject?.() ?? artist.socialLinks ?? {};
        const next = { ...current };

        for (const key of ["facebook", "instagram", "youtube"]) {
            if (payload.socialLinks[key] !== undefined) {
                next[key] = payload.socialLinks[key];
            }
        }

        artist.socialLinks = next;
        artist.markModified("socialLinks");
    }

    await artist.save();

    return getMyProfileByUserId(userId);
};

const updateMyProfileMediaByUserId = async (userId, { avatarFile, coverFile }) => {
    if (!avatarFile && !coverFile) {
        throw new AppError(
            "Provide at least one image field: avatar or coverImage.",
            StatusCodes.BAD_REQUEST
        );
    }

    const artist = await findOwnedArtistDocumentOrThrow(userId);

    if (avatarFile) {
        try {
            const uploaded = await uploadImageBuffer({
                buffer: avatarFile.buffer,
                folder: CLOUDINARY_ARTIST_FOLDER,
                publicId: `artist_${userId}_avatar_${Date.now()}`,
            });

            artist.avatar = uploaded.secure_url;
        } catch {
            throw new AppError(
                "Could not upload avatar image. Check storage configuration and try again.",
                StatusCodes.BAD_GATEWAY
            );
        }
    }

    if (coverFile) {
        try {
            const uploaded = await uploadImageBuffer({
                buffer: coverFile.buffer,
                folder: CLOUDINARY_ARTIST_FOLDER,
                publicId: `artist_${userId}_cover_${Date.now()}`,
            });

            artist.coverImage = uploaded.secure_url;
        } catch {
            throw new AppError(
                "Could not upload cover image. Check storage configuration and try again.",
                StatusCodes.BAD_GATEWAY
            );
        }
    }

    await artist.save();

    return getMyProfileByUserId(userId);
};

const requestVerificationByUserId = async (userId, payload = {}) => {
    const artist = await findOwnedArtistDocumentOrThrow(userId);

    const existing = await ArtistVerificationRequest.findOne({
        artistId: artist._id,
        status: "open",
    });

    if (existing) {
        throw new AppError(
            "A verification request is already being reviewed. Please wait for the team to respond.",
            StatusCodes.CONFLICT
        );
    }

    await ArtistVerificationRequest.create({
        artistId: artist._id,
        userId: artist.userId,
        note: typeof payload.note === "string" ? payload.note : "",
    });

    return getMyProfileByUserId(userId);
};

export default {
    getMyProfileByUserId,
    getMyBlockStatusByUserId,
    updateMyProfileByUserId,
    updateMyProfileMediaByUserId,
    requestVerificationByUserId,
};
