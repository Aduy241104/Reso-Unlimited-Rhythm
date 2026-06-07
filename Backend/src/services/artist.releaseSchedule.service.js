import Album from "../models/Album.js";
import Artist from "../models/Artist.js";
import ReleaseSchedule from "../models/ReleaseSchedule.js";
import Track from "../models/Track.js";
import { AppError } from "../utils/AppError.js";
import {
    formatArtistComingRelease,
    normalizePositiveInteger,
} from "./artistBrowse/artistBrowse.helper.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const VALID_STATUSES = new Set(["scheduled", "released", "cancelled"]);
const VALID_TYPES = new Set(["track", "album"]);

const normalizeScope = (scope) => {
    const normalizedScope = String(scope || "").trim().toLowerCase();

    return normalizedScope === "all" ? "all" : "upcoming";
};

const normalizeStatus = (status) => {
    const normalizedStatus = String(status || "").trim().toLowerCase();

    return VALID_STATUSES.has(normalizedStatus) ? normalizedStatus : "";
};

const normalizeType = (type) => {
    const normalizedType = String(type || "").trim().toLowerCase();

    return VALID_TYPES.has(normalizedType) ? normalizedType : "";
};

const getArtistByUserId = async (userId) => {
    const artist = await Artist.findOne({ userId }).select("_id name").lean();

    if (!artist) {
        throw new AppError("Artist profile not found.", 404);
    }

    return artist;
};

const buildScheduleFilter = ({ artistId, scope, status, type }) => {
    const filter = { artistId };
    const now = new Date();

    if (type) {
        filter.type = type;
    }

    if (status) {
        filter.status = status;

        if (status === "scheduled" && scope !== "all") {
            filter.scheduledAt = { $gte: now };
        }

        return filter;
    }

    if (scope === "all") {
        filter.status = { $in: Array.from(VALID_STATUSES) };
        return filter;
    }

    filter.status = "scheduled";
    filter.scheduledAt = { $gte: now };

    return filter;
};

const mapReleaseTargets = async ({ schedules, artistId }) => {
    const albumIds = schedules
        .filter((schedule) => schedule.type === "album")
        .map((schedule) => schedule.targetId);
    const trackIds = schedules
        .filter((schedule) => schedule.type === "track")
        .map((schedule) => schedule.targetId);

    const [albums, tracks] = await Promise.all([
        albumIds.length > 0
            ? Album.find({
                _id: { $in: albumIds },
                artistId,
            }).lean()
            : [],
        trackIds.length > 0
            ? Track.find({
                _id: { $in: trackIds },
                artist_artistId: artistId,
            }).lean()
            : [],
    ]);

    return {
        albumMap: new Map(albums.map((album) => [album._id.toString(), album])),
        trackMap: new Map(tracks.map((track) => [track._id.toString(), track])),
    };
};

const getMyReleaseSchedules = async (userId, query = {}) => {
    const artist = await getArtistByUserId(userId);
    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;
    const scope = normalizeScope(query.scope);
    const status = normalizeStatus(query.status);
    const type = normalizeType(query.type);
    const filter = buildScheduleFilter({
        artistId: artist._id,
        scope,
        status,
        type,
    });

    const [schedules, total] = await Promise.all([
        ReleaseSchedule.find(filter)
            .sort({ scheduledAt: 1, createdAt: 1, _id: 1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        ReleaseSchedule.countDocuments(filter),
    ]);

    const { albumMap, trackMap } = await mapReleaseTargets({
        schedules,
        artistId: artist._id,
    });

    const releaseSchedules = schedules
        .map((schedule) => {
            const target =
                schedule.type === "album"
                    ? albumMap.get(schedule.targetId.toString())
                    : trackMap.get(schedule.targetId.toString());

            if (!target) {
                return null;
            }

            return formatArtistComingRelease({ schedule, target });
        })
        .filter(Boolean);

    return {
        artist: {
            id: artist._id.toString(),
            name: artist.name,
        },
        releaseSchedules,
        pagination: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
        filters: {
            scope,
            status: status || null,
            type: type || null,
        },
    };
};

export default {
    getMyReleaseSchedules,
};
