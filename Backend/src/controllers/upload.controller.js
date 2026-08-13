import crypto from "node:crypto";
import { deleteCloudinaryAssetsByUrls, uploadToCloudinary } from "../utils/uploadCloud.js";
import { AppError } from "../utils/AppError.js";
import { StatusCodes } from "http-status-codes";
import audioTranscodeService from "../services/audioTranscode.service.js";
import { hashAudioBuffer } from "../services/fingerprint/audioFingerprint.service.js";

const uploadFiles = async (req, res, next) => {
  const uploadedAssetUrls = [];
  try {
    const requestedOperationId = String(req.get("x-upload-operation-id") || "")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 80);
    const operationId = requestedOperationId || crypto.randomUUID();
    const hashBuffer = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");
    const buildPublicId = (contentHash, label, index = 0) =>
      `${operationId}/${contentHash.slice(0, 24)}-${label}-${index}`;
    const rememberUpload = (result) => {
      if (result?.secure_url && !result.idempotentReuse) uploadedAssetUrls.push(result.secure_url);
      return result;
    };

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
        const sourceAudioHash = hashAudioBuffer(file.buffer);
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
          const uploadPromises = transcodedVersions.map((version, index) =>
            uploadToCloudinary(
              version.buffer,
              `tracks/audio/${version.label}`,
              "video",
              { publicId: buildPublicId(sourceAudioHash, version.label, index) }
            ).then((result) => {
              rememberUpload(result);
              return {
                url: result.secure_url,
                format: version.format || "mp3",
                bitrate: version.bitrate,
                label: version.label,
                priority: version.priority,
              };
            })
          );

          const uploadedVersions = await Promise.all(uploadPromises);
          return {
            uploadedVersions,
            sourceAnalysis,
            sourceAudioHash: hashAudioBuffer(file.buffer),
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
          const result = rememberUpload(await uploadToCloudinary(
            file.buffer,
            "tracks/audio/original",
            "video",
            { publicId: buildPublicId(sourceAudioHash, "original", 0) }
          ));
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
            sourceAudioHash: hashAudioBuffer(file.buffer),
          };
        }
      });

      const allAudioResults = await Promise.all(audioUploadPromises);
      uploadedUrls.audioFiles = allAudioResults.flatMap(
        (item) => item.uploadedVersions || []
      );
      uploadedUrls.audioAnalysis = allAudioResults[0]?.sourceAnalysis
        ? {
            ...allAudioResults[0].sourceAnalysis,
            sourceAudioHash: allAudioResults[0].sourceAudioHash || "",
          }
        : null;
    }

    // Upload avatar
    if (req.files?.avatar && req.files.avatar.length > 0) {
      const avatarResult = rememberUpload(await uploadToCloudinary(
        req.files.avatar[0].buffer,
        "tracks/avatar",
        "image",
        { publicId: buildPublicId(hashBuffer(req.files.avatar[0].buffer), "avatar", 0) }
      ));
      uploadedUrls.avatar = avatarResult.secure_url;
    }

    // Upload cover images
    if (req.files?.coverImages && req.files.coverImages.length > 0) {
      const coverUploadPromises = req.files.coverImages.map((file, index) =>
        uploadToCloudinary(file.buffer, "tracks/cover", "image", {
          publicId: buildPublicId(hashBuffer(file.buffer), "cover", index),
        }).then(rememberUpload)
      );

      const coverResults = await Promise.all(coverUploadPromises);
      uploadedUrls.coverImages = coverResults.map(
        (result) => result.secure_url
      );
    }

    // Upload timed lyrics (.lrc) as raw file
    if (req.files?.lyricsSync && req.files.lyricsSync.length > 0) {
      const lyricsFile = req.files.lyricsSync[0];
      const lyricsResult = rememberUpload(await uploadToCloudinary(
        lyricsFile.buffer,
        "tracks/lyrics/sync",
        "raw",
        { publicId: buildPublicId(hashBuffer(lyricsFile.buffer), "lyrics", 0) }
      ));
      uploadedUrls.lyricsSyncUrl = lyricsResult.secure_url;
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Files uploaded successfully",
      data: uploadedUrls,
    });
  } catch (error) {
    await deleteCloudinaryAssetsByUrls(uploadedAssetUrls).catch((cleanupError) => {
      console.error("Upload rollback failed:", cleanupError.message);
    });
    next(
      new AppError(
        `File upload failed: ${error.message}`,
        StatusCodes.BAD_REQUEST
      )
    );
  }
};

export default uploadFiles;
