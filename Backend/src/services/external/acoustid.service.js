import AudioFingerprint from "../../models/AudioFingerprint.js";
import Artist from "../../models/Artist.js";
import CopyrightRegistry from "../../models/CopyrightRegistry.js";
import Track from "../../models/Track.js";

const LOOKUP_URL = "https://api.acoustid.org/v2/lookup";
const DEFAULT_MIN_SCORE = 0.85;
const DEFAULT_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MIN_REQUEST_INTERVAL_MS = 350;
const responseCache = new Map();
const lookupInFlight = new Map();
const verificationInFlight = new Map();
let requestQueue = Promise.resolve();
let nextRequestAt = 0;

const normalizeExternalText = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const getMinScore = () => {
    const configured = Number(process.env.ACOUSTID_MIN_SCORE);
    return Number.isFinite(configured) && configured > 0 && configured <= 1
        ? configured
        : DEFAULT_MIN_SCORE;
};

const getTimeout = () => {
    const configured = Number(process.env.ACOUSTID_TIMEOUT_MS);
    return Number.isFinite(configured) && configured > 0
        ? Math.min(configured, 30_000)
        : DEFAULT_TIMEOUT_MS;
};

const enqueueRateLimitedRequest = (operation) => {
    const run = requestQueue.then(async () => {
        const delay = Math.max(0, nextRequestAt - Date.now());
        if (delay > 0) await wait(delay);
        nextRequestAt = Date.now() + MIN_REQUEST_INTERVAL_MS;
        return operation();
    });
    requestQueue = run.catch(() => undefined);
    return run;
};

const packValues = (values, bitsPerValue) => {
    const output = Buffer.alloc(Math.ceil(values.length * bitsPerValue / 8));
    let bitOffset = 0;
    for (const value of values) {
        for (let bit = 0; bit < bitsPerValue; bit += 1) {
            if ((value & (1 << bit)) !== 0) {
                output[bitOffset >> 3] |= 1 << (bitOffset & 7);
            }
            bitOffset += 1;
        }
    }
    return output;
};

// Equivalent to chromaprint_encode_fingerprint(..., algorithm=1, base64=true).
// This reuses the stored raw fingerprint and does not decode or fingerprint audio again.
export const encodeChromaprint = (rawFingerprint, algorithm = 1) => {
    if (!Array.isArray(rawFingerprint) || rawFingerprint.length === 0) return "";
    const normalBits = [];
    const exceptionalBits = [];
    let previous = 0;

    rawFingerprint.forEach((rawValue, index) => {
        let value = Number(rawValue) >>> 0;
        if (index > 0) value = (value ^ previous) >>> 0;
        previous = Number(rawValue) >>> 0;
        let bit = 1;
        let lastBit = 0;
        while (value !== 0) {
            if ((value & 1) !== 0) {
                const distance = bit - lastBit;
                if (distance >= 7) {
                    normalBits.push(7);
                    exceptionalBits.push(distance - 7);
                } else {
                    normalBits.push(distance);
                }
                lastBit = bit;
            }
            value >>>= 1;
            bit += 1;
        }
        normalBits.push(0);
    });

    const header = Buffer.from([
        algorithm & 255,
        (rawFingerprint.length >> 16) & 255,
        (rawFingerprint.length >> 8) & 255,
        rawFingerprint.length & 255,
    ]);
    return Buffer.concat([
        header,
        packValues(normalBits, 3),
        packValues(exceptionalBits, 5),
    ]).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const sanitizeError = (error) => String(error?.message || error || "AcoustID lookup failed")
    .replace(/client=[^&\s]+/gi, "client=<redacted>")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 300);

const postLookup = async ({ apiKey, duration, fingerprint }) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getTimeout());
    try {
        const body = new URLSearchParams({
            client: apiKey,
            duration: String(Math.max(1, Math.round(Number(duration)))),
            fingerprint,
            format: "json",
            meta: "recordings+releasegroups+isrcs+compress",
        });
        const response = await fetch(LOOKUP_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
            signal: controller.signal,
        });
        if (!response.ok) {
            throw Object.assign(new Error(`AcoustID returned HTTP ${response.status}`), {
                code: `acoustid_http_${response.status}`,
            });
        }
        const payload = await response.json();
        if (payload?.status !== "ok") {
            throw Object.assign(new Error(payload?.error?.message || "AcoustID returned an error"), {
                code: payload?.error?.code ? `acoustid_api_${payload.error.code}` : "acoustid_api_error",
            });
        }
        return payload;
    } finally {
        clearTimeout(timeout);
    }
};

