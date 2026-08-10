import Track from "../../models/Track.js";
import Artist from "../../models/Artist.js";
import CopyrightRegistry from "../../models/CopyrightRegistry.js";
import AudioFingerprint from "../../models/AudioFingerprint.js";

const BASE_URL = "https://musicbrainz.org/ws/2";
const DEFAULT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 8_000;
const RECORDING_SEARCH_DURATION_WINDOW_MS = 2_000;
const DEFAULT_USER_AGENT = "Reso-Unlimited-Rhythm/1.0 (copyright-review@reso.local)";
const cache = new Map();
let requestQueue = Promise.resolve();
let nextRequestAt = 0;

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const getCacheTtl = () => {
    const value = Number(process.env.MUSICBRAINZ_CACHE_TTL_MS);
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_CACHE_TTL_MS;
};

const getTimeout = () => {
    const value = Number(process.env.MUSICBRAINZ_TIMEOUT_MS);
    return Number.isFinite(value) && value > 0 ? Math.min(value, 30_000) : DEFAULT_TIMEOUT_MS;
};

const getUserAgent = () => String(process.env.MUSICBRAINZ_USER_AGENT || DEFAULT_USER_AGENT).trim();

const enqueueRateLimitedRequest = (operation) => {
    const run = requestQueue.then(async () => {
        const delay = Math.max(0, nextRequestAt - Date.now());
        if (delay > 0) await wait(delay);
        nextRequestAt = Date.now() + 1_000;
        return operation();
    });
    requestQueue = run.catch(() => undefined);
    return run;
};

const buildUrl = (path, params = {}) => {
    const url = new URL(`${BASE_URL}/${String(path).replace(/^\//, "")}`);
    Object.entries({ ...params, fmt: "json" }).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value) !== "") url.searchParams.set(key, String(value));
    });
    return url;
};

const fetchJson = async (path, params = {}) => {
    const url = buildUrl(path, params);
    const cacheKey = url.toString();
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    cache.delete(cacheKey);

    const request = async () => {
        let lastError = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), getTimeout());
            try {
                const response = await fetch(url, {
                    headers: {
                        Accept: "application/json",
                        "User-Agent": getUserAgent(),
                    },
                    signal: controller.signal,
                });
                if (response.ok) {
                    const value = await response.json();
                    cache.set(cacheKey, { value, expiresAt: Date.now() + getCacheTtl() });
                    return value;
                }
                lastError = new Error(`MusicBrainz returned HTTP ${response.status}`);
                if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 1) break;
                await wait(1_200);
            } catch (error) {
                lastError = error;
                // A network/timeout failure gets one bounded retry only.
                if (attempt === 1) break;
                await wait(1_200);
            } finally {
                clearTimeout(timeout);
            }
        }
        throw lastError || new Error("MusicBrainz request failed");
    };

    return enqueueRateLimitedRequest(request);
};

export const normalizeExternalText = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const similarity = (left, right) => {
    const a = normalizeExternalText(left);
    const b = normalizeExternalText(right);
    if (!a || !b) return null;
    if (a === b) return 1;
    if (a.includes(b) || b.includes(a)) return 0.85;
    const leftTokens = new Set(a.split(" "));
    const rightTokens = new Set(b.split(" "));
    const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
    return intersection / Math.max(leftTokens.size, rightTokens.size);
};

const getArtistNames = (recording = {}) => {
    const credits = Array.isArray(recording["artist-credit"])
        ? recording["artist-credit"]
        : (Array.isArray(recording.artists) ? recording.artists : []);
    return credits.map((item) => item?.name || item?.artist?.name || "").filter(Boolean);
};

const getIsrcs = (recording = {}) => Array.from(new Set([
    ...(Array.isArray(recording.isrcs) ? recording.isrcs : []),
    ...(Array.isArray(recording.releases) ? recording.releases.flatMap((release) => release?.isrcs || []) : []),
])).map((value) => String(value).trim().toUpperCase()).filter(Boolean);

const getWorkRelations = (recording = {}) => (recording.relations || [])
    .filter((relation) => relation?.target_type === "work" && relation.work)
    .map((relation) => relation.work);

const getComposers = (work = {}) => (work.relations || [])
    .filter((relation) => ["composer", "writer"].includes(relation?.type) && relation.artist)
    .map((relation) => relation.artist.name || "")
    .filter(Boolean);

const getLyricists = (work = {}) => (work.relations || [])
    .filter((relation) => ["lyricist", "writer"].includes(relation?.type) && relation.artist)
    .map((relation) => relation.artist.name || "")
    .filter(Boolean);

const normalizeRecording = (recording = {}) => ({
    mbid: recording.id || null,
    title: recording.title || null,
    artists: getArtistNames(recording),
    durationMs: Number(recording.length || 0) || null,
    isrcs: getIsrcs(recording),
});

