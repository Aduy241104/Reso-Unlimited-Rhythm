import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { Readable, PassThrough } from "stream";
import { AppError } from "../utils/AppError.js";
import { StatusCodes } from "http-status-codes";

// Set ffmpeg path to use static binary
ffmpeg.setFfmpegPath(ffmpegStatic);

// Quality presets for different bitrates
const QUALITY_PRESETS = [
    { bitrate: "320k", label: "high", priority: 4 },
    { bitrate: "192k", label: "medium", priority: 3 },
    { bitrate: "128k", label: "low", priority: 2 },
    { bitrate: "96k", label: "lowest", priority: 1 },
];

/**
 * Transcode audio file to multiple quality versions
 * @param {Buffer} fileBuffer - The audio file buffer
 * @param {string} fileName - Original file name
 * @returns {Promise<Array>} - Array of transcoded audio buffers with metadata
 */
const transcodeAudioToMultipleQualities = async (fileBuffer, fileName) => {
    try {
        const transcodedVersions = [];

        // Add original file as highest priority
        transcodedVersions.push({
            buffer: fileBuffer,
            bitrate: 320, // Assume original is high quality
            format: "mp3",
            label: "original",
            priority: 5, // Highest priority
        });

        // Process each quality preset sequentially
        for (const preset of QUALITY_PRESETS) {
            try {
                const transcoded = await transcodeAudioToSpecificBitrate(
                    fileBuffer,
                    preset.bitrate
                );

                transcodedVersions.push({
                    buffer: transcoded,
                    bitrate: parseInt(preset.bitrate),
                    format: "mp3",
                    label: preset.label,
                    priority: preset.priority,
                });
            } catch (error) {
                console.error(
                    `Failed to transcode to ${preset.bitrate}:`,
                    error.message
                );
                // Continue with other qualities even if one fails
            }
        }

        if (transcodedVersions.length === 0) {
            throw new AppError(
                "Failed to transcode audio file to any quality",
                StatusCodes.INTERNAL_SERVER_ERROR
            );
        }

        return transcodedVersions;
    } catch (error) {
        console.error("Audio transcoding error:", error);
        throw new AppError(
            `Audio transcoding failed: ${error.message}`,
            StatusCodes.INTERNAL_SERVER_ERROR
        );
    }
};

/**
 * Get a single quality version of audio
 * @param {Buffer} fileBuffer - The audio file buffer
 * @param {string} bitrate - Target bitrate (e.g., "128k")
 * @returns {Promise<Buffer>} - Transcoded audio buffer
 */
const transcodeAudioToSpecificBitrate = async (fileBuffer, bitrate) => {
    try {
        return new Promise((resolve, reject) => {
            const inputStream = Readable.from([fileBuffer]);
            const outputStream = new PassThrough();
            let outputBuffer = Buffer.alloc(0);

            // Collect output data
            outputStream.on("data", (chunk) => {
                outputBuffer = Buffer.concat([outputBuffer, chunk]);
            });

            outputStream.on("end", () => {
                resolve(outputBuffer);
            });

            outputStream.on("error", (error) => {
                reject(error);
            });

            // Transcode
            ffmpeg(inputStream)
                .audioBitrate(bitrate)
                .audioCodec("libmp3lame")
                .audioChannels(2)
                .audioFrequency(44100)
                .format("mp3")
                .on("error", (error) => {
                    console.error("FFmpeg error:", error);
                    reject(
                        new AppError(
                            `FFmpeg error: ${error.message}`,
                            StatusCodes.INTERNAL_SERVER_ERROR
                        )
                    );
                })
                .pipe(outputStream, { end: true });
        });
    } catch (error) {
        console.error("Audio transcoding error:", error);
        throw new AppError(
            `Audio transcoding failed: ${error.message}`,
            StatusCodes.INTERNAL_SERVER_ERROR
        );
    }
};

export default {
    transcodeAudioToMultipleQualities,
    transcodeAudioToSpecificBitrate,
    QUALITY_PRESETS,
};
