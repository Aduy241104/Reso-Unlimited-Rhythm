import { StatusCodes } from "http-status-codes";
import Artist from "../../models/Artist.js";
import User from "../../models/User.js";
import { AppError } from "../../utils/AppError.js";
import { uploadImageBuffer } from "../cloudinaryService.js";

const cloudinaryFolder = "reso/artist-profile";

const serializeArtist = (doc) => {
    if (!doc) {
        return null;
    }

    const o = doc.toObject ? doc.toObject({ flattenMaps: true }) : doc;

    return {
        id: o._id?.toString(),
        userId: o.userId?.toString(),
        name: o.name,
        bio: o.bio ?? "",
        avatar: o.avatar ?? "",
        coverImage: o.coverImage ?? "",
        socialLinks: {
            facebook: o.socialLinks?.facebook ?? "",
            instagram: o.socialLinks?.instagram ?? "",
            youtube: o.socialLinks?.youtube ?? "",
        },
        verificationStatus: o.verificationStatus,
        stats: {
            followers: o.stats?.followers ?? 0,
            totalStreams: o.stats?.totalStreams ?? 0,
        },
        activeStatus: o.activeStatus,
        blockedReason: o.blockedReason ?? "",
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
    };
};

const serializeAccount = (userDoc) => {
    if (!userDoc) {
        return null;
    }

    const u = userDoc.toObject ? userDoc.toObject() : userDoc;

    return {
        id: u._id?.toString(),
        email: u.email,
        avatar: u.avatar ?? "",
        profile: u.profile ?? {},
    };
};

const getArtistDocumentForUser = async (userId) => {
    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError("Artist profile was not found for this account.", StatusCodes.NOT_FOUND);
    }

    return artist;
};

const getProfileBundle = async (userId) => {
    const [artist, user] = await Promise.all([
        getArtistDocumentForUser(userId),
        User.findById(userId),
    ]);

    if (!user) {
        throw new AppError("User account was not found.", StatusCodes.NOT_FOUND);
    }

    return {
        artist: serializeArtist(artist),
        account: serializeAccount(user),
    };
};

const updateProfileFields = async (userId, payload) => {
    const artist = await getArtistDocumentForUser(userId);

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
        artist.socialLinks = {
            ...artist.socialLinks,
            ...payload.socialLinks,
        };
    }

    await artist.save();

    if (payload.avatar !== undefined) {
        await User.findByIdAndUpdate(userId, { avatar: payload.avatar });
    }

    return getProfileBundle(userId);
};

const uploadArtistImage = async (userId, buffer, field) => {
    if (!buffer?.length) {
        throw new AppError("Image file is required.", StatusCodes.BAD_REQUEST);
    }

    const artist = await getArtistDocumentForUser(userId);
    const upload = await uploadImageBuffer({
        buffer,
        folder: `${cloudinaryFolder}/${field}`,
    });

    const url = upload?.secure_url || upload?.url;

    if (!url) {
        throw new AppError("Upload failed.", StatusCodes.BAD_GATEWAY);
    }

    if (field === "avatar") {
        artist.avatar = url;
        await artist.save();
        await User.findByIdAndUpdate(userId, { avatar: url });
    } else {
        artist.coverImage = url;
        await artist.save();
    }

    return getProfileBundle(userId);
};

const requestVerification = async (userId) => {
    const artist = await getArtistDocumentForUser(userId);

    if (artist.verificationStatus === "verified") {
        throw new AppError("Your artist profile is already verified.", StatusCodes.BAD_REQUEST);
    }

    let message = "Your verification request is being reviewed.";

    if (artist.verificationStatus === "rejected") {
        artist.verificationStatus = "pending";
        await artist.save();
        message = "Your verification request has been resubmitted and is pending review.";
    }

    return {
        artist: serializeArtist(artist),
        message,
    };
};

export default {
    getProfileBundle,
    updateProfileFields,
    uploadArtistImage,
    requestVerification,
    serializeArtist,
};
