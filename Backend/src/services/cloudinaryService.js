import cloudinary from "../config/cloudinaryConfig.js";

/**
 * Upload buffer -> Cloudinary
 * @param {Buffer} buffer
 * @param {{folder?: string, publicId?: string}} options
 */
export const uploadImageBuffer = ({ buffer, folder = "unitrade", publicId }) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                public_id: publicId,
                resource_type: "image",
                overwrite: true,
            },
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );

        stream.end(buffer);
    });
};

export const deleteImageByPublicId = async (publicId) => {
    // returns { result: 'ok' | 'not found' | ... }
    return cloudinary.uploader.destroy(publicId, { resource_type: "image" });
};
