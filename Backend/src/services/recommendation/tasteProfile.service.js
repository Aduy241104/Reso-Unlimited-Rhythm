import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import Album from "../../models/Album.js";
import Artist from "../../models/Artist.js";
import Interaction from "../../models/Interaction.js";
import ListenEvent from "../../models/ListenEvent.js";
import Playlist from "../../models/Playlist.js";
import SearchEvent from "../../models/SearchEvent.js";
import Track from "../../models/Track.js";
import { getAnalyticsTimezone } from "../analytics/trackStatAggregation.service.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export const DAILY_MIX_COUNT = 3;
export const TRACKS_PER_MIX = 20;
export const LISTENING_WINDOW_DAYS = 30;
export const ACTIVE_USER_WINDOW_DAYS = 7;
export const RECOMMENDATION_CACHE_TTL_SECONDS = 6 * 60 * 60;
export const ALGORITHM_VERSION = "rule_based_v1";

export const SCORE_RULES = {
    listen: 3,
    completed: 5,
    skipped: -5,
    repeatListen: 1,
    likeTrack: 8,
    followArtist: 10,
    followAlbum: 6,
    userPlaylistTrack: 6,
    searchKeywordOnly: 1,
    searchAndClickTrack: 3,
};

export const MIX_TRACK_SPLIT = {
    familiar: 10,
    similar: 6,
    trending: 4,
};

export const roundScore = (value, precision = 2) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    const factor = 10 ** precision;
    return Math.round(safeValue * factor) / factor;
};

export const buildStoredDayDate = (targetDay) =>
    dayjs.utc(`${targetDay.format("YYYY-MM-DD")}T00:00:00Z`).toDate();

export const getRecommendationDateContext = (targetDateInput) => {
    const timezoneName = getAnalyticsTimezone();
    const baseDay = targetDateInput
        ? dayjs(targetDateInput).tz(timezoneName).startOf("day")
        : dayjs().tz(timezoneName).startOf("day");
    const nextDay = baseDay.add(1, "day");

    return {
        timezone: timezoneName,
        dateKey: baseDay.format("YYYY-MM-DD"),
        date: buildStoredDayDate(baseDay),
        dayStart: baseDay.toDate(),
        dayEnd: nextDay.toDate(),
        expiresAt: nextDay.toDate(),
        now: dayjs().tz(timezoneName).toDate(),
    };
};

export const getWindowStartDate = (dateContext, windowDays = LISTENING_WINDOW_DAYS) =>
    dayjs(dateContext.dayStart).subtract(windowDays, "day").toDate();

export const getDecayMultiplier = (eventDate, referenceDate = new Date()) => {
    const diffDays = Math.max(
        0,
        dayjs(referenceDate).startOf("day").diff(dayjs(eventDate).startOf("day"), "day")
    );

    if (diffDays <= 7) {
        return 1;
    }

    if (diffDays <= 14) {
        return 0.7;
    }

    if (diffDays <= 30) {
        return 0.4;
    }

    return 0.2;
};

export const scoreListenEvent = ({
    listenedAt,
    completed,
    skipped,
    repeatIndex = 0,
    referenceDate = new Date(),
}) => {
    const decay = getDecayMultiplier(listenedAt, referenceDate);
    const repeatBonus = Math.min(Math.max(repeatIndex, 0), 3) * SCORE_RULES.repeatListen;
    const baseScore =
        SCORE_RULES.listen +
        (completed ? SCORE_RULES.completed : 0) +
        (skipped ? SCORE_RULES.skipped : 0) +
        repeatBonus;

    return roundScore(baseScore * decay);
};

export const normalizeKeyword = (value = "") =>
    String(value)
        .trim()
        .toLowerCase();

export const addScoreToObjectMap = (scoreMap, id, amount) => {
    if (!id || !Number.isFinite(amount) || amount === 0) {
        return;
    }

    const current = scoreMap[id] || 0;
    scoreMap[id] = roundScore(current + amount);
};

export const sortScoreEntries = (scoreMap) =>
    Object.entries(scoreMap)
        .sort((left, right) => {
            if (right[1] !== left[1]) {
                return right[1] - left[1];
            }

            return String(left[0]).localeCompare(String(right[0]));
        });

