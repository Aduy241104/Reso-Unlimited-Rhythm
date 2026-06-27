import bcrypt from "bcrypt";
import dotenv from "dotenv";
import mongoose from "mongoose";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { EJSON } from "bson";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import models from "./models/index.js";

dotenv.config();
dayjs.extend(utc);
dayjs.extend(timezone);

const {
    Album,
    Artist,
    ArtistDailyRanking,
    ArtistDailyStat,
    ArtistMonthlyRanking,
    ArtistMonthlyStat,
    ArtistRequest,
    ArtistRevenueSummary,
    ArtistStat,
    ArtistVerificationRequest,
    Genre,
    Interaction,
    ListenEvent,
    Notification,
    Plan,
    PlatformMonthlyStat,
    Playlist,
    RefreshToken,
    ReleaseSchedule,
    Report,
    RevenuePeriod,
    SearchEvent,
    Subscription,
    Track,
    TrackDailyRanking,
    TrackDailyStat,
    TrackMonthlyRanking,
    TrackMonthlyStat,
    Transaction,
    User,
    VerificationToken,
    WithdrawalRequest,
} = models;

const ANALYTICS_TIMEZONE =
    process.env.ANALYTICS_TIMEZONE ||
    process.env.CRON_TIMEZONE ||
    "Asia/Ho_Chi_Minh";

const ALL_MODELS = [
    Plan,
    User,
    Genre,
    Artist,
    ArtistRequest,
    ArtistVerificationRequest,
    ArtistStat,
    ArtistDailyStat,
    ArtistDailyRanking,
    ArtistMonthlyStat,
    ArtistMonthlyRanking,
    Album,
    Track,
    TrackDailyStat,
    TrackDailyRanking,
    TrackMonthlyStat,
    TrackMonthlyRanking,
    Playlist,
    Subscription,
    Transaction,
    RefreshToken,
    VerificationToken,
    SearchEvent,
    ListenEvent,
    Interaction,
    Notification,
    Report,
    ReleaseSchedule,
    PlatformMonthlyStat,
    RevenuePeriod,
    ArtistRevenueSummary,
    WithdrawalRequest,
];

const oid = (value) => new mongoose.Types.ObjectId(value);
const objectIdToString = (value) => String(value instanceof mongoose.Types.ObjectId ? value : value?._id || value);

const buildSeedObjectId = (bucket, index) =>
    new mongoose.Types.ObjectId(
        `6826${bucket.toString(16).padStart(4, "0")}00000000${index
            .toString(16)
            .padStart(8, "0")}`
    );

const createIdFactory = (bucket) => {
    let index = 1;

    return () => buildSeedObjectId(bucket, index++);
};

const ids = {
    planFree: oid("682600000000000000000001"),
    planPremium: oid("682600000000000000000002"),

    userAdmin: oid("682600000000000000000101"),
    userArtistOne: oid("682600000000000000000102"),
    userArtistTwo: oid("682600000000000000000103"),
    userArtistThree: oid("682600000000000000000104"),
    userListenerOne: oid("682600000000000000000105"),
    userListenerTwo: oid("682600000000000000000106"),
    userListenerThree: oid("682600000000000000000107"),
    userApplicant: oid("682600000000000000000108"),

    genreLofi: oid("682600000000000000000201"),
    genrePop: oid("682600000000000000000202"),
    genreElectronic: oid("682600000000000000000203"),
    genreRnB: oid("682600000000000000000204"),

    artistOne: oid("682600000000000000000301"),
    artistTwo: oid("682600000000000000000302"),
    artistThree: oid("682600000000000000000303"),
    artistRequest: oid("682600000000000000000304"),
    artistVerificationRequest: oid("682600000000000000000305"),

    albumOne: oid("682600000000000000000401"),
    albumTwo: oid("682600000000000000000402"),

    trackStay: oid("682600000000000000000501"),
    trackLiem: oid("682600000000000000000502"),
    trackMidnightDrive: oid("682600000000000000000503"),
    trackSignalReset: oid("682600000000000000000504"),
    trackEchoBloom: oid("682600000000000000000505"),
    trackCafeSauMua: oid("682600000000000000000506"),

    playlistMain: oid("682600000000000000000601"),
    subscriptionMain: oid("682600000000000000000701"),
    transactionMain: oid("682600000000000000000702"),
    refreshTokenMain: oid("682600000000000000000801"),
    verificationTokenMain: oid("682600000000000000000802"),
    searchEventMain: oid("682600000000000000000901"),
    searchEventSecond: oid("682600000000000000000902"),
    interactionTrackLikeOne: oid("682600000000000000000a01"),
    interactionTrackLikeTwo: oid("682600000000000000000a02"),
    interactionTrackLikeThree: oid("682600000000000000000a03"),
    interactionArtistFollowOne: oid("682600000000000000000a04"),
    interactionArtistFollowTwo: oid("682600000000000000000a05"),
    notificationPremium: oid("682600000000000000000b01"),
    notificationGlobal: oid("682600000000000000000b02"),
    notificationArtist: oid("682600000000000000000b03"),
    reportMain: oid("682600000000000000000c01"),
    releaseScheduleMain: oid("682600000000000000000c02"),
    platformMonthlyStat: oid("682600000000000000000d01"),
    revenuePeriodMain: oid("682600000000000000000d02"),
    artistRevenueSummaryOne: oid("682600000000000000000d03"),
    artistRevenueSummaryTwo: oid("682600000000000000000d04"),
    artistRevenueSummaryThree: oid("682600000000000000000d05"),
    withdrawalRequestMain: oid("682600000000000000000d06"),
    artistStatOne: oid("682600000000000000000d07"),
    artistStatTwo: oid("682600000000000000000d08"),
    artistStatThree: oid("682600000000000000000d09"),
};

const nextListenEventId = createIdFactory(0xe01);
const nextTrackDailyStatId = createIdFactory(0xe11);
const nextTrackDailyRankingId = createIdFactory(0xe21);
const nextTrackMonthlyStatId = createIdFactory(0xe31);
const nextTrackMonthlyRankingId = createIdFactory(0xe41);
const nextArtistDailyStatId = createIdFactory(0xe51);
const nextArtistDailyRankingId = createIdFactory(0xe61);
const nextArtistMonthlyStatId = createIdFactory(0xe71);
const nextArtistMonthlyRankingId = createIdFactory(0xe81);

const SOURCE_ROTATION = ["track_detail", "playlist", "search", "artist_profile", "album"];
const DEVICE_ROTATION = ["web", "android", "ios"];
const COUNTRY_ROTATION = ["Vietnam", "Vietnam", "Singapore", "Japan"];
const VALID_LISTEN_RATIOS = [1, 0.96, 0.93, 0.9, 0.87, 0.84];
const INVALID_LISTEN_RATIOS = [0.22, 0.27, 0.31];

const getAnalyticsNow = () => dayjs().tz(ANALYTICS_TIMEZONE);
const buildStoredDayDate = (dateKey) => dayjs.utc(`${dateKey}T00:00:00Z`).toDate();
const buildDateKey = (dateValue) => dayjs(dateValue).tz(ANALYTICS_TIMEZONE).format("YYYY-MM-DD");
const startOfDay = (dateValue) => dayjs(dateValue).tz(ANALYTICS_TIMEZONE).startOf("day");

const buildFallbackAudioFiles = (slug) => [
    {
        url: `https://example.com/demo-audio/${slug}-original.mp3`,
        format: "mp3",
        bitrate: 320,
        label: "original",
        priority: 5,
    },
    {
        url: `https://example.com/demo-audio/${slug}-high.mp3`,
        format: "mp3",
        bitrate: 192,
        label: "high",
        priority: 4,
    },
];

const sanitizeAudioFiles = (audioFiles, fallbackSlug) => {
    const normalized = Array.isArray(audioFiles)
        ? audioFiles
            .map((item) => ({
                url: item?.url || "",
                format: item?.format || "mp3",
                bitrate: Number(item?.bitrate || 320),
                label: item?.label || "original",
                priority: Number(item?.priority || 1),
            }))
            .filter((item) => Boolean(item.url))
        : [];

    return normalized.length > 0 ? normalized : buildFallbackAudioFiles(fallbackSlug);
};

const sanitizeCopyright = (copyright = {}) => ({
    copyrightOwner: String(copyright?.copyrightOwner || ""),
    recordingOwner: String(copyright?.recordingOwner || ""),
    composer: String(copyright?.composer || ""),
    lyricist: String(copyright?.lyricist || ""),
    producer: String(copyright?.producer || ""),
    isOriginal: Boolean(copyright?.isOriginal ?? true),
    isCover: Boolean(copyright?.isCover ?? false),
    isRemix: Boolean(copyright?.isRemix ?? false),
    usesSample: Boolean(copyright?.usesSample ?? false),
    usesLicensedBeat: Boolean(copyright?.usesLicensedBeat ?? false),
    originalTrackTitle: String(copyright?.originalTrackTitle || ""),
    originalArtistName: String(copyright?.originalArtistName || ""),
    licenseDocumentUrls: Array.isArray(copyright?.licenseDocumentUrls)
        ? copyright.licenseDocumentUrls.filter(Boolean)
        : [],
    declarationAccepted: Boolean(copyright?.declarationAccepted ?? true),
    copyrightStatus: ["pending", "verified", "rejected", "disputed"].includes(
        copyright?.copyrightStatus
    )
        ? copyright.copyrightStatus
        : "verified",
    copyrightNote: String(copyright?.copyrightNote || ""),
});