const normalizeRecording = (recording = {}) => ({
    mbid: recording.id || null,
    title: recording.title || null,
    artists: Array.isArray(recording.artists)
        ? recording.artists.map((artist) => artist?.name || "").filter(Boolean)
        : [],
    duration: Number(recording.duration || 0) || null,
    isrcs: Array.isArray(recording.isrcs)
        ? recording.isrcs.map((value) => String(value).trim().toUpperCase()).filter(Boolean)
        : [],
    releaseGroups: Array.isArray(recording.releasegroups)
        ? recording.releasegroups.map((group) => ({
            mbid: group?.id || null,
            title: group?.title || null,
            type: group?.type || null,
        })).filter((group) => group.mbid || group.title)
        : [],
});

const textMatches = (declared, external) => {
    const left = normalizeExternalText(declared);
    const right = normalizeExternalText(external);
    if (!left || !right) return null;
    return left === right || left.includes(right) || right.includes(left);
};

const AMBIGUOUS_VERSION_PATTERN = /\b(karaoke|instrumental|radio edit|live|remix|cover|version|edit)\b/i;

export const normalizeAcoustIdResult = ({ payload, declared = {}, minScore = getMinScore() }) => {
    const results = Array.isArray(payload?.results) ? [...payload.results] : [];
    results.sort((left, right) => Number(right?.score || 0) - Number(left?.score || 0));
    const best = results[0] || null;
    const score = Number(best?.score || 0);
    const recordings = Array.isArray(best?.recordings) ? best.recordings.map(normalizeRecording) : [];
    const recording = recordings[0] || null;
    const musicBrainzRecordingIds = Array.from(new Set(recordings.map((item) => item.mbid).filter(Boolean)));
    const highConfidence = score >= Number(minScore) && musicBrainzRecordingIds.length > 0;
    const status = highConfidence ? "matched" : score > 0 ? "possible_match" : "not_found";
    const primaryType = ["original", "cover", "remix"].includes(declared.primaryCopyrightType)
        ? declared.primaryCopyrightType
        : "original";
    const titleMatch = recording ? textMatches(declared.title, recording.title) : null;
    const declaredOwners = [declared.artist, declared.copyrightOwner, declared.recordingOwner].filter(Boolean);
    const artistMatch = recording?.artists?.length && declaredOwners.length
        ? recording.artists.some((artist) => declaredOwners.some((owner) => textMatches(owner, artist) === true))
        : null;
    const ambiguityText = [
        declared.title,
        recording?.title,
        ...(recording?.releaseGroups || []).map((group) => group.title),
    ].filter(Boolean).join(" ");
    const ambiguousVersion = AMBIGUOUS_VERSION_PATTERN.test(ambiguityText) || recordings.length > 1;
    const reasonCodes = [];
    let decision = "clear";

    if (status === "not_found") {
        decision = "review_required";
        reasonCodes.push("no_external_audio_match");
    } else if (status === "possible_match") {
        decision = "review_required";
        reasonCodes.push(
            score >= Number(minScore) && musicBrainzRecordingIds.length === 0
                ? "ACOUSTID_HIGH_SCORE_WITHOUT_IDENTITY"
                : "low_confidence_external_audio_match",
        );
    } else if (["cover", "remix"].includes(primaryType)) {
        decision = "review_required";
        reasonCodes.push(`declared_${primaryType}_external_audio_match`);
    } else if (declared.usesSample || declared.usesThirdPartyBeat || ambiguousVersion || titleMatch === null || artistMatch === null) {
        decision = "review_required";
        reasonCodes.push(ambiguousVersion ? "similar_version_ambiguous" : "external_match_needs_manual_review");
    } else if (titleMatch === false || artistMatch === false) {
        decision = "blocked";
        if (titleMatch === false) reasonCodes.push("external_audio_title_conflict");
        if (artistMatch === false) reasonCodes.push("external_audio_artist_conflict");
    } else {
        reasonCodes.push("external_audio_match_consistent");
    }

    return {
        status,
        decision,
        score: Number(score.toFixed(4)),
        acoustIdTrackId: best?.id || null,
        musicBrainzRecordingIds,
        match: recording || {
            mbid: null,
            title: null,
            artists: [],
            duration: null,
            isrcs: [],
            releaseGroups: [],
        },
        reasonCodes,
        comparison: { titleMatch, artistMatch, ambiguousVersion },
        checkedAt: new Date(),
        error: null,
        adminReview: {
            reviewedBy: null,
            reviewedAt: null,
            overriddenBy: null,
            overriddenAt: null,
            overrideReason: "",
        },
    };
};

