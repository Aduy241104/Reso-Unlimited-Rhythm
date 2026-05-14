import { uploadToCloudinary } from "../utils/uploadCloud.js";
import { AppError } from "../utils/AppError.js";
import { StatusCodes } from "http-status-codes";
import audioTranscodeService from "../services/audioTranscode.service.js";

const uploadFiles = async (req, res, next) => {
  try {
    const uploadedUrls = {
      audioFiles: [],
      avatar: "",
      coverImages: [],
    };

    // Upload audio files with quality transcoding
    if (req.files?.audioFiles && req.files.audioFiles.length > 0) {
      const audioUploadPromises = req.files.audioFiles.map(async (file) => {
        try {
          // Transcode audio to multiple qualities
          const transcodedVersions =
            await audioTranscodeService.transcodeAudioToMultipleQualities(
              file.buffer,
              file.originalname
            );

          // Upload each transcoded version to Cloudinary
          const uploadPromises = transcodedVersions.map((version) =>
            uploadToCloudinary(
              version.buffer,
              `tracks/audio/${version.label}`,
              "video"
            ).then((result) => ({
              url: result.secure_url,
              format: "mp3",
              bitrate: version.bitrate,
              label: version.label,
              priority: version.priority,
            }))
          );

          const uploadedVersions = await Promise.all(uploadPromises);
          return uploadedVersions;
        } catch (error) {
          console.error(
            `Failed to process audio file ${file.originalname}:`,
            error.message
          );
          // Fallback: upload original file without transcoding
          console.log("Falling back to original file upload...");
          const result = await uploadToCloudinary(
            file.buffer,
            "tracks/audio/original",
            "video"
          );
          return [
            {
              url: result.secure_url,
              format: result.format || "unknown",
              bitrate: result.bit_rate || 128,
              label: "original",
              priority: 0,
            },
          ];
        }
      });

      const allAudioResults = await Promise.all(audioUploadPromises);
      uploadedUrls.audioFiles = allAudioResults.flat();
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