const sortByStreamPerformance = (left, right, idSelector) => {
    if (right.playCount !== left.playCount) {
        return right.playCount - left.playCount;
    }

    if (right.uniqueListeners !== left.uniqueListeners) {
        return right.uniqueListeners - left.uniqueListeners;
    }

    return String(idSelector(left)).localeCompare(String(idSelector(right)));
};

const roundCurrency = (value) => Math.round(value);

const allocateIntegers = (total, weights) => {
    const safeWeights = weights.map((item) => ({
        ...item,
        weight: Number(item.weight || 0),
    }));
    const totalWeight = safeWeights.reduce((sum, item) => sum + item.weight, 0);

    if (totalWeight <= 0) {
        return new Map(safeWeights.map((item) => [item.key, 0]));
    }

    const preliminary = safeWeights.map((item) => {
        const raw = (total * item.weight) / totalWeight;
        return {
            key: item.key,
            floor: Math.floor(raw),
            remainder: raw - Math.floor(raw),
        };
    });

    let allocated = preliminary.reduce((sum, item) => sum + item.floor, 0);
    const remaining = total - allocated;
    preliminary
        .sort((left, right) => right.remainder - left.remainder)
        .slice(0, remaining)
        .forEach((item) => {
            item.floor += 1;
            allocated += 1;
        });

    return new Map(preliminary.map((item) => [item.key, item.floor]));
};

const chunkRemainderAcrossDays = (remainder, dayKeys) => {
    if (dayKeys.length === 0) {
        return {};
    }

    const base = Math.floor(remainder / dayKeys.length);
    let carry = remainder % dayKeys.length;

    return Object.fromEntries(
        dayKeys.map((dayKey) => {
            const value = base + (carry > 0 ? 1 : 0);
            if (carry > 0) {
                carry -= 1;
            }
            return [dayKey, value];
        })
    );
};

const buildTrackBlueprints = (templates, rankingDay, previousDay, monthStart) => {
    const templateStay = templates[0] || {};
    const templateLiem = templates[1] || {};

    const earlierDayCandidates = [
        monthStart.add(2, "day"),
        monthStart.add(7, "day"),
        monthStart.add(12, "day"),
        monthStart.add(17, "day"),
    ].filter((item) => item.isBefore(previousDay));

    const earlierDays =
        earlierDayCandidates.length > 0 ? earlierDayCandidates : [monthStart.add(1, "day")];
    const earlierDayKeys = earlierDays.map((item) => item.format("YYYY-MM-DD"));
    const previousDayKey = previousDay.format("YYYY-MM-DD");
    const rankingDayKey = rankingDay.format("YYYY-MM-DD");

    const baseBlueprints = [
        {
            trackId: ids.trackStay,
            artistId: ids.artistOne,
            albumId: null,
            title: templateStay.title || "STAY",
            duration: Number(templateStay.duration || 139),
            avatar:
                templateStay.avatar ||
                "https://images.unsplash.com/photo-1501386761578-eac5c94b800a",
            coverImage:
                Array.isArray(templateStay.coverImage) && templateStay.coverImage.length > 0
                    ? templateStay.coverImage
                    : ["https://images.unsplash.com/photo-1501386761578-eac5c94b800a"],
            audioFiles: sanitizeAudioFiles(templateStay.audioFiles, "stay-demo"),
            lyricsSyncUrl: templateStay.lyricsSyncUrl || "",
            copyright: sanitizeCopyright(templateStay.copyright),
            genreIds: [ids.genrePop, ids.genreLofi],
            releaseDate: rankingDay.subtract(24, "day").toDate(),
            totalLike: 73,
            listenerPool: [ids.userListenerOne, ids.userListenerTwo, ids.userListenerThree],
            monthlyValidStreams: 118,
            previousDayValidStreams: 18,
            rankingDayValidStreams: 15,
            invalidSkipsByDay: {
                [previousDayKey]: 2,
                [rankingDayKey]: 2,
            },
        },
        {
            trackId: ids.trackLiem,
            artistId: ids.artistTwo,
            albumId: null,
            title: templateLiem.title || "Liem",
            duration: Number(templateLiem.duration || 335),
            avatar:
                templateLiem.avatar ||
                "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3",
            coverImage:
                Array.isArray(templateLiem.coverImage) && templateLiem.coverImage.length > 0
                    ? templateLiem.coverImage
                    : ["https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3"],
            audioFiles: sanitizeAudioFiles(templateLiem.audioFiles, "liem-demo"),
            lyricsSyncUrl: templateLiem.lyricsSyncUrl || "",
            copyright: sanitizeCopyright(templateLiem.copyright),
            genreIds: [ids.genrePop, ids.genreRnB],
            releaseDate: rankingDay.subtract(18, "day").toDate(),
            totalLike: 64,
            listenerPool: [ids.userListenerOne, ids.userListenerTwo, ids.userListenerThree],
            monthlyValidStreams: 112,
            previousDayValidStreams: 16,
            rankingDayValidStreams: 19,
            invalidSkipsByDay: {
                [previousDayKey]: 2,
                [rankingDayKey]: 1,
            },
        },
        {
            trackId: ids.trackMidnightDrive,
            artistId: ids.artistOne,
            albumId: ids.albumOne,
            title: "Midnight Drive",
            duration: 214,
            avatar: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f",
            coverImage: ["https://images.unsplash.com/photo-1511379938547-c1f69419868d"],
            audioFiles: buildFallbackAudioFiles("midnight-drive"),
            lyricsSyncUrl: "",
            copyright: sanitizeCopyright({
                copyrightOwner: "Reso Demo Publishing",
                recordingOwner: "Demo Artist One",
                composer: "Demo Artist One",
                lyricist: "Demo Artist One",
                producer: "Reso Demo Lab",
                declarationAccepted: true,
                copyrightStatus: "verified",
            }),
            genreIds: [ids.genreElectronic, ids.genreLofi],
            releaseDate: rankingDay.subtract(16, "day").toDate(),
            totalLike: 51,
            listenerPool: [ids.userListenerOne, ids.userListenerTwo, ids.userListenerThree],
            monthlyValidStreams: 93,
            previousDayValidStreams: 12,
            rankingDayValidStreams: 11,
            invalidSkipsByDay: {
                [previousDayKey]: 1,
                [rankingDayKey]: 1,
            },
        },
        {
            trackId: ids.trackEchoBloom,
            artistId: ids.artistThree,
            albumId: ids.albumTwo,
            title: "Echo Bloom",
            duration: 201,
            avatar: "https://images.unsplash.com/photo-1516280440614-37939bbacd81",
            coverImage: ["https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4"],
            audioFiles: buildFallbackAudioFiles("echo-bloom"),
            lyricsSyncUrl: "",
            copyright: sanitizeCopyright({
                copyrightOwner: "Reso Demo Publishing",
                recordingOwner: "Demo Artist Three",
                composer: "Demo Artist Three",
                lyricist: "Demo Artist Three",
                producer: "Reso Demo Lab",
                declarationAccepted: true,
                copyrightStatus: "verified",
            }),
            genreIds: [ids.genrePop, ids.genreElectronic],
            releaseDate: rankingDay.subtract(14, "day").toDate(),
            totalLike: 46,
            listenerPool: [ids.userListenerOne, ids.userListenerTwo, ids.userListenerThree],
            monthlyValidStreams: 81,
            previousDayValidStreams: 10,
            rankingDayValidStreams: 13,
            invalidSkipsByDay: {
                [previousDayKey]: 1,
                [rankingDayKey]: 1,
            },
        },
        {
            trackId: ids.trackSignalReset,
            artistId: ids.artistTwo,
            albumId: null,
            title: "Signal Reset",
            duration: 188,
            avatar: "https://images.unsplash.com/photo-1460364157752-926555421a7e",
            coverImage: ["https://images.unsplash.com/photo-1487180144351-b8472da7d491"],
            audioFiles: buildFallbackAudioFiles("signal-reset"),
            lyricsSyncUrl: "",
            copyright: sanitizeCopyright({
                copyrightOwner: "Reso Demo Publishing",
                recordingOwner: "Demo Artist Two",
                composer: "Demo Artist Two",
                lyricist: "Demo Artist Two",
                producer: "Reso Demo Lab",
                declarationAccepted: true,
                copyrightStatus: "verified",
            }),
            genreIds: [ids.genreElectronic, ids.genrePop],
            releaseDate: rankingDay.subtract(8, "day").toDate(),
            totalLike: 31,
            listenerPool: [ids.userListenerOne, ids.userListenerTwo],
            monthlyValidStreams: 52,
            previousDayValidStreams: 7,
            rankingDayValidStreams: 5,
            invalidSkipsByDay: {
                [previousDayKey]: 1,
                [rankingDayKey]: 1,
            },
        },
        {
            trackId: ids.trackCafeSauMua,
            artistId: ids.artistThree,
            albumId: ids.albumTwo,
            title: "Cafe Sau Mua",
            duration: 227,
            avatar: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
            coverImage: ["https://images.unsplash.com/photo-1500534314209-a25ddb2bd429"],
            audioFiles: buildFallbackAudioFiles("cafe-sau-mua"),
            lyricsSyncUrl: "",
            copyright: sanitizeCopyright({
                copyrightOwner: "Reso Demo Publishing",
                recordingOwner: "Demo Artist Three",
                composer: "Demo Artist Three",
                lyricist: "Demo Artist Three",
                producer: "Reso Demo Lab",
                declarationAccepted: true,
                copyrightStatus: "verified",
            }),
            genreIds: [ids.genreLofi, ids.genreRnB],
            releaseDate: rankingDay.subtract(5, "day").toDate(),
            totalLike: 24,
            listenerPool: [ids.userListenerTwo, ids.userListenerThree],
            monthlyValidStreams: 36,
            previousDayValidStreams: 4,
            rankingDayValidStreams: 6,
            invalidSkipsByDay: {
                [previousDayKey]: 1,
                [rankingDayKey]: 1,
            },
        },
    ];

    return baseBlueprints.map((blueprint) => {
        const remaining =
            blueprint.monthlyValidStreams -
            blueprint.previousDayValidStreams -
            blueprint.rankingDayValidStreams;
        const earlierDistribution = chunkRemainderAcrossDays(remaining, earlierDayKeys);

        return {
            ...blueprint,
            dayPlans: {
                ...earlierDistribution,
                [previousDayKey]: blueprint.previousDayValidStreams,
                [rankingDayKey]: blueprint.rankingDayValidStreams,
            },
        };
    });
};