const failedResult = (code, error) => ({
    status: "failed",
    decision: "review_required",
    providerUnavailable: Boolean(
        /timeout|unavailable|lookup_failed|missing_api_key|disabled|api_|http_/i.test(String(code || ""))
    ),
    score: 0,
    acoustIdTrackId: null,
    musicBrainzRecordingIds: [],
    match: { mbid: null, title: null, artists: [], duration: null, isrcs: [], releaseGroups: [] },
    reasonCodes: [code],
    comparison: { titleMatch: null, artistMatch: null, ambiguousVersion: false },
    checkedAt: new Date(),
    error: sanitizeError(error),
    adminReview: {
        reviewedBy: null,
        reviewedAt: null,
        overriddenBy: null,
        overriddenAt: null,
        overrideReason: "",
    },
});

export const lookupAcoustId = async ({
    rawFingerprint,
    fingerprintHash,
    duration,
    declared,
    apiKey = String(process.env.ACOUSTID_API_KEY || "").trim(),
    enabled = String(process.env.ACOUSTID_ENABLED || "true").trim().toLowerCase() !== "false",
    request = postLookup,
    rateLimit = request === postLookup,
    bypassCache = false,
}) => {
    if (!enabled) return failedResult("acoustid_disabled", "AcoustID lookup is disabled");
    if (!apiKey) return failedResult("acoustid_missing_api_key", "AcoustID API key is not configured");
    const encodedFingerprint = encodeChromaprint(rawFingerprint);
    if (!encodedFingerprint || !duration) {
        return failedResult("acoustid_fingerprint_missing", "Stored Chromaprint fingerprint or duration is missing");
    }

    const cacheKey = String(fingerprintHash || encodedFingerprint);
    const cached = responseCache.get(cacheKey);
    let payload = !bypassCache && cached?.expiresAt > Date.now() ? cached.payload : null;
    if (!payload) {
        let pending = lookupInFlight.get(cacheKey);
        if (!pending) {
            const operation = () => request({ apiKey, duration, fingerprint: encodedFingerprint });
            pending = (rateLimit ? enqueueRateLimitedRequest(operation) : operation())
                .then((value) => {
                    responseCache.set(cacheKey, { payload: value, expiresAt: Date.now() + CACHE_TTL_MS });
                    return value;
                })
                .finally(() => lookupInFlight.delete(cacheKey));
            lookupInFlight.set(cacheKey, pending);
        }
        try {
            payload = await pending;
        } catch (error) {
            const code = error?.name === "AbortError" ? "acoustid_timeout" : (error?.code || "acoustid_lookup_failed");
            return failedResult(code, error);
        }
    }
    return normalizeAcoustIdResult({ payload, declared });
};

const getTarget = (track) => track?.pendingUpdate?.status === "pending" && track.pendingUpdate.data
    ? track.pendingUpdate.data
    : track;

const getVersions = (track) => {
    const pending = track?.pendingUpdate?.status === "pending" && track.pendingUpdate.data;
    return {
        submissionVersion: Number(pending ? track.pendingUpdate.submissionVersion : track.submissionVersion) || 1,
        audioVersion: Number(pending ? track.pendingUpdate.audioVersion : track.audioVersion) || 1,
        copyrightVersion: Number(pending ? track.pendingUpdate.copyrightVersion : track.copyrightVersion) || 1,
        evidenceVersion: Number(pending ? track.pendingUpdate.evidenceVersion : track.evidenceVersion) || 1,
    };
};

const isCurrentVerificationVersion = async (trackId, versions) => {
    const current = await Track.findById(trackId).lean();
    if (!current || (current.approvalStatus !== "pending" && current.pendingUpdate?.status !== "pending")) return false;
    const currentVersions = getVersions(current);
    return ["audioVersion", "submissionVersion", "copyrightVersion", "evidenceVersion"]
        .every((key) => Number(currentVersions[key]) === Number(versions[key]));
};

