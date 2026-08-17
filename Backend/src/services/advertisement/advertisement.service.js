import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Advertisement from "../../models/Advertisement.js";
import AdEvent from "../../models/AdEvent.js";
import redisClient from "../../config/redisConfig.js";
import { resolveUserPremiumState } from "../../utils/premiumAccess.js";
import { AppError } from "../../utils/AppError.js";
import { recordAuditEvent } from "../audit/auditLog.service.js";

const ACTIVE_CACHE_KEY = "ads:active:v1";
const SESSION_TTL_SECONDS = 60 * 60 * 25;
const ACTIVE_CACHE_SECONDS = 30;
const memorySessions = new Map();
let memoryActiveCache = { expiresAt: 0, ads: [] };

const allowedProtocols = new Set(["http:", "https:"]);
const tokenSecret = () => `${process.env.JWT_SECRET || "reso-development-secret"}:advertisements`;
const nowMs = () => Date.now();

export const normalizeSafeUrl = (value, { required = false } = {}) => {
    const normalized = String(value || "").trim();
    if (!normalized && !required) return "";

    try {
        const parsed = new URL(normalized);
        if (!allowedProtocols.has(parsed.protocol)) throw new Error("unsafe protocol");
        return parsed.toString();
    } catch {
        throw new AppError("Advertisement URL must be a valid HTTP(S) URL.", 400);
    }
};

const normalizeAdvertisementPayload = (payload = {}, current = null) => {
    const type = payload.type ?? current?.type;
    const startAt = new Date(payload.startAt ?? current?.startAt ?? Date.now());
    const endAt = new Date(payload.endAt ?? current?.endAt ?? Date.now());
    if (!["banner", "audio"].includes(type)) throw new AppError("Invalid advertisement type.", 400);
    if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || endAt <= startAt) {
        throw new AppError("endAt must be later than startAt.", 400);
    }

    const status = payload.status ?? current?.status ?? "draft";
    if (!["draft", "active", "paused", "expired", "archived"].includes(status)) {
        throw new AppError("Invalid advertisement status.", 400);
    }

    const placements = Array.isArray(payload.targeting?.placements)
        ? payload.targeting.placements.map((value) => String(value).trim().toLowerCase()).filter(Boolean)
        : current?.targeting?.placements || [];
    const allowedPlacements = type === "audio"
        ? new Set(["between_tracks"])
        : new Set(["home", "search"]);
    if (placements.some((placement) => !allowedPlacements.has(placement))) {
        throw new AppError(
            type === "audio"
                ? "Audio advertisements only support the between_tracks placement."
                : "Banner advertisements only support home and search placements.",
            400
        );
    }

    return {
        title: String(payload.title ?? current?.title ?? "").trim(),
        advertiserName: String(payload.advertiserName ?? current?.advertiserName ?? "").trim(),
        type,
        status,
        mediaUrl: normalizeSafeUrl(payload.mediaUrl ?? current?.mediaUrl, { required: true }),
        thumbnailUrl: normalizeSafeUrl(payload.thumbnailUrl ?? current?.thumbnailUrl),
        clickUrl: normalizeSafeUrl(payload.clickUrl ?? current?.clickUrl),
        startAt,
        endAt,
        priority: Math.min(Math.max(Number(payload.priority ?? current?.priority ?? 1) || 1, 1), 100),
        targeting: {
            genres: Array.isArray(payload.targeting?.genres)
                ? payload.targeting.genres.filter((id) => mongoose.isValidObjectId(id))
                : current?.targeting?.genres || [],
            countries: Array.isArray(payload.targeting?.countries)
                ? payload.targeting.countries.map((value) => String(value).trim().toUpperCase()).filter((value) => /^[A-Z]{2}$/.test(value))
                : current?.targeting?.countries || [],
            placements,
        },
        frequencyCap: {
            maxPerHour: Math.min(Math.max(Number(payload.frequencyCap?.maxPerHour ?? current?.frequencyCap?.maxPerHour ?? 4) || 4, 1), 60),
            minTracksBetweenAds: Math.min(Math.max(Number(payload.frequencyCap?.minTracksBetweenAds ?? current?.frequencyCap?.minTracksBetweenAds ?? 3) || 0, 0), 100),
            minMinutesBetweenAds: Math.min(Math.max(Number(payload.frequencyCap?.minMinutesBetweenAds ?? current?.frequencyCap?.minMinutesBetweenAds ?? 8) || 0, 0), 1440),
        },
        skipEnabled: Boolean(payload.skipEnabled ?? current?.skipEnabled ?? true),
        skipAfterSeconds: Math.min(Math.max(Number(payload.skipAfterSeconds ?? current?.skipAfterSeconds ?? 5) || 0, 0), 3600),
        duration: Math.min(Math.max(Number(payload.duration ?? current?.duration ?? 0) || 0, 0), 3600),
    };
};