export const calculateKeywordBoost = (track, keywords = []) => {
    if (!track || !Array.isArray(keywords) || keywords.length === 0) {
        return 0;
    }

    const haystacks = [
        track.title,
        track.artist_artistId?.name,
        ...(track.genreIds || []).map((genre) => genre?.name),
    ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

    let score = 0;

    for (const keyword of keywords) {
        if (!keyword) {
            continue;
        }

        if (haystacks.some((value) => value.includes(keyword))) {
            score += SCORE_RULES.searchKeywordOnly;
        }
    }

    return roundScore(score);
};

const ensureTrackReasonBucket = (tasteProfile, trackId) => {
    if (!tasteProfile.trackReasons[trackId]) {
        tasteProfile.trackReasons[trackId] = {
            liked: false,
            inPlaylist: false,
            frequentListen: false,
            searchClick: false,
            followedAlbum: false,
        };
    }

    return tasteProfile.trackReasons[trackId];
};

const applyMetadataScores = (tasteProfile, metadata, score) => {
    if (!metadata || !Number.isFinite(score) || score === 0) {
        return;
    }

    if (metadata.artistId) {
        addScoreToObjectMap(tasteProfile.artistScores, metadata.artistId, score);
        if (metadata.artistName) {
            tasteProfile.artistNames[metadata.artistId] = metadata.artistName;
        }
    }

    const genreIds = Array.isArray(metadata.genreIds) ? metadata.genreIds : [];
    const genreNames = metadata.genreNames || {};
    const genreWeight = genreIds.length > 0 ? score / genreIds.length : 0;

    for (const genreId of genreIds) {
        addScoreToObjectMap(tasteProfile.genreScores, genreId, genreWeight);

        if (genreNames[genreId]) {
            tasteProfile.genreNames[genreId] = genreNames[genreId];
        }
    }
};

const applyTrackScore = (tasteProfile, trackId, score, trackMetadataById) => {
    if (!trackId || !Number.isFinite(score) || score === 0) {
        return;
    }

    addScoreToObjectMap(tasteProfile.trackScores, trackId, score);
    applyMetadataScores(tasteProfile, trackMetadataById.get(trackId), score);
};

const buildTrackMetadataMap = (tracks) =>
    new Map(
        tracks.map((track) => {
            const trackId = String(track._id);
            const artistId = track.artist_artistId?._id
                ? String(track.artist_artistId._id)
                : track.artist_artistId
                    ? String(track.artist_artistId)
                    : null;
            const genreIds = (track.genreIds || []).map((genre) =>
                genre?._id ? String(genre._id) : String(genre)
            );
            const genreNames = Object.fromEntries(
                (track.genreIds || [])
                    .filter((genre) => genre?._id && genre?.name)
                    .map((genre) => [String(genre._id), genre.name])
            );

            return [
                trackId,
                {
                    artistId,
                    artistName: track.artist_artistId?.name || "",
                    genreIds,
                    genreNames,
                    title: track.title || "",
                },
            ];
        })
    );

const buildEmptyTasteProfile = (userId) => ({
    userId: String(userId),
    genreScores: {},
    artistScores: {},
    trackScores: {},
    skippedTrackIds: [],
    recentlyPlayedTrackIds: [],
    likedTrackIds: [],
    followedArtistIds: [],
    playlistTrackIds: [],
    searchKeywords: [],
    trackReasons: {},
    skipCounts: {},
    artistNames: {},
    genreNames: {},
    signalStats: {
        listenEvents: 0,
        interactions: 0,
        searchEvents: 0,
        playlistTracks: 0,
        totalSignals: 0,
    },
});

export const buildTasteProfile = async (
    userId,
    dateContext,
    options = {}
) => {
    const tasteProfile = buildEmptyTasteProfile(userId);
    const windowStartDate = getWindowStartDate(
        dateContext,
        options.listeningWindowDays || LISTENING_WINDOW_DAYS
    );

    const [listenEvents, interactions, searchEvents, playlists] = await Promise.all([
        ListenEvent.find({
            userId,
            trackId: { $exists: true, $ne: null },
            listenedAt: {
                $gte: windowStartDate,
                $lt: dateContext.dayEnd,
            },
        })
            .select("trackId artistId listenedAt duration completed skipped")
            .lean(),
        Interaction.find({ userId })
            .select("targetType targetId action createdAt")
            .lean(),
        SearchEvent.find({
            userId,
            createdAt: {
                $gte: windowStartDate,
                $lt: dateContext.dayEnd,
            },
        })
            .select("keyword clickedTrackId createdAt")
            .lean(),
        Playlist.find({
            userId,
            type: "user",
            isHidden: false,
        })
            .select("tracks.trackId")
            .lean(),
    ]);

    tasteProfile.signalStats.listenEvents = listenEvents.length;
    tasteProfile.signalStats.interactions = interactions.length;
    tasteProfile.signalStats.searchEvents = searchEvents.length;

    const likedTrackIds = interactions
        .filter((interaction) =>
            interaction.targetType === "Track" && interaction.action === "like"
        )
        .map((interaction) => String(interaction.targetId));
    const followedArtistIds = interactions
        .filter((interaction) =>
            interaction.targetType === "Artist" && interaction.action === "follow"
        )
        .map((interaction) => String(interaction.targetId));
    const followedAlbumIds = interactions
        .filter((interaction) =>
            interaction.targetType === "Album" && interaction.action === "follow"
        )
        .map((interaction) => interaction.targetId);
    const playlistTrackIds = playlists.flatMap((playlist) =>
        (playlist.tracks || [])
            .map((entry) => entry?.trackId)
            .filter(Boolean)
            .map((trackId) => String(trackId))
    );

    tasteProfile.likedTrackIds = [...new Set(likedTrackIds)];
    tasteProfile.followedArtistIds = [...new Set(followedArtistIds)];
    tasteProfile.playlistTrackIds = [...new Set(playlistTrackIds)];
    tasteProfile.signalStats.playlistTracks = tasteProfile.playlistTrackIds.length;

    const followedAlbums = followedAlbumIds.length
        ? await Album.find({
            _id: { $in: followedAlbumIds },
            status: "active",
        })
            .select("artistId trackList.trackId")
            .lean()
        : [];

    const followedAlbumTrackIds = followedAlbums.flatMap((album) =>
        (album.trackList || [])
            .map((entry) => entry?.trackId)
            .filter(Boolean)
            .map((trackId) => String(trackId))
    );

    const clickedTrackIds = searchEvents
        .map((searchEvent) => searchEvent.clickedTrackId)
        .filter(Boolean)
        .map((trackId) => String(trackId));

    const collectedTrackIds = new Set([
        ...listenEvents.map((event) => String(event.trackId)),
        ...tasteProfile.likedTrackIds,
        ...tasteProfile.playlistTrackIds,
        ...followedAlbumTrackIds,
        ...clickedTrackIds,
    ]);

    const [tracks, followedArtists] = await Promise.all([
        collectedTrackIds.size > 0
            ? Track.find({ _id: { $in: [...collectedTrackIds] } })
                .select("title artist_artistId genreIds")
                .populate({
                    path: "artist_artistId",
                    select: "name",
                })
                .populate({
                    path: "genreIds",
                    select: "name",
                })
                .lean()
            : [],
        tasteProfile.followedArtistIds.length > 0
            ? Artist.find({ _id: { $in: tasteProfile.followedArtistIds } })
                .select("name")
                .lean()
            : [],
    ]);

    for (const artist of followedArtists) {
        tasteProfile.artistNames[String(artist._id)] = artist.name || "";
    }

    const trackMetadataById = buildTrackMetadataMap(tracks);
    const listenEventsAscending = [...listenEvents].sort(
        (left, right) =>
            new Date(left.listenedAt).getTime() - new Date(right.listenedAt).getTime()
    );
    const listenEventsDescending = [...listenEvents].sort(
        (left, right) =>
            new Date(right.listenedAt).getTime() - new Date(left.listenedAt).getTime()
    );
    const repeatCountByTrackId = {};
    const skipCountByTrackId = {};

    for (const event of listenEventsAscending) {
        const trackId = String(event.trackId);
        const repeatIndex = repeatCountByTrackId[trackId] || 0;
        const score = scoreListenEvent({
            listenedAt: event.listenedAt,
            completed: event.completed,
            skipped: event.skipped,
            repeatIndex,
            referenceDate: dateContext.dayStart,
        });

        applyTrackScore(tasteProfile, trackId, score, trackMetadataById);

        repeatCountByTrackId[trackId] = repeatIndex + 1;
        if (repeatCountByTrackId[trackId] >= 2) {
            ensureTrackReasonBucket(tasteProfile, trackId).frequentListen = true;
        }

        if (event.skipped) {
            skipCountByTrackId[trackId] = (skipCountByTrackId[trackId] || 0) + 1;
        }
    }

    tasteProfile.skipCounts = skipCountByTrackId;
    tasteProfile.skippedTrackIds = Object.entries(skipCountByTrackId)
        .filter(([, count]) => count >= 3)
        .map(([trackId]) => trackId);
    tasteProfile.recentlyPlayedTrackIds = [
        ...new Set(
            listenEventsDescending.map((event) => String(event.trackId))
        ),
    ].slice(0, 50);

    for (const trackId of tasteProfile.likedTrackIds) {
        ensureTrackReasonBucket(tasteProfile, trackId).liked = true;
        applyTrackScore(
            tasteProfile,
            trackId,
            SCORE_RULES.likeTrack,
            trackMetadataById
        );
    }

    for (const artistId of tasteProfile.followedArtistIds) {
        addScoreToObjectMap(
            tasteProfile.artistScores,
            artistId,
            SCORE_RULES.followArtist
        );
    }

    for (const album of followedAlbums) {
        const albumTrackIds = (album.trackList || [])
            .map((entry) => entry?.trackId)
            .filter(Boolean)
            .map((trackId) => String(trackId));
        const distributedScore = albumTrackIds.length
            ? SCORE_RULES.followAlbum / albumTrackIds.length
            : 0;

        if (album.artistId) {
            addScoreToObjectMap(
                tasteProfile.artistScores,
                String(album.artistId),
                SCORE_RULES.followAlbum
            );
        }

        for (const trackId of albumTrackIds) {
            ensureTrackReasonBucket(tasteProfile, trackId).followedAlbum = true;
            applyTrackScore(
                tasteProfile,
                trackId,
                distributedScore,
                trackMetadataById
            );
        }
    }

    for (const trackId of tasteProfile.playlistTrackIds) {
        ensureTrackReasonBucket(tasteProfile, trackId).inPlaylist = true;
        applyTrackScore(
            tasteProfile,
            trackId,
            SCORE_RULES.userPlaylistTrack,
            trackMetadataById
        );
    }

    const keywordSet = new Set();
    for (const searchEvent of searchEvents) {
        const keyword = normalizeKeyword(searchEvent.keyword);
        if (keyword) {
            keywordSet.add(keyword);
        }

        if (searchEvent.clickedTrackId) {
            const trackId = String(searchEvent.clickedTrackId);
            ensureTrackReasonBucket(tasteProfile, trackId).searchClick = true;
            applyTrackScore(
                tasteProfile,
                trackId,
                SCORE_RULES.searchAndClickTrack,
                trackMetadataById
            );
        }
    }

    tasteProfile.searchKeywords = [...keywordSet].slice(0, 20);
    tasteProfile.signalStats.totalSignals =
        listenEvents.length +
        interactions.length +
        searchEvents.length +
        tasteProfile.playlistTrackIds.length;

    const topTrackCount = sortScoreEntries(tasteProfile.trackScores).length;
    const topArtistCount = sortScoreEntries(tasteProfile.artistScores).length;
    const topGenreCount = sortScoreEntries(tasteProfile.genreScores).length;

    tasteProfile.isColdStart =
        topTrackCount < 5 &&
        topArtistCount < 3 &&
        topGenreCount < 3 &&
        tasteProfile.signalStats.totalSignals < 10;

    return tasteProfile;
};

export default {
    ACTIVE_USER_WINDOW_DAYS,
    ALGORITHM_VERSION,
    DAILY_MIX_COUNT,
    LISTENING_WINDOW_DAYS,
    MIX_TRACK_SPLIT,
    RECOMMENDATION_CACHE_TTL_SECONDS,
    SCORE_RULES,
    TRACKS_PER_MIX,
    addScoreToObjectMap,
    buildTasteProfile,
    buildStoredDayDate,
    calculateKeywordBoost,
    getDecayMultiplier,
    getRecommendationDateContext,
    getWindowStartDate,
    normalizeKeyword,
    roundScore,
    scoreListenEvent,
    sortScoreEntries,
};