const normalizeWork = (work = {}) => ({
    mbid: work.id || null,
    title: work.title || null,
    iswcs: Array.isArray(work.iswcs) ? work.iswcs : [],
    composers: getComposers(work),
    lyricists: getLyricists(work),
});

const durationMatch = (durationMs, targetDurationSeconds) => {
    if (!durationMs || !targetDurationSeconds) return null;
    const difference = Math.abs(Number(durationMs) - Number(targetDurationSeconds) * 1000);
    return Math.max(0, 1 - (difference / 1000) / 15);
};

const candidateScore = ({ recording, work, declared }) => {
    const titleMatch = similarity(declared.title, recording.title);
    const artistMatch = declared.artist && recording.artists?.length
        ? Math.max(0, ...recording.artists.map((artist) => similarity(declared.artist, artist) || 0))
        : null;
    const duration = durationMatch(recording.durationMs, declared.durationSeconds);
    const isrcMatch = declared.isrc && recording.isrcs?.length
        ? (recording.isrcs.includes(String(declared.isrc).toUpperCase()) ? 1 : 0)
        : null;
    const iswcMatch = declared.iswc && work?.iswcs?.length
        ? (work.iswcs.includes(String(declared.iswc).toUpperCase()) ? 1 : 0)
        : null;
    const composerMatch = declared.composer && work?.composers?.length
        ? Math.max(0, ...work.composers.map((name) => similarity(declared.composer, name) || 0))
        : null;
    const lyricistMatch = declared.lyricist && work?.lyricists?.length
        ? Math.max(0, ...work.lyricists.map((name) => similarity(declared.lyricist, name) || 0))
        : null;
    const values = [titleMatch, artistMatch, duration, isrcMatch, iswcMatch, composerMatch, lyricistMatch].filter((value) => value !== null);
    const weighted = [
        [titleMatch, 0.28],
        [artistMatch, 0.25],
        [duration, 0.12],
        [isrcMatch, 0.2],
        [iswcMatch, 0.1],
        [composerMatch, 0.03],
        [lyricistMatch, 0.02],
    ];
    const totalWeight = weighted.filter(([value]) => value !== null).reduce((sum, [, weight]) => sum + weight, 0);
    const confidence = totalWeight > 0
        ? weighted.reduce((sum, [value, weight]) => sum + (value === null ? 0 : value * weight), 0) / totalWeight
        : (values.length ? Math.max(...values) : 0);
    return {
        confidence: Number(confidence.toFixed(4)),
        comparison: { titleMatch, artistMatch, durationMatch: duration, isrcMatch, iswcMatch, composerMatch, lyricistMatch },
    };
};

const quoteLucene = (value) => `"${String(value || "").replace(/"/g, "\\\"")}"`;

const firstNonEmptyLookup = async ({ path, queries, resultKey, params, request }) => {
    let lastResult = null;
    for (const query of queries) {
        lastResult = await request(path, { query, ...params });
        if (Array.isArray(lastResult?.[resultKey]) && lastResult[resultKey].length > 0) return lastResult;
    }
    return lastResult;
};

const lookupRecording = async ({ title, artist, isrc, durationSeconds }, request = fetchJson) => {
    if (!title && !isrc) return null;
    const durationMs = Math.round(Number(durationSeconds || 0) * 1000);
    const durationRange = durationMs > 0
        ? `dur:[${Math.max(1, durationMs - RECORDING_SEARCH_DURATION_WINDOW_MS)} TO ${durationMs + RECORDING_SEARCH_DURATION_WINDOW_MS}]`
        : null;
    const queries = Array.from(new Set([
        isrc ? `isrc:${String(isrc).replace(/-/g, "")}` : null,
        title && artist ? `recording:${quoteLucene(title)} AND artist:${quoteLucene(artist)}` : null,
        title && durationRange ? `recording:${quoteLucene(title)} AND ${durationRange}` : null,
        title ? `recording:${quoteLucene(title)}` : null,
    ].filter(Boolean)));
    const recordings = new Map();
    let successfulRequestCount = 0;
    let lastError = null;
    for (const query of queries) {
        try {
            const response = await request("recording", {
                query,
                limit: 25,
                inc: "artists+artist-credits+isrcs+work-rels",
            });
            successfulRequestCount += 1;
            for (const recording of response?.recordings || []) {
                if (recording?.id && !recordings.has(recording.id)) recordings.set(recording.id, recording);
            }
        } catch (error) {
            lastError = error;
        }
    }
    if (successfulRequestCount === 0 && lastError) throw lastError;
    return { recordings: [...recordings.values()] };
};