const publicAd = (ad) => ({
    id: String(ad._id || ad.id),
    title: ad.title,
    advertiserName: ad.advertiserName,
    type: ad.type,
    mediaUrl: ad.mediaUrl,
    thumbnailUrl: ad.thumbnailUrl || "",
    clickUrl: ad.clickUrl || "",
    skipEnabled: Boolean(ad.skipEnabled),
    skipAfterSeconds: Number(ad.skipAfterSeconds) || 0,
    duration: Number(ad.duration) || 0,
});

export const calculateAnalytics = (counts = {}) => {
    const impressions = Number(counts.impression) || 0;
    const clicks = Number(counts.click) || 0;
    const completes = Number(counts.complete) || 0;
    const skips = Number(counts.skip) || 0;
    const terminalAudioEvents = completes + skips;
    return {
        started: Number(counts.started) || 0,
        impressions,
        clicks,
        completes,
        skips,
        ctr: impressions ? (clicks / impressions) * 100 : 0,
        completionRate: terminalAudioEvents ? (completes / terminalAudioEvents) * 100 : 0,
    };
};

export const excludeRecentlyPlayedAds = (ads = [], recentAdIds = []) => {
    const unseen = ads.filter((ad) => !recentAdIds.includes(String(ad._id)));
    return unseen.length ? unseen : ads;
};

export const invalidateActiveAdCache = async () => {
    memoryActiveCache = { expiresAt: 0, ads: [] };
    if (redisClient.isOpen) await redisClient.del(ACTIVE_CACHE_KEY).catch(() => null);
};

const loadActiveAds = async (type, now = new Date()) => {
    let ads = memoryActiveCache.expiresAt > nowMs() ? memoryActiveCache.ads : null;
    if (!ads && redisClient.isOpen) {
        const cached = await redisClient.get(ACTIVE_CACHE_KEY).catch(() => null);
        if (cached) {
            try { ads = JSON.parse(cached); } catch { ads = null; }
        }
    }
    if (!ads) {
        ads = await Advertisement.find({
            status: "active",
            startAt: { $lte: now },
            endAt: { $gt: now },
        }).lean();
        memoryActiveCache = { expiresAt: nowMs() + ACTIVE_CACHE_SECONDS * 1000, ads };
        if (redisClient.isOpen) {
            await redisClient.set(ACTIVE_CACHE_KEY, JSON.stringify(ads), { EX: ACTIVE_CACHE_SECONDS }).catch(() => null);
        }
        void Advertisement.updateMany({ status: "active", endAt: { $lte: now } }, { $set: { status: "expired" } });
    }
    return ads.filter((ad) => ad.type === type && new Date(ad.startAt) <= now && new Date(ad.endAt) > now);
};

const hashSession = (identity) => crypto.createHash("sha256").update(identity).digest("hex");
const sessionKey = (hash) => `ads:session:${hash}`;
const emptySession = () => ({ impressions: [], tracksSinceAudio: 0, lastAudioAt: 0, recentAdIds: [], transitions: [] });

const getSession = async (hash) => {
    if (redisClient.isOpen) {
        const value = await redisClient.get(sessionKey(hash)).catch(() => null);
        if (value) try { return { ...emptySession(), ...JSON.parse(value) }; } catch { /* noop */ }
    }
    return { ...emptySession(), ...(memorySessions.get(hash) || {}) };
};

