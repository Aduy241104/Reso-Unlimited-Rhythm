import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import ArtistRequest from "../../models/ArtistRequest.js";
import Artist from "../../models/Artist.js";
import { AppError } from "../../utils/AppError.js";
import { uploadImageBuffer } from "../cloudinaryService.js";

const normalizeString = (value) => {
    if (typeof value !== "string") {
        return "";
    }

    return value.trim();
};

const normalizeStringArray = (value) => {
    if (Array.isArray(value)) {
        return value
            .map((item) => normalizeString(item))
            .filter(Boolean);
    }

    const normalizedSingleValue = normalizeString(value);
    return normalizedSingleValue ? [normalizedSingleValue] : [];
};

const buildDefaultChecklist = () => ({
    profileComplete: false,
    identityVerified: false,
    hasMusicActivity: false,
    socialLinksValid: false,
    noImpersonation: false,
    acceptedCopyrightPolicy: false,
});

const CLOUDINARY_ARTIST_REQUESTS_FOLDER = "reso/artist-requests";

const ensureEligibleUser = async (userId) => {
    const [existingArtist, pendingRequest] = await Promise.all([
        Artist.findOne({ userId }).select("_id").lean(),
        ArtistRequest.findOne({ userId, status: "pending" }).select("_id").lean(),
    ]);

    if (existingArtist) {
        throw new AppError("This account is already an artist.", 409, {
            field: "role",
        });
    }

    if (pendingRequest) {
        throw new AppError(
            "You already have a pending artist registration request.",
            409,
            { field: "status" }
        );
    }
};

const validateRequiredFields = (payload = {}) => {
    const stageName = normalizeString(payload.stageName);
    const fullName = normalizeString(payload.fullName);
    const idNumber = normalizeString(payload.idNumber);
    const dateOfBirth = normalizeString(payload.dateOfBirth);
    const acceptedTerms =
        payload.acceptedTerms === true || payload.acceptedTerms === "true";
    const copyrightCommitment =
        payload.copyrightCommitment === true || payload.copyrightCommitment === "true";
    const truthfulInformationCommitment =
        payload.truthfulInformationCommitment === true ||
        payload.truthfulInformationCommitment === "true";

    const fieldErrors = [];

    if (!stageName) {
        fieldErrors.push({
            field: "stageName",
            message: "Stage name is required.",
        });
    }

    if (!fullName) {
        fieldErrors.push({
            field: "fullName",
            message: "Full name is required.",
        });
    }

    if (!idNumber) {
        fieldErrors.push({
            field: "idNumber",
            message: "Identity number is required.",
        });
    }

    if (!dateOfBirth) {
        fieldErrors.push({
            field: "dateOfBirth",
            message: "Date of birth is required.",
        });
    }

    if (!acceptedTerms) {
        fieldErrors.push({
            field: "acceptedTerms",
            message: "You must accept the artist terms.",
        });
    }

    if (!copyrightCommitment) {
        fieldErrors.push({
            field: "copyrightCommitment",
            message: "You must confirm copyright responsibility.",
        });
    }

    if (!truthfulInformationCommitment) {
        fieldErrors.push({
            field: "truthfulInformationCommitment",
            message: "You must confirm the information is truthful.",
        });
    }

    if (fieldErrors.length > 0) {
        throw new AppError("Invalid artist registration request data.", 400, fieldErrors);
    }

    return {
        stageName,
        fullName,
        idNumber,
        dateOfBirth,
        acceptedTerms,
        copyrightCommitment,
        truthfulInformationCommitment,
    };
};

const uploadArtistRequestImage = async (userId, file, label) => {
    if (!file) {
        return "";
    }

    try {
        const uploaded = await uploadImageBuffer({
            buffer: file.buffer,
            folder: CLOUDINARY_ARTIST_REQUESTS_FOLDER,
            publicId: `artist_request_${userId}_${label}_${Date.now()}`,
        });

        return uploaded.secure_url ?? "";
    } catch {
        throw new AppError(
            `Could not upload ${label} image. Check storage configuration and try again.`,
            StatusCodes.BAD_GATEWAY,
            { field: label }
        );
    }
};

const createArtistRegistrationRequestByUserId = async (userId, payload = {}, files = {}) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new AppError("User id is invalid.", 400, {
            field: "userId",
        });
    }

    await ensureEligibleUser(userId);

    const validated = validateRequiredFields(payload);
    const avatarUrl = await uploadArtistRequestImage(userId, files.avatar?.[0], "avatar");
    const frontImageUrl = await uploadArtistRequestImage(
        userId,
        files.frontImage?.[0],
        "frontImage"
    );
    const backImageUrl = await uploadArtistRequestImage(
        userId,
        files.backImage?.[0],
        "backImage"
    );
    const now = new Date();

    const artistRequest = await ArtistRequest.create({
        userId,
        stageName: validated.stageName,
        bio: normalizeString(payload.bio),
        avatar: avatarUrl || normalizeString(payload.avatar),
        genres: normalizeStringArray(payload.genres),
        socialLinks: {
            spotify: normalizeString(payload.socialLinks?.spotify),
            youtube: normalizeString(payload.socialLinks?.youtube),
            tiktok: normalizeString(payload.socialLinks?.tiktok),
            facebook: normalizeString(payload.socialLinks?.facebook),
            instagram: normalizeString(payload.socialLinks?.instagram),
            soundcloud: normalizeString(payload.socialLinks?.soundcloud),
            website: normalizeString(payload.socialLinks?.website),
            other: normalizeString(payload.socialLinks?.other),
        },
        identityInfo: {
            idNumber: validated.idNumber,
            fullName: validated.fullName,
            dateOfBirth: validated.dateOfBirth ? new Date(validated.dateOfBirth) : undefined,
            frontImage: frontImageUrl || normalizeString(payload.frontImage),
            backImage: backImageUrl || normalizeString(payload.backImage),
        },
        portfolio: {
            demoTrackUrls: normalizeStringArray(payload.demoTrackUrls),
            musicLinks: normalizeStringArray(payload.musicLinks),
            description: normalizeString(payload.portfolioDescription),
        },
        artistDeclaration: {
            acceptedTerms: validated.acceptedTerms,
            copyrightCommitment: validated.copyrightCommitment,
            truthfulInformationCommitment: validated.truthfulInformationCommitment,
            acceptedAt: now,
        },
        review: {
            adminNote: "",
            checklist: buildDefaultChecklist(),
        },
        status: "pending",
    });

    return artistRequest.toObject();
};

export default {
    createArtistRegistrationRequestByUserId,
};