const reEvaluateAfterVerification = async (trackId) => {
    try {
        const { evaluateAutomaticTrackModeration } = await import("../fingerprint/automaticTrackModeration.service.js");
        await evaluateAutomaticTrackModeration(trackId, { force: true });
    } catch (error) {
        console.error("Automatic moderation re-evaluation failed:", error.message);
    }
};

const buildDeclaredData = ({ track, target, artistName }) => ({
    primaryCopyrightType: ["original", "cover", "remix"].includes(target?.copyright?.primaryCopyrightType)
        ? target.copyright.primaryCopyrightType
        : "original",
    title: target?.title || track?.title || "",
    artist: artistName || target?.copyright?.copyrightOwner || target?.copyright?.recordingOwner || "",
    copyrightOwner: target?.copyright?.copyrightOwner || "",
    recordingOwner: target?.copyright?.recordingOwner || "",
    usesSample: target?.copyright?.usesSample === true,
    usesThirdPartyBeat: target?.copyright?.usesThirdPartyBeat === true || target?.copyright?.usesLicensedBeat === true,
});

export const isReusableAcoustIdResult = ({
    current,
    force = false,
    retryFailed = false,
    sameFingerprint = false,
    versions,
}) => Boolean(
    !force &&
    sameFingerprint &&
    Number(current?.submissionVersion || 1) === Number(versions?.submissionVersion || 1) &&
    Number(current?.audioVersion || 1) === Number(versions?.audioVersion || 1) &&
    Number(current?.copyrightVersion || 1) === Number(versions?.copyrightVersion || 1) &&
    Number(current?.evidenceVersion || 1) === Number(versions?.evidenceVersion || 1) &&
    current?.status &&
    current.status !== "pending" &&
    !(retryFailed && current.status === "failed")
);