const buildTrackDocuments = (blueprints, reviewedBy) =>
    blueprints.map((blueprint) => ({
        _id: blueprint.trackId,
        title: blueprint.title,
        artist_artistId: blueprint.artistId,
        album_albumId: blueprint.albumId,
        genreIds: blueprint.genreIds,
        audioFiles: blueprint.audioFiles,
        duration: blueprint.duration,
        avatar: blueprint.avatar,
        coverImage: blueprint.coverImage,
        lyricsStatic: "",
        lyricsSyncUrl: blueprint.lyricsSyncUrl,
        stats: {
            totalLike: blueprint.totalLike,
            totalPlay: blueprint.monthlyValidStreams + 25,
        },
        releaseDate: blueprint.releaseDate,
        activeStatus: "active",
        approvalStatus: "approved",
        copyright: blueprint.copyright,
        moderation: {
            submittedAt: dayjs(blueprint.releaseDate).subtract(2, "day").toDate(),
            reviewedBy,
            reviewedAt: dayjs(blueprint.releaseDate).subtract(1, "day").toDate(),
            adminNote: "Approved in demo dataset.",
            violationFlags: [],
        },
        rejectReason: "",
        blockedReason: "",
        hiddenReason: "",
    }));

const buildListenEvents = (blueprints) => {
    const events = [];
    const userDayOrder = new Map();

    blueprints.forEach((blueprint, blueprintIndex) => {
        Object.entries(blueprint.dayPlans).forEach(([dateKey, validCount], dayIndex) => {
            const dayStart = dayjs.tz(`${dateKey}T00:00:00`, ANALYTICS_TIMEZONE);

            for (let index = 0; index < validCount; index += 1) {
                const userId = blueprint.listenerPool[index % blueprint.listenerPool.length];
                const ratio = VALID_LISTEN_RATIOS[(index + blueprintIndex) % VALID_LISTEN_RATIOS.length];
                const listenedDuration = Math.max(1, Math.round(blueprint.duration * ratio));
                const listenPercent = Math.min(
                    100,
                    Number(((listenedDuration / blueprint.duration) * 100).toFixed(2))
                );
                const orderKey = `${String(userId)}:${dateKey}`;
                const nextOrder = (userDayOrder.get(orderKey) || 0) + 1;
                userDayOrder.set(orderKey, nextOrder);

                events.push({
                    _id: nextListenEventId(),
                    userId,
                    trackId: blueprint.trackId,
                    artistId: blueprint.artistId,
                    listenedAt: dayStart
                        .add(8 + ((index + dayIndex) % 11), "hour")
                        .add((index * 7) % 60, "minute")
                        .toDate(),
                    trackDuration: blueprint.duration,
                    listenedDuration,
                    listenPercent,
                    dailyListenOrder: nextOrder,
                    requiredPercent: 50,
                    source: SOURCE_ROTATION[(index + blueprintIndex) % SOURCE_ROTATION.length],
                    isValidStream: true,
                    duration: listenedDuration,
                    completed: listenPercent >= 80,
                    skipped: false,
                    device: DEVICE_ROTATION[(index + blueprintIndex) % DEVICE_ROTATION.length],
                    country: COUNTRY_ROTATION[(index + dayIndex) % COUNTRY_ROTATION.length],
                });
            }

            const skippedCount = Number(blueprint.invalidSkipsByDay?.[dateKey] || 0);

            for (let index = 0; index < skippedCount; index += 1) {
                const userId = blueprint.listenerPool[(index + 1) % blueprint.listenerPool.length];
                const ratio = INVALID_LISTEN_RATIOS[(index + blueprintIndex) % INVALID_LISTEN_RATIOS.length];
                const listenedDuration = Math.max(1, Math.round(blueprint.duration * ratio));
                const listenPercent = Math.min(
                    100,
                    Number(((listenedDuration / blueprint.duration) * 100).toFixed(2))
                );
                const orderKey = `${String(userId)}:${dateKey}`;
                const nextOrder = (userDayOrder.get(orderKey) || 0) + 1;
                userDayOrder.set(orderKey, nextOrder);

                events.push({
                    _id: nextListenEventId(),
                    userId,
                    trackId: blueprint.trackId,
                    artistId: blueprint.artistId,
                    listenedAt: dayStart
                        .add(20 + ((index + blueprintIndex) % 3), "hour")
                        .add((index * 13) % 60, "minute")
                        .toDate(),
                    trackDuration: blueprint.duration,
                    listenedDuration,
                    listenPercent,
                    dailyListenOrder: nextOrder,
                    requiredPercent: 50,
                    source: SOURCE_ROTATION[(index + 2) % SOURCE_ROTATION.length],
                    isValidStream: false,
                    duration: listenedDuration,
                    completed: false,
                    skipped: true,
                    device: DEVICE_ROTATION[(index + 1) % DEVICE_ROTATION.length],
                    country: COUNTRY_ROTATION[(index + 2) % COUNTRY_ROTATION.length],
                });
            }
        });
    });

    return events.sort((left, right) => left.listenedAt - right.listenedAt);
};

const buildTrackDailyStats = (events) => {
    const map = new Map();

    events.forEach((event) => {
        const dateKey = buildDateKey(event.listenedAt);
        const key = `${String(event.trackId)}:${dateKey}`;
        const current =
            map.get(key) ||
            {
                _id: nextTrackDailyStatId(),
                trackId: event.trackId,
                dateKey,
                date: buildStoredDayDate(dateKey),
                playCount: 0,
                uniqueListeners: new Set(),
                totalValidDuration: 0,
                skipCount: 0,
            };

        if (event.isValidStream) {
            current.playCount += 1;
            current.uniqueListeners.add(String(event.userId));
            current.totalValidDuration += Number(event.duration || 0);
        }

        if (event.skipped) {
            current.skipCount += 1;
        }

        map.set(key, current);
    });

    return [...map.values()]
        .map((item) => ({
            _id: item._id,
            trackId: item.trackId,
            dateKey: item.dateKey,
            date: item.date,
            playCount: item.playCount,
            uniqueListeners: item.uniqueListeners.size,
            averageListenDuration:
                item.playCount > 0 ? Math.round(item.totalValidDuration / item.playCount) : 0,
            skipCount: item.skipCount,
        }))
        .sort((left, right) => left.dateKey.localeCompare(right.dateKey));
};

const buildTrackDailyRankings = (trackDailyStats, rankingDateKeys) => {
    const statsByDate = new Map();

    trackDailyStats.forEach((stat) => {
        if (!statsByDate.has(stat.dateKey)) {
            statsByDate.set(stat.dateKey, []);
        }
        statsByDate.get(stat.dateKey).push(stat);
    });

    const rankingDocs = [];
    let previousRankMap = new Map();

    rankingDateKeys.forEach((dateKey) => {
        const stats = (statsByDate.get(dateKey) || [])
            .filter((item) => item.playCount > 0)
            .sort((left, right) => sortByStreamPerformance(left, right, (item) => item.trackId));

        const rankings = stats.map((stat, index) => {
            const previousRank = previousRankMap.get(String(stat.trackId)) ?? null;
            const rank = index + 1;
            const rankChange = previousRank ? previousRank - rank : 0;

            return {
                trackId: stat.trackId,
                playCount: stat.playCount,
                uniqueListeners: stat.uniqueListeners,
                averageListenDuration: stat.averageListenDuration,
                skipCount: stat.skipCount,
                rank,
                previousRank,
                rankChange,
                rankTrend: previousRank
                    ? rankChange > 0
                        ? "up"
                        : rankChange < 0
                            ? "down"
                            : "same"
                    : "new",
            };
        });

        previousRankMap = new Map(
            rankings.map((item) => [String(item.trackId), item.rank])
        );

        rankingDocs.push({
            _id: nextTrackDailyRankingId(),
            dateKey,
            date: buildStoredDayDate(dateKey),
            rankings,
        });
    });

    return rankingDocs;
};

const buildTrackMonthlyStats = (events, year, month) => {
    const map = new Map();

    events
        .filter((event) => event.isValidStream)
        .forEach((event) => {
            const key = String(event.trackId);
            const current =
                map.get(key) ||
                {
                    _id: nextTrackMonthlyStatId(),
                    trackId: event.trackId,
                    year,
                    month,
                    playCount: 0,
                    uniqueListeners: new Set(),
                };

            current.playCount += 1;
            current.uniqueListeners.add(String(event.userId));
            map.set(key, current);
        });

    return [...map.values()]
        .map((item) => ({
            _id: item._id,
            trackId: item.trackId,
            year: item.year,
            month: item.month,
            playCount: item.playCount,
            uniqueListeners: item.uniqueListeners.size,
            revenue: {
                eligibleStreams: 0,
                revenueAmount: 0,
                artistRevenueAmount: 0,
                calculatedAt: null,
            },
        }))
        .sort((left, right) => sortByStreamPerformance(left, right, (item) => item.trackId));
};

