import cloudinary from "../config/cloudinaryConfig.js";

export const uploadToCloudinary = (
    fileBuffer,
    folder = "my-uploads",
    resourceType = "auto",
    { publicId = "" } = {}
) => {
    return new Promise((resolve, reject) => {
        const cloudinaryPublicId = publicId ? `${folder}/${publicId}` : "";
        const uploadOptions = {
            folder,
            resource_type: resourceType,
            ...(publicId ? { public_id: publicId, overwrite: false } : {}),
        };
        const stream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (!error) {
                    resolve(result);
                    return;
                }

                // A retry with the same content-addressed public ID is an
                // idempotent reuse, not a resource collision. A different
                // content hash gets a different ID and still fails normally.
                if (!publicId || !cloudinary.api?.resource) {
                    reject(error);
                    return;
                }

                const errorText = String(error?.message || error || "").toLowerCase();
                const isAlreadyExists = error?.http_code === 409 ||
                    error?.code === "already_exists" ||
                    errorText.includes("already exists") ||
                    errorText.includes("already_exists");
                if (!isAlreadyExists) {
                    reject(error);
                    return;
                }

                cloudinary.api.resource(cloudinaryPublicId, { resource_type: resourceType })
                    .then((existing) => resolve({ ...existing, idempotentReuse: true }))
                    .catch(() => reject(error));
            }
        );
        stream.end(fileBuffer);
    });
};


/**
 * Extract public_id from a Cloudinary URL.
 * Works for URLs in format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
 */
export const extractPublicIdFromUrl = (url) => {
    if (!url || typeof url !== "string") {
        return null;
    }

    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(\.[a-z]+)?$/i);
    return match ? match[1] : null;
}
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