const lookupWork = async ({ title, artist, composer, iswc }, request = fetchJson) => {
    if (!title && !iswc) return null;
    const creditedArtist = composer || artist;
    const queries = Array.from(new Set([
        iswc ? `iswc:${String(iswc).replace(/[.\s-]/g, "")}` : null,
        title && creditedArtist ? `work:${quoteLucene(title)} AND artist:${quoteLucene(creditedArtist)}` : null,
        title && !creditedArtist ? `work:${quoteLucene(title)}` : null,
    ].filter(Boolean)));
    return firstNonEmptyLookup({
        path: "work",
        queries,
        resultKey: "works",
        params: { limit: 5, inc: "artist-rels" },
        request,
    });
};

const selectRecording = (recordings, declared) => {
    const candidates = (recordings?.recordings || []).map((item) => {
        const recording = normalizeRecording(item);
        const work = normalizeWork(getWorkRelations(item)[0] || {});
        const scored = candidateScore({ recording, work, declared });
        return { item, recording, work, ...scored };
    });
    return candidates.sort((left, right) => right.confidence - left.confidence)[0] || null;
};

const selectWork = (works, declared) => {
    const candidates = (works?.works || []).map((item) => {
        const work = normalizeWork(item);
        const scored = candidateScore({
            recording: { title: work.title, artists: work.composers, durationMs: null, isrcs: [] },
            work,
            declared,
        });
        return { item, work, ...scored };
    });
    return candidates.sort((left, right) => right.confidence - left.confidence)[0] || null;
};

const buildDeclaredData = ({ track, target, artistName }) => {
    const copyright = target?.copyright || {};
    const primary = ["original", "cover", "remix"].includes(copyright.primaryCopyrightType)
        ? copyright.primaryCopyrightType
        : "original";
    const isSourceLookup = ["cover", "remix"].includes(primary);
    const isSampleLookup = !isSourceLookup && copyright.usesSample === true && copyright.sampleSourceTitle;
    const title = isSourceLookup
        ? copyright.originalTrackTitle
        : isSampleLookup
            ? copyright.sampleSourceTitle
            : target?.title;
    const artist = isSourceLookup
        ? copyright.originalArtistName
        : isSampleLookup
            ? copyright.sampleSourceArtist
        : (artistName || copyright.copyrightOwner || copyright.recordingOwner || "");
    return {
        primaryCopyrightType: primary,
        title: title || "",
        artist: artist || "",
        composer: isSourceLookup ? copyright.originalComposer : copyright.composer,
        lyricist: copyright.lyricist || "",
        isrc: isSourceLookup
            ? (copyright.originalISRC || copyright.isrc)
            : isSampleLookup
                ? copyright.sampleSourceISRC
                : copyright.isrc,
        iswc: isSourceLookup ? (copyright.originalISWC || copyright.iswc) : copyright.iswc,
        submittedIsrc: copyright.isrc || "",
        durationSeconds: Number(target?.duration || track?.duration || 0),
        lookupReason: isSourceLookup ? "declared_original_work" : isSampleLookup ? "sample_source" : "submitted_track",
        usesSample: copyright.usesSample === true,
        usesThirdPartyBeat: copyright.usesThirdPartyBeat === true || copyright.usesLicensedBeat === true,
    };
};

export const lookupMusicBrainz = async (declared, { request = fetchJson } = {}) => {
    const result = {
        status: "not_found",
        confidence: 0,
        recording: { mbid: null, title: null, artists: [], durationMs: null, isrcs: [] },
        work: { mbid: null, title: null, iswcs: [], composers: [], lyricists: [] },
        comparison: { titleMatch: null, artistMatch: null, durationMatch: null, isrcMatch: null, iswcMatch: null, composerMatch: null, lyricistMatch: null },
        flags: [],
        checkedAt: new Date(),
        submissionVersion: null,
    };

    try {
        const [recordingLookup, workLookup] = await Promise.allSettled([
            lookupRecording(declared, request),
            lookupWork(declared, request),
        ]);
        if (recordingLookup.status === "rejected" && workLookup.status === "rejected") {
            throw recordingLookup.reason || workLookup.reason;
        }
        const recordings = recordingLookup.status === "fulfilled" ? recordingLookup.value : null;
        const works = workLookup.status === "fulfilled" ? workLookup.value : null;
        const recording = selectRecording(recordings, declared);
        const work = selectWork(works, declared);
        if (!recording && !work) return result;

        const selectedRecording = recording?.recording || result.recording;
        const selectedWork = work?.work || recording?.work || result.work;
        const score = recording || work;
        result.recording = selectedRecording;
        result.work = selectedWork;
        result.confidence = score?.confidence || 0;
        result.comparison = score?.comparison || result.comparison;
        result.status = result.confidence >= 0.85 ? "matched" : "possible_match";

        const artistMismatch = result.comparison.artistMatch !== null && result.comparison.artistMatch < 0.5;
        const titleMismatch = result.comparison.titleMatch !== null && result.comparison.titleMatch < 0.5;
        if (declared.primaryCopyrightType === "original" && ((result.confidence >= 0.75 && (artistMismatch || titleMismatch)) || (titleMismatch === false && artistMismatch))) {
            result.flags.push("possible_existing_work", "external_metadata_conflict");
        }
        if (declared.primaryCopyrightType === "cover" && (artistMismatch || titleMismatch)) result.flags.push("cover_source_mismatch");
        if (declared.primaryCopyrightType === "remix" && declared.submittedIsrc && result.recording.isrcs.length > 0 && !result.recording.isrcs.includes(String(declared.submittedIsrc).toUpperCase())) result.flags.push("remix_isrc_mismatch");
        return result;
    } catch (error) {
        return {
            ...result,
            status: "failed",
            flags: ["musicbrainz_unavailable"],
            error: String(error?.message || "MusicBrainz request failed").slice(0, 300),
        };
    }
};