const buildTrackMonthlyRankingDocument = (trackMonthlyStats, year, month) => ({
    _id: nextTrackMonthlyRankingId(),
    year,
    month,
    rankings: [...trackMonthlyStats]
        .sort((left, right) => sortByStreamPerformance(left, right, (item) => item.trackId))
        .map((item, index) => ({
            trackId: item.trackId,
            playCount: item.playCount,
            uniqueListeners: item.uniqueListeners,
            rank: index + 1,
        })),
});

const buildArtistDailyStats = (events) => {
    const map = new Map();

    events
        .filter((event) => event.isValidStream)
        .forEach((event) => {
            const dateKey = buildDateKey(event.listenedAt);
            const key = `${String(event.artistId)}:${dateKey}`;
            const current =
                map.get(key) ||
                {
                    _id: nextArtistDailyStatId(),
                    artistId: event.artistId,
                    dateKey,
                    date: buildStoredDayDate(dateKey),
                    streamCount: 0,
                    uniqueListeners: new Set(),
                };

            current.streamCount += 1;
            current.uniqueListeners.add(String(event.userId));
            map.set(key, current);
        });

    return [...map.values()]
        .map((item) => ({
            _id: item._id,
            artistId: item.artistId,
            dateKey: item.dateKey,
            date: item.date,
            streamCount: item.streamCount,
            uniqueListeners: item.uniqueListeners.size,
        }))
        .sort((left, right) => left.dateKey.localeCompare(right.dateKey));
};

const buildArtistRankingStats = (events, dateKey) => {
    const map = new Map();

    events
        .filter((event) => event.isValidStream && buildDateKey(event.listenedAt) === dateKey)
        .forEach((event) => {
            const key = String(event.artistId);
            const current =
                map.get(key) ||
                {
                    artistId: event.artistId,
                    playCount: 0,
                    uniqueListeners: new Set(),
                    completedPlayCount: 0,
                    totalTracksPlayed: new Set(),
                };

            current.playCount += 1;
            current.uniqueListeners.add(String(event.userId));
            current.totalTracksPlayed.add(String(event.trackId));
            if (event.completed) {
                current.completedPlayCount += 1;
            }
            map.set(key, current);
        });

    return [...map.values()].map((item) => ({
        artistId: item.artistId,
        playCount: item.playCount,
        uniqueListeners: item.uniqueListeners.size,
        completedPlayCount: item.completedPlayCount,
        totalTracksPlayed: item.totalTracksPlayed.size,
        score: item.uniqueListeners.size * 5 + item.completedPlayCount + item.playCount * 0.5,
    }));
};

const buildArtistDailyRankingDocuments = (events, rankingDateKeys) =>
    rankingDateKeys.map((dateKey) => ({
        _id: nextArtistDailyRankingId(),
        dateKey,
        date: buildStoredDayDate(dateKey),
        rankings: buildArtistRankingStats(events, dateKey)
            .sort((left, right) => {
                if (right.score !== left.score) {
                    return right.score - left.score;
                }
                if (right.uniqueListeners !== left.uniqueListeners) {
                    return right.uniqueListeners - left.uniqueListeners;
                }
                if (right.playCount !== left.playCount) {
                    return right.playCount - left.playCount;
                }
                return String(left.artistId).localeCompare(String(right.artistId));
            })
            .map((item, index) => ({
                artistId: item.artistId,
                playCount: item.playCount,
                uniqueListeners: item.uniqueListeners,
                completedPlayCount: item.completedPlayCount,
                totalTracksPlayed: item.totalTracksPlayed,
                score: item.score,
                rank: index + 1,
            })),
    }));

const buildArtistMonthlyStats = (events, year, month, followerTotalsByArtist) => {
    const map = new Map();

    events
        .filter((event) => event.isValidStream)
        .forEach((event) => {
            const key = String(event.artistId);
            const current =
                map.get(key) ||
                {
                    _id: nextArtistMonthlyStatId(),
                    artistId: event.artistId,
                    year,
                    month,
                    totalStreams: 0,
                };

            current.totalStreams += 1;
            map.set(key, current);
        });

    return [...map.values()].map((item, index) => ({
        _id: item._id,
        artistId: item.artistId,
        year,
        month,
        newFollowers: [42, 28, 19][index] || 12,
        totalFollowers: followerTotalsByArtist.get(String(item.artistId)) || 0,
        totalStreams: item.totalStreams,
        revenueAmount: 0,
    }));
};

const buildArtistMonthlyRankingDocument = (events, year, month) => {
    const map = new Map();

    events
        .filter((event) => event.isValidStream)
        .forEach((event) => {
            const key = String(event.artistId);
            const current =
                map.get(key) ||
                {
                    artistId: event.artistId,
                    playCount: 0,
                    uniqueListeners: new Set(),
                    completedPlayCount: 0,
                    totalTracksPlayed: new Set(),
                };

            current.playCount += 1;
            current.uniqueListeners.add(String(event.userId));
            current.totalTracksPlayed.add(String(event.trackId));
            if (event.completed) {
                current.completedPlayCount += 1;
            }
            map.set(key, current);
        });

    const rankings = [...map.values()]
        .map((item) => ({
            artistId: item.artistId,
            playCount: item.playCount,
            uniqueListeners: item.uniqueListeners.size,
            completedPlayCount: item.completedPlayCount,
            totalTracksPlayed: item.totalTracksPlayed.size,
            score: item.uniqueListeners.size * 5 + item.completedPlayCount + item.playCount * 0.5,
        }))
        .sort((left, right) => {
            if (right.score !== left.score) {
                return right.score - left.score;
            }
            if (right.uniqueListeners !== left.uniqueListeners) {
                return right.uniqueListeners - left.uniqueListeners;
            }
            if (right.playCount !== left.playCount) {
                return right.playCount - left.playCount;
            }
            return String(left.artistId).localeCompare(String(right.artistId));
        })
        .map((item, index) => ({
            artistId: item.artistId,
            playCount: item.playCount,
            uniqueListeners: item.uniqueListeners,
            completedPlayCount: item.completedPlayCount,
            totalTracksPlayed: item.totalTracksPlayed,
            score: item.score,
            rank: index + 1,
        }));

    return {
        _id: nextArtistMonthlyRankingId(),
        year,
        month,
        rankings,
    };
};

const buildPlatformMonthlyStat = ({
    events,
    year,
    month,
    monthStart,
    nextMonthStart,
    trackDocs,
    listenerUserIds,
}) => {
    const validEvents = events.filter((event) => event.isValidStream);
    const dailyMap = new Map();
    const trackNameMap = new Map(trackDocs.map((track) => [String(track._id), track.title]));

    validEvents.forEach((event) => {
        const dateKey = buildDateKey(event.listenedAt);
        const current =
            dailyMap.get(dateKey) ||
            {
                date: dateKey,
                totalStreams: 0,
                uniqueUsers: new Set(),
                totalListeningTime: 0,
                trackCounts: new Map(),
                artistCounts: new Map(),
            };

        current.totalStreams += 1;
        current.uniqueUsers.add(String(event.userId));
        current.totalListeningTime += Number(event.duration || 0);
        current.trackCounts.set(
            String(event.trackId),
            (current.trackCounts.get(String(event.trackId)) || 0) + 1
        );
        current.artistCounts.set(
            String(event.artistId),
            (current.artistCounts.get(String(event.artistId)) || 0) + 1
        );

        dailyMap.set(dateKey, current);
    });

    return {
        _id: ids.platformMonthlyStat,
        year,
        month,
        periodStart: monthStart.toDate(),
        periodEnd: nextMonthStart.subtract(1, "millisecond").toDate(),
        userStats: {
            newUsers: listenerUserIds.length,
            totalUsers: 8,
        },
        artistStats: {
            totalArtists: 3,
        },
        streamingStats: {
            totalStreams: validEvents.length,
            trackStreams: validEvents.length,
            totalListeningTime: validEvents.reduce(
                (sum, event) => sum + Number(event.duration || 0),
                0
            ),
        },
        dailyStats: [...dailyMap.values()]
            .sort((left, right) => left.date.localeCompare(right.date))
            .map((item) => ({
                date: item.date,
                totalStreams: item.totalStreams,
                uniqueUsers: item.uniqueUsers.size,
                totalListeningTime: item.totalListeningTime,
                topTracks: [...item.trackCounts.entries()]
                    .sort((left, right) => right[1] - left[1])
                    .slice(0, 3)
                    .map(([trackId, streamCount]) => ({
                        trackId: oid(trackId),
                        title: trackNameMap.get(trackId) || "",
                        streamCount,
                    })),
                topArtists: [...item.artistCounts.entries()]
                    .sort((left, right) => right[1] - left[1])
                    .slice(0, 3)
                    .map(([artistId, streamCount]) => ({
                        artistId: oid(artistId),
                        streamCount,
                    })),
            })),
    };
};