const persistResult = (trackId, result, fingerprint, versions) => CopyrightRegistry.findOneAndUpdate(
    { trackId },
    {
        $set: {
            acoustIdResult: result,
            acoustIdFingerprintHash: fingerprint?.fingerprintHash || "",
            acoustIdAudioVersion: versions.audioVersion,
        },
        $setOnInsert: { trackId },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
);

export const runAcoustIdVerification = async (trackId, {
    force = false,
    retryFailed = false,
    request,
    rateLimit,
    reevaluate = true,
} = {}) => {
    const track = await Track.findById(trackId).lean();
    if (!track || (track.approvalStatus !== "pending" && track.pendingUpdate?.status !== "pending")) {
        return { status: "skipped", decision: "clear", reasonCodes: ["track_not_pending"] };
    }
    const target = getTarget(track);
    const versions = getVersions(track);
    const fingerprint = await AudioFingerprint.findOne({
        trackId,
        algorithm: "chromaprint",
        algorithmVersion: "chromaprint-v1",
        audioVersion: versions.audioVersion,
    }).select("status rawFingerprint duration fingerprintHash audioVersion").lean();
    const registry = await CopyrightRegistry.findOne({ trackId }).select("acoustIdResult acoustIdFingerprintHash acoustIdAudioVersion").lean();
    const current = registry?.acoustIdResult;
    const sameFingerprint = Boolean(
        fingerprint?.fingerprintHash &&
        registry?.acoustIdFingerprintHash === fingerprint.fingerprintHash &&
        Number(registry?.acoustIdAudioVersion || 1) === versions.audioVersion
    );
    if (isReusableAcoustIdResult({ current, force, retryFailed, sameFingerprint, versions })) {
        if (reevaluate) await reEvaluateAfterVerification(trackId);
        return current;
    }
    if (fingerprint?.status !== "completed" || !fingerprint.rawFingerprint?.length || !fingerprint.duration) {
        const pending = {
            ...failedResult("acoustid_fingerprint_pending", "Chromaprint fingerprint is not ready"),
            status: "pending",
            error: null,
            submissionVersion: versions.submissionVersion,
            audioVersion: versions.audioVersion,
            copyrightVersion: versions.copyrightVersion,
            evidenceVersion: versions.evidenceVersion,
            fingerprintHash: fingerprint?.fingerprintHash || "",
        };
        if (!await isCurrentVerificationVersion(trackId, versions)) {
            return { status: "skipped", reason: "stale_version", ...versions };
        }
        await persistResult(trackId, pending, fingerprint, versions);
        return pending;
    }

    const verificationKey = `${trackId}:${fingerprint.fingerprintHash}:${versions.audioVersion}:${versions.submissionVersion}:${versions.copyrightVersion}:${versions.evidenceVersion}`;
    const running = verificationInFlight.get(verificationKey);
    if (running) return running;
    const operation = (async () => {
        const artist = await Artist.findById(track.artist_artistId).select("name").lean();
        const declared = buildDeclaredData({ track, target, artistName: artist?.name || "" });
        const pending = {
            ...failedResult("acoustid_lookup_pending", "AcoustID lookup is pending"),
            status: "pending",
            error: null,
            submissionVersion: versions.submissionVersion,
            audioVersion: versions.audioVersion,
            copyrightVersion: versions.copyrightVersion,
            evidenceVersion: versions.evidenceVersion,
            fingerprintHash: fingerprint.fingerprintHash,
            declared,
        };
        if (!await isCurrentVerificationVersion(trackId, versions)) {
            return { status: "skipped", reason: "stale_version", ...versions };
        }
        await persistResult(trackId, pending, fingerprint, versions);
        const result = await lookupAcoustId({
            rawFingerprint: fingerprint.rawFingerprint,
            fingerprintHash: fingerprint.fingerprintHash,
            duration: fingerprint.duration,
            declared,
            ...(request ? { request } : {}),
            ...(rateLimit !== undefined ? { rateLimit } : {}),
            bypassCache: force || (retryFailed && current?.status === "failed"),
        });
        const persisted = {
            ...result,
            submissionVersion: versions.submissionVersion,
            audioVersion: versions.audioVersion,
            copyrightVersion: versions.copyrightVersion,
            evidenceVersion: versions.evidenceVersion,
            fingerprintHash: fingerprint.fingerprintHash,
            declared,
        };
        if (!await isCurrentVerificationVersion(trackId, versions)) {
            return { status: "skipped", reason: "stale_version", ...versions };
        }
        await persistResult(trackId, persisted, fingerprint, versions);
        if (reevaluate) await reEvaluateAfterVerification(trackId);
        return persisted;
    })().finally(() => verificationInFlight.delete(verificationKey));
    verificationInFlight.set(verificationKey, operation);
    return operation;
};

const isAcoustIdResultCurrent = (result, versions) => !versions || !result || [
    ["submissionVersion", versions.submissionVersion],
    ["audioVersion", versions.audioVersion],
    ["copyrightVersion", versions.copyrightVersion],
    ["evidenceVersion", versions.evidenceVersion],
].every(([key, version]) => Number(result[key] || 1) === Number(version || 1));

export const getAcoustIdResultForTrack = async (trackId, versions = null) => {
    const registry = await CopyrightRegistry.findOne({ trackId })
        .select("acoustIdResult acoustIdFingerprintHash acoustIdAudioVersion")
        .lean();
    const currentResult = isAcoustIdResultCurrent(registry?.acoustIdResult, versions)
        ? registry?.acoustIdResult
        : null;
    const result = currentResult?.status === "not_found"
        ? { ...currentResult, decision: "review_required" }
        : (currentResult || null);
    return {
        result,
        fingerprintHash: registry?.acoustIdFingerprintHash || "",
        audioVersion: Number(registry?.acoustIdAudioVersion || 1),
    };
};

export const markAcoustIdReviewed = (trackId, adminId) => CopyrightRegistry.updateOne(
    { trackId },
    {
        $set: {
            "acoustIdResult.adminReview.reviewedBy": adminId,
            "acoustIdResult.adminReview.reviewedAt": new Date(),
        },
    }
);

export const recordAcoustIdOverride = (trackId, adminId, reason) => CopyrightRegistry.updateOne(
    { trackId },
    {
        $set: {
            "acoustIdResult.adminReview.overriddenBy": adminId,
            "acoustIdResult.adminReview.overriddenAt": new Date(),
            "acoustIdResult.adminReview.overrideReason": String(reason || "").trim().slice(0, 2000),
        },
    }
);

export default {
    encodeChromaprint,
    isReusableAcoustIdResult,
    lookupAcoustId,
    normalizeAcoustIdResult,
    runAcoustIdVerification,
    getAcoustIdResultForTrack,
    markAcoustIdReviewed,
    recordAcoustIdOverride,
};