const saveSession = async (hash, state) => {
    const cutoff = nowMs() - 60 * 60 * 1000;
    const compact = {
        ...state,
        impressions: (state.impressions || []).filter((item) => item.at >= cutoff).slice(-100),
        recentAdIds: (state.recentAdIds || []).slice(-8),
        transitions: (state.transitions || []).slice(-30),
    };
    memorySessions.set(hash, compact);
    if (memorySessions.size > 5000) memorySessions.delete(memorySessions.keys().next().value);
    if (redisClient.isOpen) {
        await redisClient.set(sessionKey(hash), JSON.stringify(compact), { EX: SESSION_TTL_SECONDS }).catch(() => null);
    }
    return compact;
};

const targetMatches = (ad, { country, genreIds, placement }) => {
    const countries = ad.targeting?.countries || [];
    const genres = (ad.targeting?.genres || []).map(String);
    const placements = ad.targeting?.placements || [];
    if (countries.length && (!country || !countries.includes(String(country).toUpperCase()))) return false;
    if (genres.length && !genreIds.some((id) => genres.includes(String(id)))) return false;
    if (placements.length && (!placement || !placements.includes(String(placement).toLowerCase()))) return false;
    return true;
};

export const filterEligibleAds = (ads, state, context, at = nowMs()) => ads.filter((ad) => {
    if (!targetMatches(ad, context)) return false;
    const cap = ad.frequencyCap || {};
    const hourCount = (state.impressions || []).filter((item) => item.type === ad.type && item.at > at - 3600000).length;
    if (hourCount >= (Number(cap.maxPerHour) || 4)) return false;
    if (ad.type === "audio") {
        if ((state.tracksSinceAudio || 0) < (Number(cap.minTracksBetweenAds) || 0)) return false;
        if (state.lastAudioAt && at - state.lastAudioAt < (Number(cap.minMinutesBetweenAds) || 0) * 60000) return false;
    }
    return true;
});

export const chooseWeightedAd = (ads, random = Math.random) => {
    if (!ads.length) return null;
    const total = ads.reduce((sum, ad) => sum + Math.max(Number(ad.priority) || 1, 1), 0);
    let cursor = random() * total;
    for (const ad of ads) {
        cursor -= Math.max(Number(ad.priority) || 1, 1);
        if (cursor <= 0) return ad;
    }
    return ads[ads.length - 1];
};

export const decideAdvertisement = async ({ user, sessionId, type, placement = "", country = "", genreIds = [], transitionId = "" }) => {
    if (!["banner", "audio"].includes(type)) throw new AppError("Invalid advertisement type.", 400);
    if (!sessionId || String(sessionId).length < 8 || String(sessionId).length > 160) throw new AppError("A valid ad session is required.", 400);
    if (user && await resolveUserPremiumState(user)) return { shouldPlay: false, advertisement: null, ad: null, reason: "premium" };

    const identity = user?.id || user?._id ? `user:${user.id || user._id}` : `guest:${sessionId}`;
    const sessionHash = hashSession(identity);
    let state = await getSession(sessionHash);
    const normalizedTransition = String(transitionId || "").slice(0, 160);

    if (type === "audio") {
        if (!normalizedTransition) throw new AppError("transitionId is required for audio decisions.", 400);
        if (state.transitions.includes(normalizedTransition)) return { shouldPlay: false, advertisement: null, ad: null, reason: "duplicate_transition" };
        state.transitions.push(normalizedTransition);
        state.tracksSinceAudio = (state.tracksSinceAudio || 0) + 1;
    }

    const activeAds = await loadActiveAds(type);
    let eligible = filterEligibleAds(activeAds, state, { country, genreIds, placement });
    eligible = excludeRecentlyPlayedAds(eligible, state.recentAdIds);
    const selected = chooseWeightedAd(eligible);
    state = await saveSession(sessionHash, state);
    if (!selected) return { shouldPlay: false, advertisement: null, ad: null, reason: "not_eligible" };

    const decisionId = crypto.randomUUID();
    const decisionToken = jwt.sign({
        decisionId,
        adId: String(selected._id),
        adType: selected.type,
        sessionHash,
        placement: String(placement || "").slice(0, 60),
        userId: user?.id || user?._id || null,
    }, tokenSecret(), { expiresIn: "15m", audience: "reso-ad-event", issuer: "reso-api" });

    return { shouldPlay: true, advertisement: publicAd(selected), ad: publicAd(selected), decisionId, decisionToken, reason: "selected" };
};

