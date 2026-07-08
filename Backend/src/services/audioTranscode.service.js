import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
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

const SUPPORTED_SOURCE_AUDIO_FORMATS = new Set(["mp3", "wav", "flac", "aac", "m4a"]);
const LOSSLESS_AUDIO_FORMATS = new Set(["wav", "flac"]);
const MIN_SOURCE_SAMPLE_RATE = 44100;
const MIN_LOSSY_SOURCE_BITRATE = 256;

const parseDurationToSeconds = (durationText) => {
    if (!durationText || typeof durationText !== "string") {
        return null;
    }

    const match = durationText.trim().match(/^(\d+):(\d+):(\d+(?:\.\d+)?)$/);

    if (!match) {
        return null;
    }

    const [, hours, minutes, seconds] = match;

    return (
        Number(hours) * 3600 +
        Number(minutes) * 60 +
        Number(seconds)
    );
};

const mapChannelLayoutToCount = (channelLayout = "") => {
    const normalizedLayout = String(channelLayout || "").trim().toLowerCase();

    if (!normalizedLayout) {
        return null;
    }

    if (normalizedLayout.includes("mono")) {
        return 1;
    }

    if (normalizedLayout.includes("stereo")) {
        return 2;
    }

    const numericMatch = normalizedLayout.match(/^(\d+)(?:\.(\d+))?/);

    if (!numericMatch) {
        return null;
    }

    const majorChannels = Number(numericMatch[1] || 0);
    const minorChannels = Number(numericMatch[2] || 0);

    return majorChannels + minorChannels;
};

const normalizeSourceFormat = ({ fileName = "", codec = "", containerFormat = "" } = {}) => {
    const extension = path.extname(String(fileName || ""))
        .slice(1)
        .trim()
        .toLowerCase();

    if (SUPPORTED_SOURCE_AUDIO_FORMATS.has(extension)) {
        return extension;
    }

    if (extension === "mp4") {
        return "m4a";
    }

    const normalizedCodec = String(codec || "").trim().toLowerCase();
    const normalizedContainer = String(containerFormat || "").trim().toLowerCase();

    if (normalizedCodec.includes("mp3") || normalizedContainer.includes("mp3")) {
        return "mp3";
    }

    if (normalizedCodec.includes("flac") || normalizedContainer.includes("flac")) {
        return "flac";
    }

    if (
        normalizedCodec.includes("pcm") ||
        normalizedCodec.includes("wav") ||
        normalizedContainer.includes("wav")
    ) {
        return "wav";
    }

    if (normalizedCodec.includes("aac")) {
        return extension === "m4a" ? "m4a" : "aac";
    }

    if (normalizedContainer.includes("m4a") || normalizedContainer.includes("mp4")) {
        return "m4a";
    }

    return "";
};

const parseAudioProbeOutput = (probeOutput, fileName = "") => {
    const audioLine = String(probeOutput || "")
        .split(/\r?\n/)
        .find((line) => line.includes("Audio:"));

    if (!audioLine) {
        throw new AppError(
            "Unable to read audio stream information from the uploaded file.",
            StatusCodes.BAD_REQUEST,
            { field: "audioFiles" }
        );
    }

    const inputMatch = probeOutput.match(/Input #0,\s*([^,\r\n]+(?:,[^,\r\n]+)*)\s*,\s*from/i);
    const durationMatch = probeOutput.match(/Duration:\s*(\d+:\d+:\d+(?:\.\d+)?)/i);
    const codecMatch = audioLine.match(/Audio:\s*([^,\r\n]+)/i);
    const sampleRateMatch = audioLine.match(/(\d+)\s*Hz/i);
    const channelLayoutMatch = audioLine.match(
        /\b(mono|stereo|\d+\.\d+(?:\(side\))?|\d+\.\d+|\d+\s*channels?)\b/i
    );
    const audioLineBitrateMatch = audioLine.match(/(\d+(?:\.\d+)?)\s*kb\/s/i);
    const overallBitrateMatch = probeOutput.match(/bitrate:\s*(\d+(?:\.\d+)?)\s*kb\/s/i);

    const codec = String(codecMatch?.[1] || "").trim().toLowerCase();
    const containerFormat = String(inputMatch?.[1] || "").trim().toLowerCase();
    const channelLayout = String(channelLayoutMatch?.[1] || "").trim().toLowerCase();
    const sampleRate = sampleRateMatch ? Number(sampleRateMatch[1]) : null;
    const bitrate = Number(
        audioLineBitrateMatch?.[1] || overallBitrateMatch?.[1] || 0
    );
    const format = normalizeSourceFormat({
        fileName,
        codec,
        containerFormat,
    });
    const isLossless =
        LOSSLESS_AUDIO_FORMATS.has(format) ||
        codec.startsWith("pcm") ||
        codec.includes("flac") ||
        codec.includes("alac");

    return {
        format,
        codec,
        containerFormat,
        bitrate: Number.isFinite(bitrate) && bitrate > 0 ? Math.round(bitrate) : null,
        sampleRate: Number.isFinite(sampleRate) && sampleRate > 0 ? sampleRate : null,
        channelLayout,
        channels: mapChannelLayoutToCount(channelLayout),
        duration: parseDurationToSeconds(durationMatch?.[1] || ""),
        isLossless,
    };
};

const probeAudioSource = async (fileBuffer, fileName = "upload-audio") => {
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "reso-audio-"));
    const safeExtension = path.extname(String(fileName || "")).trim() || ".bin";
    const tempFilePath = path.join(tempDirectory, `source${safeExtension}`);

    try {
        await fs.writeFile(tempFilePath, fileBuffer);

        const probeOutput = await new Promise((resolve, reject) => {
            const process = spawn(
                ffmpegStatic,
                ["-hide_banner", "-i", tempFilePath, "-f", "null", "-"],
                {
                    windowsHide: true,
                }
            );

            let stderr = "";

            process.stderr.on("data", (chunk) => {
                stderr += chunk.toString();
            });

            process.on("error", (error) => {
                reject(error);
            });

            process.on("close", (code) => {
                if (code !== 0 && !stderr.includes("Output")) {
                    reject(
                        new AppError(
                            "Unable to inspect the uploaded audio file.",
                            StatusCodes.BAD_REQUEST,
                            { field: "audioFiles" }
                        )
                    );
                    return;
                }

                resolve(stderr);
            });
        });

        return parseAudioProbeOutput(String(probeOutput || ""), fileName);
    } finally {
        await fs.rm(tempDirectory, { recursive: true, force: true }).catch(() => null);
    }
};

