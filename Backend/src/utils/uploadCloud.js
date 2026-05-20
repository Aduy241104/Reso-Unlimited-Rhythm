import cloudinary from "../config/cloudinaryConfig.js";

export const uploadToCloudinary = (fileBuffer, folder = "my-uploads", resourceType = "auto") => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { 
                folder,
                resource_type: resourceType
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        stream.end(fileBuffer);
    });
};

const parseCloudinaryAssetFromUrl = (assetUrl) => {
    if (!assetUrl || typeof assetUrl !== "string") {
        return null;
    }

    let parsedUrl;
    try {
        parsedUrl = new URL(assetUrl);
    } catch {
        return null;
    }

    const segments = parsedUrl.pathname.split("/").filter(Boolean);
    const uploadIndex = segments.findIndex((segment) => segment === "upload");

    if (uploadIndex <= 0 || uploadIndex >= segments.length - 1) {
        return null;
    }

    const resourceType = segments[uploadIndex - 1] || "image";
    const tailSegments = segments.slice(uploadIndex + 1);
    const versionIndex = tailSegments.findIndex((segment) => /^v\d+$/.test(segment));
    const publicIdSegments = versionIndex >= 0
        ? tailSegments.slice(versionIndex + 1)
        : tailSegments;

    if (!publicIdSegments.length) {
        return null;
    }

    const publicIdWithExtension = publicIdSegments.join("/");
    const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, "");

    return {
        resourceType,
        publicId,
        publicIdWithExtension,
    };
};

const destroyByPublicId = async (publicId, resourceType) => {
    if (!publicId) {
        return null;
    }

    return cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
    });
};

export const deleteCloudinaryAssetByUrl = async (assetUrl) => {
    const parsedAsset = parseCloudinaryAssetFromUrl(assetUrl);

    if (!parsedAsset) {
        return null;
    }

    const { resourceType, publicId, publicIdWithExtension } = parsedAsset;

    const firstAttempt = await destroyByPublicId(publicId, resourceType);

    if (firstAttempt?.result !== "not found") {
        return firstAttempt;
    }

    if (!publicIdWithExtension || publicIdWithExtension === publicId) {
        return firstAttempt;
    }

    return destroyByPublicId(publicIdWithExtension, resourceType);
};

export const deleteCloudinaryAssetsByUrls = async (assetUrls = []) => {
    const normalizedUrls = [...new Set((assetUrls || []).filter(Boolean))];

    if (!normalizedUrls.length) {
        return [];
    }

    return Promise.allSettled(
        normalizedUrls.map((assetUrl) => deleteCloudinaryAssetByUrl(assetUrl))
    );
};