export const recordAdvertisementEvent = async ({ token, eventType, playedSeconds = 0 }) => {
    if (!["started", "impression", "click", "complete", "skip"].includes(eventType)) throw new AppError("Invalid ad event type.", 400);
    let decision;
    try { decision = jwt.verify(token, tokenSecret(), { audience: "reso-ad-event", issuer: "reso-api" }); }
    catch { throw new AppError("Invalid or expired advertisement decision.", 401); }
    const ad = await Advertisement.findById(decision.adId).select("type").lean();
    if (!ad || ad.type !== decision.adType) throw new AppError("Advertisement no longer exists.", 404);

    const dedupeKey = `${decision.decisionId}:${eventType}`;
    try {
        await AdEvent.create({
            advertisementId: decision.adId,
            type: eventType,
            adType: decision.adType,
            sessionHash: decision.sessionHash,
            userId: decision.userId || null,
            decisionId: decision.decisionId,
            dedupeKey,
            placement: decision.placement || "",
            playedSeconds: Math.max(Number(playedSeconds) || 0, 0),
        });
    } catch (error) {
        if (error?.code !== 11000) throw error;
        return { recorded: false, duplicate: true };
    }

    if (eventType === "impression") {
        const state = await getSession(decision.sessionHash);
        state.impressions.push({ adId: String(decision.adId), at: nowMs(), type: decision.adType });
        state.recentAdIds.push(String(decision.adId));
        if (decision.adType === "audio") {
            state.lastAudioAt = nowMs();
            state.tracksSinceAudio = 0;
        }
        await saveSession(decision.sessionHash, state);
    }
    return { recorded: true, duplicate: false };
};

export const listAdvertisements = async ({ page = 1, limit = 20, status, type, search } = {}) => {
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const query = {};
    if (status === "expired") query.$or = [{ status: "expired" }, { status: "active", endAt: { $lte: new Date() } }];
    else if (status === "active") Object.assign(query, { status: "active", endAt: { $gt: new Date() } });
    else if (status) query.status = status;
    if (type) query.type = type;
    if (search) {
        const searchConditions = ["title", "advertiserName"].map((field) => ({ [field]: { $regex: String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }));
        if (query.$or) {
            const statusConditions = query.$or;
            delete query.$or;
            query.$and = [{ $or: statusConditions }, { $or: searchConditions }];
        } else query.$or = searchConditions;
    }
    const [items, total] = await Promise.all([
        Advertisement.find(query).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
        Advertisement.countDocuments(query),
    ]);
    const now = new Date();
    const ids = items.map((item) => item._id);
    const eventRows = ids.length ? await AdEvent.aggregate([
        { $match: { advertisementId: { $in: ids } } },
        { $group: { _id: { adId: "$advertisementId", type: "$type" }, count: { $sum: 1 } } },
    ]) : [];
    const analyticsById = eventRows.reduce((result, row) => {
        const id = String(row._id.adId);
        result[id] ||= {};
        result[id][row._id.type] = row.count;
        return result;
    }, {});
    return {
        advertisements: items.map((item) => ({
            ...item,
            effectiveStatus: item.status === "active" && new Date(item.endAt) <= now ? "expired" : item.status,
            analytics: calculateAnalytics(analyticsById[String(item._id)]),
        })),
        pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.max(Math.ceil(total / safeLimit), 1) },
    };
};

export const getAdvertisement = async (id) => {
    if (!mongoose.isValidObjectId(id)) throw new AppError("Invalid advertisement id.", 400);
    const advertisement = await Advertisement.findById(id).lean();
    if (!advertisement) throw new AppError("Advertisement not found.", 404);
    return advertisement;
};

