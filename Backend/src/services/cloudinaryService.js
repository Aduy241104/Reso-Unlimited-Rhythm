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

export const deleteImageByPublicId = async (publicId, invalidate = false) => {
    // returns { result: 'ok' | 'not found' | ... }
    const options = { resource_type: "image" };

    if (invalidate) {
        options.invalidate = true;
    }

    console.log("[DEBUG] Cloudinary destroy called with publicId:", publicId, "options:", options);
    const result = await cloudinary.uploader.destroy(publicId, options);
    console.log("[DEBUG] Cloudinary destroy result:", result);
    return result;
};

export const uploadEvidenceBuffer = ({ buffer, folder = "reso/copyright-evidence", publicId }) =>
    new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                public_id: publicId,
                resource_type: "auto",
                // Ownership evidence may contain IDs/contracts; never expose it as a public asset.
                type: "authenticated",
            },
            (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(result);
            }
        );

        stream.end(buffer);
    });
