import cloudinary from "../config/cloudinaryConfig.js";

export const uploadToCloudinary = (fileBuffer, folder = "my-uploads") => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
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
};