const buildRevenueArtifacts = ({
    year,
    month,
    monthStart,
    nextMonthStart,
    adminUserId,
    trackMonthlyStats,
    trackBlueprints,
    artistMonthlyStats,
    transactionPaidAt,
}) => {
    const totalEligibleStreams = trackMonthlyStats.reduce(
        (sum, item) => sum + Number(item.playCount || 0),
        0
    );
    const totalPremiumRevenue = 1_800_000;
    const totalArtistPool = roundCurrency(totalPremiumRevenue * 0.6);
    const totalPlatformRevenue = totalPremiumRevenue - totalArtistPool;
    const trackRevenueMap = allocateIntegers(
        totalPremiumRevenue,
        trackMonthlyStats.map((item) => ({
            key: String(item.trackId),
            weight: item.playCount,
        }))
    );
    const trackArtistRevenueMap = allocateIntegers(
        totalArtistPool,
        trackMonthlyStats.map((item) => ({
            key: String(item.trackId),
            weight: item.playCount,
        }))
    );

    trackMonthlyStats.forEach((item) => {
        item.revenue = {
            eligibleStreams: item.playCount,
            revenueAmount: trackRevenueMap.get(String(item.trackId)) || 0,
            artistRevenueAmount: trackArtistRevenueMap.get(String(item.trackId)) || 0,
            calculatedAt: transactionPaidAt,
        };
    });

    const artistSummaryWeights = artistMonthlyStats.map((item) => ({
        key: String(item.artistId),
        weight: item.totalStreams,
    }));
    const artistPoolMap = allocateIntegers(totalArtistPool, artistSummaryWeights);

    const artistRevenueSummaries = [
        {
            _id: ids.artistRevenueSummaryOne,
            artistId: ids.artistOne,
            year,
            month,
            totalEligibleStreams:
                trackMonthlyStats
                    .filter((item) =>
                        [ids.trackStay, ids.trackMidnightDrive].some((trackId) =>
                            trackId.equals(item.trackId)
                        )
                    )
                    .reduce((sum, item) => sum + item.playCount, 0),
            artistRevenueAmount: artistPoolMap.get(String(ids.artistOne)) || 0,
            status: "confirmed",
            calculatedAt: transactionPaidAt,
            confirmedAt: transactionPaidAt,
            confirmedBy: adminUserId,
        },
        {
            _id: ids.artistRevenueSummaryTwo,
            artistId: ids.artistTwo,
            year,
            month,
            totalEligibleStreams:
                trackMonthlyStats
                    .filter((item) =>
                        [ids.trackLiem, ids.trackSignalReset].some((trackId) =>
                            trackId.equals(item.trackId)
                        )
                    )
                    .reduce((sum, item) => sum + item.playCount, 0),
            artistRevenueAmount: artistPoolMap.get(String(ids.artistTwo)) || 0,
            status: "confirmed",
            calculatedAt: transactionPaidAt,
            confirmedAt: transactionPaidAt,
            confirmedBy: adminUserId,
        },
        {
            _id: ids.artistRevenueSummaryThree,
            artistId: ids.artistThree,
            year,
            month,
            totalEligibleStreams:
                trackMonthlyStats
                    .filter((item) =>
                        [ids.trackEchoBloom, ids.trackCafeSauMua].some((trackId) =>
                            trackId.equals(item.trackId)
                        )
                    )
                    .reduce((sum, item) => sum + item.playCount, 0),
            artistRevenueAmount: artistPoolMap.get(String(ids.artistThree)) || 0,
            status: "confirmed",
            calculatedAt: transactionPaidAt,
            confirmedAt: transactionPaidAt,
            confirmedBy: adminUserId,
        },
    ];

    const validTrackCountByDate = new Map();

    trackBlueprints.forEach((blueprint) => {
        Object.entries(blueprint.dayPlans).forEach(([dateKey, value]) => {
            validTrackCountByDate.set(dateKey, (validTrackCountByDate.get(dateKey) || 0) + value);
        });
    });

    const premiumRevenueByDay = allocateIntegers(
        totalPremiumRevenue,
        [...validTrackCountByDate.entries()].map(([key, weight]) => ({ key, weight }))
    );
    const artistPoolByDay = allocateIntegers(
        totalArtistPool,
        [...validTrackCountByDate.entries()].map(([key, weight]) => ({ key, weight }))
    );
    const dailyStats = [...validTrackCountByDate.entries()]
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([dateKey, streamCount]) => {
            const date = dayjs.tz(`${dateKey}T00:00:00`, ANALYTICS_TIMEZONE);
            const premiumRevenue = premiumRevenueByDay.get(dateKey) || 0;
            const artistPool = artistPoolByDay.get(dateKey) || 0;
            return {
                day: date.date(),
                date: date.toDate(),
                premiumRevenue,
                artistPool,
                platformRevenue: premiumRevenue - artistPool,
                successfulTransactions: buildDateKey(transactionPaidAt) === dateKey ? 1 : 0,
            };
        });

    const revenuePeriod = {
        _id: ids.revenuePeriodMain,
        year,
        month,
        periodStart: monthStart.toDate(),
        periodEnd: nextMonthStart.subtract(1, "millisecond").toDate(),
        status: "confirmed",
        totalPremiumRevenue,
        totalArtistPool,
        totalPlatformRevenue,
        totalEligibleStreams,
        successfulTransactions: 1,
        dailyStats,
        lastAggregatedAt: transactionPaidAt,
        closedAt: transactionPaidAt,
        calculatedAt: transactionPaidAt,
        confirmedAt: transactionPaidAt,
        confirmedBy: adminUserId,
    };

    return {
        revenuePeriod,
        artistRevenueSummaries,
        totalArtistPool,
    };
};

const buildUserStatsMap = (events) => {
    const map = new Map();

    events.forEach((event) => {
        const key = String(event.userId);
        const current =
            map.get(key) ||
            {
                totalListeningTime: 0,
                totalTracksPlayed: 0,
            };

        current.totalListeningTime += Number(event.duration || 0);
        if (event.isValidStream) {
            current.totalTracksPlayed += 1;
        }
        map.set(key, current);
    });

    return map;
};