export const createAdvertisement = async (payload, admin) => {
    const normalized = normalizeAdvertisementPayload(payload);
    if (!normalized.title || !normalized.advertiserName) throw new AppError("Title and advertiser are required.", 400);
    const advertisement = await Advertisement.create({ ...normalized, createdBy: admin.id, updatedBy: admin.id });
    await invalidateActiveAdCache();
    await recordAuditEvent({ actorUserId: admin.id, actorSnapshot: admin, action: "advertisement.created", targetType: "Advertisement", targetId: advertisement._id, metadata: { type: advertisement.type, status: advertisement.status } });
    return advertisement.toObject();
};

export const updateAdvertisement = async (id, payload, admin) => {
    const current = await Advertisement.findById(id);
    if (!current) throw new AppError("Advertisement not found.", 404);
    const normalized = normalizeAdvertisementPayload(payload, current);
    Object.assign(current, normalized, { updatedBy: admin.id });
    await current.save();
    await invalidateActiveAdCache();
    await recordAuditEvent({ actorUserId: admin.id, actorSnapshot: admin, action: "advertisement.updated", targetType: "Advertisement", targetId: current._id, metadata: { status: current.status } });
    return current.toObject();
};

export const archiveAdvertisement = async (id, admin) => {
    const advertisement = await Advertisement.findById(id);
    if (!advertisement) throw new AppError("Advertisement not found.", 404);
    advertisement.status = "archived";
    advertisement.archivedAt = new Date();
    advertisement.updatedBy = admin.id;
    await advertisement.save();
    await invalidateActiveAdCache();
    await recordAuditEvent({ actorUserId: admin.id, actorSnapshot: admin, action: "advertisement.archived", targetType: "Advertisement", targetId: advertisement._id });
    return advertisement.toObject();
};

export const getAdvertisementAnalytics = async (id, { startAt, endAt, type } = {}) => {
    if (id) await getAdvertisement(id);
    const match = {};
    if (id) match.advertisementId = new mongoose.Types.ObjectId(id);
    if (type && !["banner", "audio"].includes(type)) throw new AppError("Invalid advertisement type filter.", 400);
    if (type) match.adType = type;
    if (startAt || endAt) {
        const startDate = startAt ? new Date(startAt) : null;
        const endDate = endAt ? new Date(endAt) : null;
        if ((startDate && !Number.isFinite(startDate.getTime())) || (endDate && !Number.isFinite(endDate.getTime()))) throw new AppError("Invalid analytics date range.", 400);
        match.occurredAt = {};
        if (startDate) match.occurredAt.$gte = startDate;
        if (endDate) match.occurredAt.$lte = endDate;
    }
    const [rows, dailyRows] = await Promise.all([
        AdEvent.aggregate([
            { $match: match },
            { $group: { _id: "$type", count: { $sum: 1 } } },
        ]),
        AdEvent.aggregate([
            { $match: match },
            {
                $group: {
                    _id: {
                        date: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$occurredAt",
                                timezone: "Asia/Ho_Chi_Minh",
                            },
                        },
                        type: "$type",
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { "_id.date": 1 } },
        ]),
    ]);
    const counts = Object.fromEntries(rows.map((row) => [row._id, row.count]));
    const timeline = dailyRows.reduce((result, row) => {
        const date = row._id.date;
        result[date] ||= {
            date,
            started: 0,
            impressions: 0,
            clicks: 0,
            completes: 0,
            skips: 0,
        };
        const field = {
            started: "started",
            impression: "impressions",
            click: "clicks",
            complete: "completes",
            skip: "skips",
        }[row._id.type];
        if (field) result[date][field] = row.count;
        return result;
    }, {});

    return {
        ...calculateAnalytics(counts),
        eventBreakdown: counts,
        timeline: Object.values(timeline),
    };
};

export default { decideAdvertisement, recordAdvertisementEvent, listAdvertisements, getAdvertisement, createAdvertisement, updateAdvertisement, archiveAdvertisement, getAdvertisementAnalytics, invalidateActiveAdCache };
