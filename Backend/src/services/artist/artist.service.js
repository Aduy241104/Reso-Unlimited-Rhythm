import { StatusCodes } from "http-status-codes";
import Artist from "../../models/Artist.js";
import { AppError } from "../../utils/AppError.js";
import { uploadImageBuffer } from "../cloudinaryService.js";
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

const updateMyProfileByUserId = async (userId, payload) => {
    const artist = await findOwnedArtistDocumentOrThrow(userId);

    if (payload.name !== undefined) {
        artist.name = payload.name;
    }

    if (payload.bio !== undefined) {
        artist.bio = payload.bio;
    }

    if (payload.avatar !== undefined) {
        artist.avatar = payload.avatar;
    }

    if (payload.coverImage !== undefined) {
        artist.coverImage = payload.coverImage;
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

export default {
    getMyProfileByUserId,
    updateMyProfileByUserId,
    updateMyProfileMediaByUserId,
};