const buildDemoDocuments = async () => {
    const rankingDay = getAnalyticsNow().subtract(1, "day").startOf("day");
    const previousDay = rankingDay.subtract(1, "day");
    const monthStart = rankingDay.startOf("month");
    const nextMonthStart = monthStart.add(1, "month");
    const year = monthStart.year();
    const month = monthStart.month() + 1;
    const templatesPath = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "../Reso2.tracks.json"
    );
    const templateContent = await readFile(templatesPath, "utf8");
    const templateTracks = EJSON.parse(templateContent);

    if (!Array.isArray(templateTracks) || templateTracks.length === 0) {
        throw new Error("Reso2.tracks.json does not contain any track template.");
    }

    const trackBlueprints = buildTrackBlueprints(
        templateTracks,
        rankingDay,
        previousDay,
        monthStart
    );
    const trackDocs = buildTrackDocuments(trackBlueprints, ids.userAdmin);
    const listenEvents = buildListenEvents(trackBlueprints);
    const rankingDateKeys = [
        previousDay.format("YYYY-MM-DD"),
        rankingDay.format("YYYY-MM-DD"),
    ];
    const trackDailyStats = buildTrackDailyStats(listenEvents);
    const trackDailyRankings = buildTrackDailyRankings(trackDailyStats, rankingDateKeys);
    const trackMonthlyStats = buildTrackMonthlyStats(listenEvents, year, month);
    const trackMonthlyRanking = buildTrackMonthlyRankingDocument(trackMonthlyStats, year, month);
    const followerTotalsByArtist = new Map([
        [String(ids.artistOne), 540],
        [String(ids.artistTwo), 465],
        [String(ids.artistThree), 392],
    ]);
    const artistDailyStats = buildArtistDailyStats(listenEvents);
    const artistDailyRankings = buildArtistDailyRankingDocuments(listenEvents, rankingDateKeys);
    const artistMonthlyStats = buildArtistMonthlyStats(
        listenEvents,
        year,
        month,
        followerTotalsByArtist
    );
    const artistMonthlyRanking = buildArtistMonthlyRankingDocument(
        listenEvents,
        year,
        month
    );
    const platformMonthlyStat = buildPlatformMonthlyStat({
        events: listenEvents,
        year,
        month,
        monthStart,
        nextMonthStart,
        trackDocs,
        listenerUserIds: [ids.userListenerOne, ids.userListenerTwo, ids.userListenerThree],
    });

    const userStatsMap = buildUserStatsMap(listenEvents);
    const transactionPaidAt = rankingDay.subtract(3, "day").hour(10).minute(30).toDate();
    const { revenuePeriod, artistRevenueSummaries } = buildRevenueArtifacts({
        year,
        month,
        monthStart,
        nextMonthStart,
        adminUserId: ids.userAdmin,
        trackMonthlyStats,
        trackBlueprints,
        artistMonthlyStats,
        transactionPaidAt,
    });

    const artistRevenueMap = new Map(
        artistRevenueSummaries.map((item) => [String(item.artistId), item.artistRevenueAmount])
    );

    artistMonthlyStats.forEach((item) => {
        item.revenueAmount = artistRevenueMap.get(String(item.artistId)) || 0;
    });

    const users = [
        {
            _id: ids.userAdmin,
            email: "demo.admin@reso.local",
            password: await bcrypt.hash("Admin@123", 10),
            role: "admin",
            activeStatus: "active",
            emailVerified: true,
            avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a",
            profile: {
                fullName: "Demo Admin",
                gender: "other",
                dateOfBirth: new Date("1992-08-15"),
                country: "Vietnam",
            },
            settings: {
                language: "vi",
                notificationsEnabled: true,
                shufflePlayDefault: false,
            },
            stats: {
                totalListeningTime: 0,
                totalTracksPlayed: 0,
            },
        },
        {
            _id: ids.userArtistOne,
            email: "demo.artist.one@reso.local",
            password: await bcrypt.hash("Artist@123", 10),
            role: "artist",
            activeStatus: "active",
            emailVerified: true,
            avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
            profile: {
                fullName: "Demo Artist One",
                gender: "male",
                dateOfBirth: new Date("1996-03-22"),
                country: "Vietnam",
            },
            settings: {
                language: "vi",
                notificationsEnabled: true,
                shufflePlayDefault: true,
            },
            stats: {
                totalListeningTime: 0,
                totalTracksPlayed: 0,
            },
        },
        {
            _id: ids.userArtistTwo,
            email: "demo.artist.two@reso.local",
            password: await bcrypt.hash("Artist@123", 10),
            role: "artist",
            activeStatus: "active",
            emailVerified: true,
            avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7",
            profile: {
                fullName: "Demo Artist Two",
                gender: "male",
                dateOfBirth: new Date("1994-07-11"),
                country: "Vietnam",
            },
            settings: {
                language: "vi",
                notificationsEnabled: true,
                shufflePlayDefault: true,
            },
            stats: {
                totalListeningTime: 0,
                totalTracksPlayed: 0,
            },
        },
        {
            _id: ids.userArtistThree,
            email: "demo.artist.three@reso.local",
            password: await bcrypt.hash("Artist@123", 10),
            role: "artist",
            activeStatus: "active",
            emailVerified: true,
            avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
            profile: {
                fullName: "Demo Artist Three",
                gender: "female",
                dateOfBirth: new Date("1998-12-03"),
                country: "Vietnam",
            },
            settings: {
                language: "en",
                notificationsEnabled: true,
                shufflePlayDefault: false,
            },
            stats: {
                totalListeningTime: 0,
                totalTracksPlayed: 0,
            },
        },
        {
            _id: ids.userListenerOne,
            email: "demo.listener.one@reso.local",
            password: await bcrypt.hash("Listener@123", 10),
            role: "user",
            activeStatus: "active",
            emailVerified: true,
            avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1",
            profile: {
                fullName: "Demo Listener One",
                gender: "female",
                dateOfBirth: new Date("2000-02-14"),
                country: "Vietnam",
            },
            settings: {
                language: "vi",
                notificationsEnabled: true,
                shufflePlayDefault: false,
            },
            subscription: {
                isPremium: true,
                currentPlanId: ids.planPremium,
                premiumEndDate: rankingDay.add(27, "day").toDate(),
            },
            stats: userStatsMap.get(String(ids.userListenerOne)) || {
                totalListeningTime: 0,
                totalTracksPlayed: 0,
            },
        },
        {
            _id: ids.userListenerTwo,
            email: "demo.listener.two@reso.local",
            password: await bcrypt.hash("Listener@123", 10),
            role: "user",
            activeStatus: "active",
            emailVerified: true,
            avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9",
            profile: {
                fullName: "Demo Listener Two",
                gender: "male",
                dateOfBirth: new Date("1999-06-28"),
                country: "Vietnam",
            },
            settings: {
                language: "vi",
                notificationsEnabled: true,
                shufflePlayDefault: true,
            },
            stats: userStatsMap.get(String(ids.userListenerTwo)) || {
                totalListeningTime: 0,
                totalTracksPlayed: 0,
            },
        },
        {
            _id: ids.userListenerThree,
            email: "demo.listener.three@reso.local",
            password: await bcrypt.hash("Listener@123", 10),
            role: "user",
            activeStatus: "active",
            emailVerified: true,
            avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
            profile: {
                fullName: "Demo Listener Three",
                gender: "female",
                dateOfBirth: new Date("2001-09-09"),
                country: "Singapore",
            },
            settings: {
                language: "en",
                notificationsEnabled: true,
                shufflePlayDefault: false,
            },
            stats: userStatsMap.get(String(ids.userListenerThree)) || {
                totalListeningTime: 0,
                totalTracksPlayed: 0,
            },
        },
        {
            _id: ids.userApplicant,
            email: "demo.applicant@reso.local",
            password: await bcrypt.hash("Applicant@123", 10),
            role: "user",
            activeStatus: "active",
            emailVerified: true,
            avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d",
            profile: {
                fullName: "Demo Applicant",
                gender: "male",
                dateOfBirth: new Date("2000-05-17"),
                country: "Vietnam",
            },
            settings: {
                language: "vi",
                notificationsEnabled: true,
                shufflePlayDefault: false,
            },
            stats: {
                totalListeningTime: 0,
                totalTracksPlayed: 0,
            },
        },
    ];

    const artists = [
        {
            _id: ids.artistOne,
            userId: ids.userArtistOne,
            name: "Demo Artist One",
            bio: "Artist demo tap trung vao pop va electronic.",
            avatar: "https://images.unsplash.com/photo-1516280440614-37939bbacd81",
            coverImage: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a",
            socialLinks: {
                facebook: "https://facebook.com/demoartistone",
                instagram: "https://instagram.com/demoartistone",
                youtube: "https://youtube.com/@demoartistone",
            },
            verificationStatus: "verified",
            stats: {
                followers: 540,
                totalStreams:
                    trackDocs.find((item) => item._id.equals(ids.trackStay)).stats.totalPlay +
                    trackDocs.find((item) => item._id.equals(ids.trackMidnightDrive)).stats.totalPlay,
                monthlyListeners: 3,
            },
            revenue: {
                totalEarnedAmount: artistRevenueMap.get(String(ids.artistOne)) || 0,
                totalWithdrawnAmount: 120000,
                availableAmount:
                    (artistRevenueMap.get(String(ids.artistOne)) || 0) - 120000,
                pendingPayoutAmount: 0,
                confirmedRevenueSummaryIds: [ids.artistRevenueSummaryOne],
            },
            activeStatus: "active",
            blockedReason: "",
        },
        {
            _id: ids.artistTwo,
            userId: ids.userArtistTwo,
            name: "Demo Artist Two",
            bio: "Artist demo phu hop de test ranking co bien dong theo ngay.",
            avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7",
            coverImage: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f",
            socialLinks: {
                facebook: "https://facebook.com/demoartisttwo",
                instagram: "https://instagram.com/demoartisttwo",
                youtube: "https://youtube.com/@demoartisttwo",
            },
            verificationStatus: "verified",
            stats: {
                followers: 465,
                totalStreams:
                    trackDocs.find((item) => item._id.equals(ids.trackLiem)).stats.totalPlay +
                    trackDocs.find((item) => item._id.equals(ids.trackSignalReset)).stats.totalPlay,
                monthlyListeners: 3,
            },
            revenue: {
                totalEarnedAmount: artistRevenueMap.get(String(ids.artistTwo)) || 0,
                totalWithdrawnAmount: 0,
                availableAmount: artistRevenueMap.get(String(ids.artistTwo)) || 0,
                pendingPayoutAmount: 0,
                confirmedRevenueSummaryIds: [ids.artistRevenueSummaryTwo],
            },
            activeStatus: "active",
            blockedReason: "",
        },
        {
            _id: ids.artistThree,
            userId: ids.userArtistThree,
            name: "Demo Artist Three",
            bio: "Artist demo co album nho de test track detail, album va top chart.",
            avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
            coverImage: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4",
            socialLinks: {
                facebook: "https://facebook.com/demoartistthree",
                instagram: "https://instagram.com/demoartistthree",
                youtube: "https://youtube.com/@demoartistthree",
            },
            verificationStatus: "verified",
            stats: {
                followers: 392,
                totalStreams:
                    trackDocs.find((item) => item._id.equals(ids.trackEchoBloom)).stats.totalPlay +
                    trackDocs.find((item) => item._id.equals(ids.trackCafeSauMua)).stats.totalPlay,
                monthlyListeners: 3,
            },
            revenue: {
                totalEarnedAmount: artistRevenueMap.get(String(ids.artistThree)) || 0,
                totalWithdrawnAmount: 0,
                availableAmount: artistRevenueMap.get(String(ids.artistThree)) || 0,
                pendingPayoutAmount: 0,
                confirmedRevenueSummaryIds: [ids.artistRevenueSummaryThree],
            },
            activeStatus: "active",
            blockedReason: "",
        },
    ];

    const genres = [
        {
            _id: ids.genreLofi,
            name: "Demo Lofi",
            description: "Genre demo de test filter track calm / chill.",
            image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d",
            isActive: true,
        },
        {
            _id: ids.genrePop,
            name: "Demo Pop",
            description: "Genre demo cho top track co do pho bien cao.",
            image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f",
            isActive: true,
        },
        {
            _id: ids.genreElectronic,
            name: "Demo Electronic",
            description: "Genre demo cho track ranking va album.",
            image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3",
            isActive: true,
        },
        {
            _id: ids.genreRnB,
            name: "Demo RnB",
            description: "Genre demo de test mix track template va track seed tay.",
            image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81",
            isActive: true,
        },
    ];

    const plans = [
        {
            _id: ids.planFree,
            name: "Demo Free",
            price: 0,
            durationDays: 30,
            description: "Goi free dung cho bo du lieu demo.",
            features: [],
            status: "active",
        },
        {
            _id: ids.planPremium,
            name: "Demo Premium",
            price: 99000,
            durationDays: 30,
            description: "Goi premium mau de test thanh toan, subscription va playback.",
            features: [
                "NO_ADS",
                "HIGH_QUALITY_AUDIO",
                "UNLIMITED_SKIP",
                "OFFLINE_DOWNLOAD",
                "BACKGROUND_PLAY",
                "AI_SMART_PLAYLIST",
            ],
            status: "active",
        },
    ];

    const albums = [
        {
            _id: ids.albumOne,
            title: "Night Shift EP",
            artistId: ids.artistOne,
            coverImage: "https://images.unsplash.com/photo-1511379938547-c1f69419868d",
            trackList: [{ trackId: ids.trackMidnightDrive, order: 1 }],
            releaseDate: rankingDay.subtract(16, "day").toDate(),
            status: "active",
            blockedReason: "",
            totalDuration: trackDocs.find((item) => item._id.equals(ids.trackMidnightDrive)).duration,
        },
        {
            _id: ids.albumTwo,
            title: "Rain Notes EP",
            artistId: ids.artistThree,
            coverImage: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4",
            trackList: [
                { trackId: ids.trackEchoBloom, order: 1 },
                { trackId: ids.trackCafeSauMua, order: 2 },
            ],
            releaseDate: rankingDay.subtract(14, "day").toDate(),
            status: "active",
            blockedReason: "",
            totalDuration:
                trackDocs.find((item) => item._id.equals(ids.trackEchoBloom)).duration +
                trackDocs.find((item) => item._id.equals(ids.trackCafeSauMua)).duration,
        },
    ];

    const playlistTracks = [
        ids.trackStay,
        ids.trackLiem,
        ids.trackEchoBloom,
        ids.trackMidnightDrive,
    ];
    const playlistDuration = playlistTracks.reduce((sum, trackId) => {
        const trackDoc = trackDocs.find((item) => item._id.equals(trackId));
        return sum + Number(trackDoc?.duration || 0);
    }, 0);

    const playlists = [
        {
            _id: ids.playlistMain,
            userId: ids.userListenerOne,
            title: "Demo Top Tracks",
            description: "Playlist de test danh sach phat va du lieu chart.",
            type: "user",
            coverImage: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4",
            isPublic: true,
            isHidden: false,
            aiPrompt: "",
            trackCount: playlistTracks.length,
            totalDuration: playlistDuration,
            tracks: playlistTracks.map((trackId, index) => ({
                trackId,
                order: index,
                addedAt: rankingDay.subtract(6 - index, "day").toDate(),
            })),
        },
    ];

    const subscriptions = [
        {
            _id: ids.subscriptionMain,
            userId: ids.userListenerOne,
            planId: ids.planPremium,
            status: "active",
            startDate: rankingDay.subtract(3, "day").toDate(),
            endDate: rankingDay.add(27, "day").toDate(),
            autoRenew: true,
        },
    ];

    const transactions = [
        {
            _id: ids.transactionMain,
            userId: ids.userListenerOne,
            subscriptionId: ids.subscriptionMain,
            planId: ids.planPremium,
            amount: 99000,
            tax: 0,
            totalAmount: 99000,
            currency: "VND",
            paymentMethod: "vnpay",
            paymentGateway: "vnpay",
            gatewayTransactionId: "DEMO-VNPAY-0001",
            status: "success",
            paidAt: transactionPaidAt,
            invoiceNumber: "DEMO-INV-0001",
        },
    ];

    const refreshTokens = [
        {
            _id: ids.refreshTokenMain,
            userId: ids.userListenerOne,
            token: "demo-refresh-token-listener-one",
            expiresAt: rankingDay.add(30, "day").toDate(),
            isRevoked: false,
        },
    ];

    const verificationTokens = [
        {
            _id: ids.verificationTokenMain,
            userId: ids.userApplicant,
            email: "demo.applicant@reso.local",
            token: "demo-verification-token-0001",
            otp: "123456",
            type: "verify_email",
            expiresAt: rankingDay.add(2, "day").toDate(),
            isUsed: false,
        },
    ];

    const searchEvents = [
        {
            _id: ids.searchEventMain,
            userId: ids.userListenerOne,
            keyword: "stay",
            clickedTrackId: ids.trackStay,
        },
        {
            _id: ids.searchEventSecond,
            userId: ids.userListenerTwo,
            keyword: "demo chart",
            clickedTrackId: ids.trackEchoBloom,
        },
    ];

    const interactions = [
        {
            _id: ids.interactionTrackLikeOne,
            userId: ids.userListenerOne,
            targetType: "Track",
            targetId: ids.trackStay,
            action: "like",
        },
        {
            _id: ids.interactionTrackLikeTwo,
            userId: ids.userListenerTwo,
            targetType: "Track",
            targetId: ids.trackLiem,
            action: "like",
        },
        {
            _id: ids.interactionTrackLikeThree,
            userId: ids.userListenerThree,
            targetType: "Track",
            targetId: ids.trackEchoBloom,
            action: "like",
        },
        {
            _id: ids.interactionArtistFollowOne,
            userId: ids.userListenerOne,
            targetType: "Artist",
            targetId: ids.artistOne,
            action: "follow",
        },
        {
            _id: ids.interactionArtistFollowTwo,
            userId: ids.userListenerTwo,
            targetType: "Artist",
            targetId: ids.artistThree,
            action: "follow",
        },
    ];

    const notifications = [
        {
            _id: ids.notificationPremium,
            userId: ids.userListenerOne,
            type: "subscription",
            title: "Premium da duoc kich hoat",
            content: "Tai khoan demo listener one da kich hoat goi Demo Premium.",
            actorId: ids.userAdmin,
            actorType: "admin",
            targetId: ids.planPremium,
            targetType: "plan",
            targetName: "Demo Premium",
            sourceType: "admin_manual",
            receiverType: "single",
            isGlobal: false,
            createdBy: ids.userAdmin,
            isDeleted: false,
        },
        {
            _id: ids.notificationGlobal,
            type: "new_release",
            title: "Bang xep hang demo da san sang",
            content: "Du lieu daily va monthly ranking da duoc seed de test chart.",
            actorId: ids.userAdmin,
            actorType: "admin",
            targetId: ids.trackLiem,
            targetType: "track",
            targetName: "Liem",
            sourceType: "system_auto",
            receiverType: "all",
            isGlobal: true,
            targetRoles: ["user", "artist"],
            createdBy: ids.userAdmin,
            isDeleted: false,
        },
        {
            _id: ids.notificationArtist,
            userId: ids.userArtistThree,
            type: "artist_update",
            title: "Lich phat hanh demo duoc tao",
            content: "Album demo tiep theo da duoc len lich phat hanh.",
            actorId: ids.userAdmin,
            actorType: "admin",
            artistId: ids.artistThree,
            targetId: ids.albumTwo,
            targetType: "album",
            targetName: "Rain Notes EP",
            sourceType: "admin_manual",
            receiverType: "single",
            isGlobal: false,
            createdBy: ids.userAdmin,
            isDeleted: false,
        },
    ];

    const reports = [
        {
            _id: ids.reportMain,
            userId: ids.userListenerTwo,
            targetId: ids.trackSignalReset,
            targetType: "track",
            reason: "Metadata can review lai",
            description: "Bao cao mau de test luong moderation.",
            images: ["https://images.unsplash.com/photo-1516321318423-f06f85e504b3"],
            status: "resolved",
            handledBy: ids.userAdmin,
            handledAt: rankingDay.subtract(1, "day").hour(15).toDate(),
            resolution: "warning",
            resolutionNote: "Admin da xac nhan va de lai canh bao metadata.",
        },
    ];

    const releaseSchedules = [
        {
            _id: ids.releaseScheduleMain,
            type: "album",
            targetId: ids.albumTwo,
            artistId: ids.artistThree,
            scheduledAt: rankingDay.add(7, "day").hour(9).toDate(),
            status: "scheduled",
        },
    ];

    const artistRequests = [
        {
            _id: ids.artistRequest,
            userId: ids.userApplicant,
            stageName: "Pending Demo Artist",
            bio: "Ho so demo de test quy trinh duyet nghe si.",
            avatar: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518",
            genres: ["Demo Pop", "Demo Lofi"],
            socialLinks: {
                spotify: "https://open.spotify.com/artist/demo-applicant",
                youtube: "https://youtube.com/@demoapplicant",
                tiktok: "https://tiktok.com/@demoapplicant",
                facebook: "https://facebook.com/demoapplicant",
                instagram: "https://instagram.com/demoapplicant",
                soundcloud: "",
                website: "",
                other: "",
            },
            identityInfo: {
                idNumber: "079203000999",
                fullName: "Demo Applicant",
                dateOfBirth: new Date("2000-05-17"),
                frontImage: "https://images.unsplash.com/photo-1586281380349-632531db7ed4",
                backImage: "https://images.unsplash.com/photo-1517841905240-472988babdf9",
            },
            portfolio: {
                demoTrackUrls: ["https://example.com/demo/applicant-track.mp3"],
                musicLinks: ["https://example.com/demo/applicant-profile"],
                description: "Portfolio gon de xac minh luong artist request.",
            },
            artistDeclaration: {
                acceptedTerms: true,
                copyrightCommitment: true,
                truthfulInformationCommitment: true,
                acceptedAt: rankingDay.subtract(4, "day").toDate(),
            },
            review: {
                adminNote: "Ho so demo da duoc duyet.",
                checklist: {
                    profileComplete: true,
                    identityVerified: true,
                    hasMusicActivity: true,
                    socialLinksValid: true,
                    noImpersonation: true,
                    acceptedCopyrightPolicy: true,
                },
            },
            status: "approved",
            reviewedBy: ids.userAdmin,
            reviewedAt: rankingDay.subtract(2, "day").toDate(),
            rejectReason: "",
        },
    ];

    const artistVerificationRequests = [
        {
            _id: ids.artistVerificationRequest,
            artistId: ids.artistThree,
            userId: ids.userArtistThree,
            status: "open",
            note: "Yeu cau xac minh lai thong tin profile demo.",
        },
    ];

    const artistStats = [
        {
            _id: ids.artistStatOne,
            artistId: ids.artistOne,
            totalStreams: artists[0].stats.totalStreams,
            totalFollowers: artists[0].stats.followers,
            monthlyListeners: 3,
            demographics: {
                ageGroups: { "18-24": 41, "25-34": 39, "35-44": 20 },
                gender: { male: 45, female: 49, other: 6 },
                countries: { Vietnam: 78, Singapore: 12, Japan: 10 },
            },
        },
        {
            _id: ids.artistStatTwo,
            artistId: ids.artistTwo,
            totalStreams: artists[1].stats.totalStreams,
            totalFollowers: artists[1].stats.followers,
            monthlyListeners: 3,
            demographics: {
                ageGroups: { "18-24": 48, "25-34": 34, "35-44": 18 },
                gender: { male: 52, female: 43, other: 5 },
                countries: { Vietnam: 72, Korea: 18, Japan: 10 },
            },
        },
        {
            _id: ids.artistStatThree,
            artistId: ids.artistThree,
            totalStreams: artists[2].stats.totalStreams,
            totalFollowers: artists[2].stats.followers,
            monthlyListeners: 3,
            demographics: {
                ageGroups: { "18-24": 44, "25-34": 37, "35-44": 19 },
                gender: { male: 38, female: 57, other: 5 },
                countries: { Vietnam: 75, Singapore: 15, Thailand: 10 },
            },
        },
    ];

    const withdrawalRequests = [
        {
            _id: ids.withdrawalRequestMain,
            artistId: ids.artistOne,
            amount: 120000,
            method: "bank",
            accountInfo: {
                bankName: "VCB",
                accountNumber: "1234567890",
                accountHolderName: "Demo Artist One",
            },
            status: "paid",
            requestedAt: rankingDay.subtract(1, "day").hour(9).toDate(),
            processedBy: ids.userAdmin,
            processedAt: rankingDay.subtract(1, "day").hour(11).toDate(),
            approvedAt: rankingDay.subtract(1, "day").hour(10).toDate(),
            rejectedAt: null,
            paidAt: rankingDay.subtract(1, "day").hour(16).toDate(),
            paidBy: ids.userAdmin,
            paymentReference: "DEMO-WD-0001",
            paymentNote: "Paid in full for demo flow.",
            adminNote: "Request processed inside demo dataset.",
            rejectReason: "",
        },
    ];

    const rankingDates = trackDailyRankings.map((item) => item.date);
    const cleanupTrackRankingDateKeys = trackDailyRankings.map((item) => item.dateKey);
    const artistRankingDates = artistDailyRankings.map((item) => item.date);
    const cleanupArtistRankingDateKeys = artistDailyRankings.map((item) => item.dateKey);
    const trackDailyDates = [...new Set(trackDailyStats.map((item) => item.date.getTime()))].map(
        (value) => new Date(value)
    );
    const artistDailyDates = [...new Set(artistDailyStats.map((item) => item.date.getTime()))].map(
        (value) => new Date(value)
    );

    return {
        summary: {
            rankingDate: rankingDay.format("YYYY-MM-DD"),
            previousDate: previousDay.format("YYYY-MM-DD"),
            rankingMonth: `${year}-${String(month).padStart(2, "0")}`,
            trackCount: trackDocs.length,
            listenEventCount: listenEvents.length,
        },
        cleanupScopes: [
            { model: Plan, query: { name: { $in: plans.map((item) => item.name) } } },
            { model: User, query: { email: { $in: users.map((item) => item.email) } } },
            { model: Genre, query: { name: { $in: genres.map((item) => item.name) } } },
            { model: RefreshToken, query: { token: { $in: refreshTokens.map((item) => item.token) } } },
            { model: VerificationToken, query: { token: { $in: verificationTokens.map((item) => item.token) } } },
            {
                model: TrackDailyRanking,
                query: {
                    $or: [
                        { dateKey: { $in: cleanupTrackRankingDateKeys } },
                        { date: { $in: rankingDates } },
                    ],
                },
            },
            {
                model: ArtistDailyRanking,
                query: {
                    $or: [
                        { dateKey: { $in: cleanupArtistRankingDateKeys } },
                        { date: { $in: artistRankingDates } },
                    ],
                },
            },
            { model: TrackMonthlyRanking, query: { year, month } },
            { model: ArtistMonthlyRanking, query: { year, month } },
            { model: PlatformMonthlyStat, query: { year, month } },
            { model: RevenuePeriod, query: { year, month } },
            {
                model: ArtistRevenueSummary,
                query: {
                    year,
                    month,
                    artistId: { $in: artists.map((item) => item._id) },
                },
            },
            {
                model: TrackMonthlyStat,
                query: {
                    year,
                    month,
                    trackId: { $in: trackDocs.map((item) => item._id) },
                },
            },
            {
                model: ArtistMonthlyStat,
                query: {
                    year,
                    month,
                    artistId: { $in: artists.map((item) => item._id) },
                },
            },
            {
                model: TrackDailyStat,
                query: {
                    trackId: { $in: trackDocs.map((item) => item._id) },
                    date: { $in: trackDailyDates },
                },
            },
            {
                model: ArtistDailyStat,
                query: {
                    artistId: { $in: artists.map((item) => item._id) },
                    date: { $in: artistDailyDates },
                },
            },
        ],
        collections: [
            { model: Notification, docs: notifications },
            { model: Interaction, docs: interactions },
            { model: ListenEvent, docs: listenEvents },
            { model: SearchEvent, docs: searchEvents },
            { model: Report, docs: reports },
            { model: ReleaseSchedule, docs: releaseSchedules },
            { model: RefreshToken, docs: refreshTokens },
            { model: VerificationToken, docs: verificationTokens },
            { model: Transaction, docs: transactions },
            { model: Subscription, docs: subscriptions },
            { model: WithdrawalRequest, docs: withdrawalRequests },
            { model: RevenuePeriod, docs: [revenuePeriod] },
            { model: ArtistRevenueSummary, docs: artistRevenueSummaries },
            { model: PlatformMonthlyStat, docs: [platformMonthlyStat] },
            { model: TrackDailyRanking, docs: trackDailyRankings },
            { model: TrackDailyStat, docs: trackDailyStats },
            { model: TrackMonthlyRanking, docs: [trackMonthlyRanking] },
            { model: TrackMonthlyStat, docs: trackMonthlyStats },
            { model: Playlist, docs: playlists },
            { model: Track, docs: trackDocs },
            { model: Album, docs: albums },
            { model: ArtistDailyRanking, docs: artistDailyRankings },
            { model: ArtistDailyStat, docs: artistDailyStats },
            { model: ArtistMonthlyRanking, docs: [artistMonthlyRanking] },
            { model: ArtistMonthlyStat, docs: artistMonthlyStats },
            { model: ArtistStat, docs: artistStats },
            { model: ArtistVerificationRequest, docs: artistVerificationRequests },
            { model: ArtistRequest, docs: artistRequests },
            { model: Artist, docs: artists },
            { model: Genre, docs: genres },
            { model: User, docs: users },
            { model: Plan, docs: plans },
        ],
    };
};