const getTarget = (track) => track?.pendingUpdate?.status === "pending" && track.pendingUpdate.data
    ? track.pendingUpdate.data
    : track;

export const resolveMusicBrainzTargetVersions = (track = {}) => {
    const isPendingUpdate = track?.pendingUpdate?.status === "pending" && track.pendingUpdate.data;
    return {
        audioVersion: Number(
            isPendingUpdate ? track.pendingUpdate.audioVersion : track.audioVersion
        ) || 1,
        submissionVersion: Number(
            isPendingUpdate ? track.pendingUpdate.submissionVersion : track.submissionVersion
        ) || 1,
    };
};

export const runMusicBrainzVerification = async (trackId, { force = false } = {}) => {
    const track = await Track.findById(trackId).lean();
    if (!track || (track.approvalStatus !== "pending" && track.pendingUpdate?.status !== "pending")) {
        return { status: "skipped", reason: "track_not_pending" };
    }

    const target = getTarget(track);
    const targetVersions = resolveMusicBrainzTargetVersions(track);
    const targetAudioVersion = targetVersions.audioVersion;
    const fingerprint = await AudioFingerprint.findOne({
        trackId,
        algorithm: "chromaprint",
        algorithmVersion: "chromaprint-v1",
    }).select("status audioVersion").lean();
    if (fingerprint?.status !== "completed" || Number(fingerprint.audioVersion || 1) !== targetAudioVersion) {
        return { status: "pending", submissionVersion: targetVersions.submissionVersion };
    }
    const submissionVersion = targetVersions.submissionVersion;
    const registry = await CopyrightRegistry.findOne({ trackId }).lean();
    if (!force && registry?.externalResult?.submissionVersion === submissionVersion && registry.externalResult.status && registry.externalResult.status !== "pending") {
        return registry.externalResult;
    }

    const artist = await Artist.findById(track.artist_artistId).select("name").lean();
    const declared = buildDeclaredData({ track, target, artistName: artist?.name || "" });
    const externalResult = await lookupMusicBrainz(declared);
    externalResult.submissionVersion = submissionVersion;
    externalResult.checkedAt = new Date();

    await CopyrightRegistry.findOneAndUpdate(
        { trackId },
        {
            $set: {
                rightsOwner: target.copyright?.copyrightOwner || "",
                source: "external_reference",
                artistDeclaredData: declared,
                externalResult,
                externalSubmissionVersion: submissionVersion,
                "externalVerification.mode": "musicbrainz",
                "externalVerification.provider": "MusicBrainz",
                "externalVerification.source": `${BASE_URL}`,
                "externalVerification.status": externalResult.status,
                "externalVerification.note": "Kết quả chỉ là tham khảo metadata, không phải xác minh quyền sở hữu pháp lý.",
            },
            $setOnInsert: { trackId },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return externalResult;
};

export const getMusicBrainzResultForTrack = async (trackId) => {
    const registry = await CopyrightRegistry.findOne({ trackId }).select("artistDeclaredData externalResult externalVerification externalSubmissionVersion").lean();
    return registry
        ? {
            artistDeclaredData: registry.artistDeclaredData || null,
            externalResult: registry.externalResult || null,
            externalVerification: registry.externalVerification || null,
            externalSubmissionVersion: registry.externalSubmissionVersion || null,
        }
        : { artistDeclaredData: null, externalResult: null, externalVerification: null, externalSubmissionVersion: null };
};

export default {
    lookupMusicBrainz,
    runMusicBrainzVerification,
    getMusicBrainzResultForTrack,
    normalizeExternalText,
};
