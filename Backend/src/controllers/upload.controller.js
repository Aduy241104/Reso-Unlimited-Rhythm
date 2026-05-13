import { uploadToCloudinary } from "../utils/uploadCloud.js";
import { AppError } from "../utils/AppError.js";
import { StatusCodes } from "http-status-codes";

const uploadFiles = async (req, res, next) => {
  try {
    const uploadedUrls = {
      audioFiles: [],
      avatar: "",
      coverImages: [],
    };

    // Upload audio files
    if (req.files?.audioFiles && req.files.audioFiles.length > 0) {
      const audioUploadPromises = req.files.audioFiles.map((file) =>
        uploadToCloudinary(file.buffer, "tracks/audio", "video")
      );

      const audioResults = await Promise.all(audioUploadPromises);
      uploadedUrls.audioFiles = audioResults.map((result) => result.secure_url);
    }

    // Upload avatar
    if (req.files?.avatar && req.files.avatar.length > 0) {
      const avatarResult = await uploadToCloudinary(
        req.files.avatar[0].buffer,
        "tracks/avatar",
        "image"
      );
      uploadedUrls.avatar = avatarResult.secure_url;
    }

    // Upload cover images
    if (req.files?.coverImages && req.files.coverImages.length > 0) {
      const coverUploadPromises = req.files.coverImages.map((file) =>
        uploadToCloudinary(file.buffer, "tracks/cover", "image")
      );

      const coverResults = await Promise.all(coverUploadPromises);
      uploadedUrls.coverImages = coverResults.map(
        (result) => result.secure_url
      );
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Files uploaded successfully",
      data: uploadedUrls,
    });
  } catch (error) {
    next(
      new AppError(
        `File upload failed: ${error.message}`,
        StatusCodes.BAD_REQUEST
      )
    );
  }
};

export default uploadFiles;