const connectDatabase = async () => {
    if (!process.env.DATABASE) {
        throw new Error("Missing DATABASE in .env");
    }

    mongoose.set("autoIndex", false);
    await mongoose.connect(process.env.DATABASE);
};

const ensureIndexes = async () => {
    for (const model of ALL_MODELS) {
        try {
            await model.init();
        } catch (error) {
            if (error?.code !== 86) {
                throw error;
            }
        }
    }
};

const cleanupSeedData = async (collections, cleanupScopes = []) => {
    for (const { model, query } of cleanupScopes) {
        await model.deleteMany(query);
    }

    for (const { model, docs } of collections) {
        const idsToDelete = docs.map((doc) => doc._id).filter(Boolean);
        if (idsToDelete.length > 0) {
            await model.deleteMany({ _id: { $in: idsToDelete } });
        }
    }
};

const insertSeedData = async (collections) => {
    for (const { model, docs } of [...collections].reverse()) {
        if (docs.length > 0) {
            await model.insertMany(docs, { ordered: true });
        }
    }
};

const main = async () => {
    const { collections, cleanupScopes, summary } = await buildDemoDocuments();

    await connectDatabase();
    await ensureIndexes();
    await cleanupSeedData(collections, cleanupScopes);
    await insertSeedData(collections);

    console.log("Demo seed completed successfully.");
    console.log(`Ranking day: ${summary.rankingDate}`);
    console.log(`Previous ranking day: ${summary.previousDate}`);
    console.log(`Ranking month: ${summary.rankingMonth}`);
    console.log(`Tracks seeded: ${summary.trackCount}`);
    console.log(`Listen events seeded: ${summary.listenEventCount}`);
    console.log("Accounts:");
    console.log("  demo.admin@reso.local / Admin@123");
    console.log("  demo.artist.one@reso.local / Artist@123");
    console.log("  demo.artist.two@reso.local / Artist@123");
    console.log("  demo.artist.three@reso.local / Artist@123");
    console.log("  demo.listener.one@reso.local / Listener@123");
    console.log("  demo.listener.two@reso.local / Listener@123");
    console.log("  demo.listener.three@reso.local / Listener@123");
    console.log("  demo.applicant@reso.local / Applicant@123");
};

main()
    .catch((error) => {
        console.error("Demo seed failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