const validateSourceAudioProfile = (audioProfile = {}) => {
    if (!SUPPORTED_SOURCE_AUDIO_FORMATS.has(audioProfile.format)) {
        throw new AppError(
            "Only MP3, WAV, FLAC, AAC, or M4A source files are accepted for track uploads.",
            StatusCodes.BAD_REQUEST,
            { field: "audioFiles" }
        );
    }

    if (
        Number.isFinite(audioProfile.sampleRate) &&
        audioProfile.sampleRate < MIN_SOURCE_SAMPLE_RATE
    ) {
        throw new AppError(
            "Source audio must use a sample rate of at least 44.1 kHz.",
            StatusCodes.BAD_REQUEST,
            { field: "audioFiles" }
        );
    }

    if (
        !audioProfile.isLossless &&
        (!Number.isFinite(audioProfile.bitrate) ||
            audioProfile.bitrate < MIN_LOSSY_SOURCE_BITRATE)
    ) {
        throw new AppError(
            "Lossy source audio must be at least 256 kbps. Upload WAV/FLAC or a high-bitrate master file.",
            StatusCodes.BAD_REQUEST,
            { field: "audioFiles" }
        );
    }

    return {
        ...audioProfile,
        meetsIngestRequirements: true,
    };
};

const resolveOriginalAudioBitrate = (audioProfile = {}) => {
    if (Number.isFinite(audioProfile.bitrate) && audioProfile.bitrate > 0) {
        return Math.round(audioProfile.bitrate);
    }

    if (
        audioProfile.isLossless &&
        Number.isFinite(audioProfile.sampleRate) &&
        Number.isFinite(audioProfile.channels)
    ) {
        return Math.round((audioProfile.sampleRate * 16 * audioProfile.channels) / 1000);
    }

    return 320;
};

const buildTranscodePlan = (audioProfile = {}) => {
    const sourceBitrate = Number(audioProfile.bitrate || 0);

    return QUALITY_PRESETS.filter((preset) => {
        const presetBitrate = Number.parseInt(preset.bitrate, 10);

        if (audioProfile.isLossless) {
            return true;
        }

        if (!Number.isFinite(sourceBitrate) || sourceBitrate <= 0) {
            return presetBitrate < 320;
        }

        return presetBitrate < sourceBitrate;
    });
};

const analyzeAndValidateAudioSource = async (fileBuffer, fileName) => {
    const audioProfile = await probeAudioSource(fileBuffer, fileName);
    const validatedProfile = validateSourceAudioProfile(audioProfile);
    const transcodeTargets = buildTranscodePlan(validatedProfile).map((preset) => ({
        label: preset.label,
        bitrate: Number.parseInt(preset.bitrate, 10),
        priority: preset.priority,
    }));

    return {
        ...validatedProfile,
        bitrate: resolveOriginalAudioBitrate(validatedProfile),
        transcodeTargets,
    };
};

export {
    analyzeAndValidateAudioSource,
    buildTranscodePlan,
    normalizeSourceFormat,
    parseAudioProbeOutput,
    validateSourceAudioProfile,
};

/**
 * Transcode audio file to multiple quality versions
 * @param {Buffer} fileBuffer - The audio file buffer
 * @param {string} fileName - Original file name
 * @param {object} sourceAudioProfile - The already validated source audio profile
 * @returns {Promise<Array>} - Array of transcoded audio buffers with metadata
 */
const transcodeAudioToMultipleQualities = async (
    fileBuffer,
    fileName,
    sourceAudioProfile = null
) => {
    try {
        const transcodedVersions = [];
        const audioProfile =
            sourceAudioProfile ||
            (await analyzeAndValidateAudioSource(fileBuffer, fileName));

        transcodedVersions.push({
            buffer: fileBuffer,
            bitrate: resolveOriginalAudioBitrate(audioProfile),
            format: audioProfile.format || "mp3",
            label: "original",
            priority: 5,
        });

        for (const preset of buildTranscodePlan(audioProfile)) {
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
    analyzeAndValidateAudioSource,
    buildTranscodePlan,
    normalizeSourceFormat,
    parseAudioProbeOutput,
    transcodeAudioToMultipleQualities,
    transcodeAudioToSpecificBitrate,
    validateSourceAudioProfile,
    QUALITY_PRESETS,
};
