import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable, Transform } from "node:stream";
import { fileURLToPath } from "node:url";

const DEFAULT_TIMEOUT_MS = 45_000;
const DEFAULT_MAX_DOWNLOAD_BYTES = 250 * 1024 * 1024;
const SERVICE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const BUNDLED_FPCALC_PATH = path.join(
    path.resolve(SERVICE_DIRECTORY, "../../../tools/chromaprint"),
    process.platform === "win32" ? "fpcalc.exe" : "fpcalc"
);

const getTimeoutMs = () => Math.max(
    1_000,
    Number.parseInt(process.env.FINGERPRINT_PROCESS_TIMEOUT_MS, 10) || DEFAULT_TIMEOUT_MS
);

const getFpcalcPath = () =>
    String(process.env.FPCALC_PATH || "").trim() || BUNDLED_FPCALC_PATH;

const sanitizeEngineError = (error) => {
    const message = String(error?.message || error || "Fingerprint engine failed")
        .replace(/([A-Za-z]:)?[^\s]*reso-[^\s]*/gi, "<temporary-audio>")
        .slice(0, 500);
    return message || "Fingerprint engine failed";
};

const execFpcalc = (args) => new Promise((resolve, reject) => {
    execFile(
        getFpcalcPath(),
        args,
        {
            windowsHide: true,
            timeout: getTimeoutMs(),
            maxBuffer: 8 * 1024 * 1024,
        },
        (error, stdout, stderr) => {
            if (error) {
                reject(Object.assign(error, { stderr }));
                return;
            }

            resolve(String(stdout || ""));
        }
    );
});

export const getFingerprintEngineStatus = async () => {
    try {
        const output = await execFpcalc(["-version"]);
        return { enabled: process.env.FINGERPRINT_ENABLED !== "false", available: true, version: output.trim().slice(0, 120) };
    } catch (error) {
        return { enabled: process.env.FINGERPRINT_ENABLED !== "false", available: false, version: "", errorCode: error?.code || "engine_unavailable" };
    }
};

export const sanitizeFingerprintError = sanitizeEngineError;

export const hashAudioFile = async (audioPath) => {
    const hash = crypto.createHash("sha256");
    await pipeline(
        createReadStream(audioPath),
        new Transform({
            transform(chunk, encoding, callback) {
                hash.update(chunk);
                callback(null, chunk);
            },
        }),
        new Transform({ transform(_chunk, _encoding, callback) { callback(); } })
    );
    return hash.digest("hex");
};

export const hashAudioBuffer = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

export const generateAudioFingerprint = async (audioPath) => {
    if (!path.isAbsolute(audioPath)) {
        throw new Error("Audio path must be an absolute backend-controlled path.");
    }

    const stdout = await execFpcalc(["-raw", "-json", audioPath]);
    let parsed;
    try {
        parsed = JSON.parse(stdout.trim());
    } catch {
        throw new Error("fpcalc returned invalid JSON output.");
    }

    const duration = Number(parsed?.duration);
    const rawFingerprint = Array.isArray(parsed?.fingerprint)
        ? parsed.fingerprint.map((value) => Number(value) >>> 0).filter((value) => Number.isFinite(value))
        : [];

    if (!Number.isFinite(duration) || duration <= 0 || rawFingerprint.length === 0) {
        throw new Error("fpcalc output did not contain a valid duration and fingerprint.");
    }

    const fingerprintHash = crypto
        .createHash("sha256")
        .update(Buffer.from(new Uint32Array(rawFingerprint).buffer))
        .digest("hex");

    return {
        duration,
        rawFingerprint,
        fingerprintHash,
        algorithm: "chromaprint",
        algorithmVersion: "chromaprint-v1",
    };
};

const isAllowedAudioSourceUrl = (sourceUrl) => {
    let parsed;
    try {
        parsed = new URL(sourceUrl);
    } catch {
        return false;
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const configuredHosts = String(process.env.FINGERPRINT_ALLOWED_AUDIO_HOSTS || "res.cloudinary.com")
        .split(",")
        .map((host) => host.trim().toLowerCase())
        .filter(Boolean);
    return configuredHosts.includes(parsed.hostname.toLowerCase());
};

const downloadAudioToTempFile = async (sourceUrl) => {
    if (!isAllowedAudioSourceUrl(sourceUrl)) {
        throw Object.assign(new Error("Audio source host is not allowed."), { code: "source_not_allowed" });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getTimeoutMs());
    let directory = "";
    let retainedForCallback = false;
    try {
        directory = await fs.mkdtemp(path.join(os.tmpdir(), "reso-fingerprint-"));
        const audioPath = path.join(directory, "source-audio");
        const response = await fetch(sourceUrl, { signal: controller.signal, redirect: "manual" });
        if (!response.ok || response.status >= 300 || !response.body) {
            throw Object.assign(new Error("Audio source download failed."), { code: "download_failed" });
        }

        const contentLength = Number(response.headers.get("content-length") || 0);
        const maxBytes = Number.parseInt(process.env.FINGERPRINT_MAX_DOWNLOAD_BYTES, 10) || DEFAULT_MAX_DOWNLOAD_BYTES;
        if (contentLength > maxBytes) {
            throw Object.assign(new Error("Audio source is too large for fingerprinting."), { code: "source_too_large" });
        }

        let receivedBytes = 0;
        const hash = crypto.createHash("sha256");
        const boundedStream = new Transform({
            transform(chunk, encoding, callback) {
                receivedBytes += chunk.length;
                if (receivedBytes > maxBytes) {
                    callback(Object.assign(new Error("Audio source is too large for fingerprinting."), { code: "source_too_large" }));
                    return;
                }
                hash.update(chunk);
                callback(null, chunk);
            },
        });

        await pipeline(Readable.fromWeb(response.body), boundedStream, createWriteStream(audioPath));
        retainedForCallback = true;
        return { directory, audioPath, sourceAudioHash: hash.digest("hex") };
    } finally {
        clearTimeout(timeout);
        if (directory && !retainedForCallback) {
            await fs.rm(directory, { recursive: true, force: true }).catch(() => null);
        }
    }
};

export const withDownloadedAudio = async (sourceUrl, callback) => {
    const temp = await downloadAudioToTempFile(sourceUrl);
    try {
        return await callback(temp);
    } finally {
        await fs.rm(temp.directory, { recursive: true, force: true }).catch(() => null);
    }
};

export const fingerprintAudioSource = async ({ sourceUrl, audioPath, expectedSourceAudioHash = "" }) => {
    if (audioPath) {
        const sourceAudioHash = await hashAudioFile(audioPath);
        const generated = await generateAudioFingerprint(audioPath);
        return { ...generated, sourceAudioHash, sourceAudioFormat: path.extname(audioPath).slice(1).toLowerCase() };
    }

    return withDownloadedAudio(sourceUrl, async ({ audioPath: downloadedPath, sourceAudioHash }) => {
        if (expectedSourceAudioHash && expectedSourceAudioHash !== sourceAudioHash) {
            throw Object.assign(new Error("Downloaded audio hash does not match the upload hash."), { code: "source_hash_mismatch" });
        }
        const generated = await generateAudioFingerprint(downloadedPath);
        return { ...generated, sourceAudioHash, sourceAudioFormat: "" };
    });
};

export default {
    getFingerprintEngineStatus,
    hashAudioFile,
    hashAudioBuffer,
    generateAudioFingerprint,
    sanitizeFingerprintError,
    fingerprintAudioSource,
};
