import { uploadToCloudinary } from "../utils/uploadCloud.js";
import { AppError } from "../utils/AppError.js";
import { StatusCodes } from "http-status-codes";
import audioTranscodeService from "../services/audioTranscode.service.js";

const uploadFiles = async (req, res, next) => {
  try {
    const uploadedUrls = {
      audioFiles: [],
      audioAnalysis: null,
      avatar: "",
      coverImages: [],
      lyricsSyncUrl: "",
    };

    // Upload audio files with quality transcoding
    if (req.files?.audioFiles && req.files.audioFiles.length > 0) {
      const audioUploadPromises = req.files.audioFiles.map(async (file) => {
        try {
          const sourceAnalysis =
            await audioTranscodeService.analyzeAndValidateAudioSource(
              file.buffer,
              file.originalname
            );

          // Transcode audio to multiple qualities
          const transcodedVersions =
            await audioTranscodeService.transcodeAudioToMultipleQualities(
              file.buffer,
              file.originalname,
              sourceAnalysis
            );

          // Upload each transcoded version to Cloudinary
          const uploadPromises = transcodedVersions.map((version) =>
            uploadToCloudinary(
              version.buffer,
              `tracks/audio/${version.label}`,
              "video"
            ).then((result) => ({
              url: result.secure_url,
              format: version.format || "mp3",
              bitrate: version.bitrate,
              label: version.label,
              priority: version.priority,
            }))
          );

          const uploadedVersions = await Promise.all(uploadPromises);
          return {
            uploadedVersions,
            sourceAnalysis,
          };
        } catch (error) {
          console.error(
            `Failed to process audio file ${file.originalname}:`,
            error.message
          );

          if (error instanceof AppError) {
            throw error;
          }

          console.log("Falling back to original file upload...");
          const sourceAnalysis =
            await audioTranscodeService.analyzeAndValidateAudioSource(
              file.buffer,
              file.originalname
            );
          const result = await uploadToCloudinary(
            file.buffer,
            "tracks/audio/original",
            "video"
          );
          return {
            uploadedVersions: [
              {
                url: result.secure_url,
                format: sourceAnalysis.format || result.format || "unknown",
                bitrate: sourceAnalysis.bitrate || result.bit_rate || 320,
                label: "original",
                priority: 5,
              },
            ],
            sourceAnalysis,
          };
        }
      });

      const allAudioResults = await Promise.all(audioUploadPromises);
      uploadedUrls.audioFiles = allAudioResults.flatMap(
        (item) => item.uploadedVersions || []
      );
      uploadedUrls.audioAnalysis = allAudioResults[0]?.sourceAnalysis || null;
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

    // Upload timed lyrics (.lrc) as raw file
    if (req.files?.lyricsSync && req.files.lyricsSync.length > 0) {
      const lyricsFile = req.files.lyricsSync[0];
      const lyricsResult = await uploadToCloudinary(
        lyricsFile.buffer,
        "tracks/lyrics/sync",
        "raw"
      );
      uploadedUrls.lyricsSyncUrl = lyricsResult.secure_url;
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
