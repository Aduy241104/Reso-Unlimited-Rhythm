import cloudinary from "../config/cloudinaryConfig.js"

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