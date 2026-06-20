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
const MIN_TRACKS_TO_PUBLISH_ALBUM = 2;

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

const getOwnedReleaseTarget = async ({ artistId, type, targetId }) => {
    if (type === "album") {
        const album = await Album.findOne({
            _id: targetId,
            artistId,
        }).lean();

        if (!album) {
            throw new AppError("Album not found for this artist.", 404);
        }

        return album;
    }

    const track = await Track.findOne({
        _id: targetId,
        artist_artistId: artistId,
    }).lean();

    if (!track) {
        throw new AppError("Track not found for this artist.", 404);
    }

    return track;
};

const ensureAlbumCanBeScheduledForRelease = (album) => {
    const trackCount = Array.isArray(album?.trackList) ? album.trackList.length : 0;

    if (trackCount < MIN_TRACKS_TO_PUBLISH_ALBUM) {
        throw new AppError(
            `Album must contain at least ${MIN_TRACKS_TO_PUBLISH_ALBUM} tracks before it can be scheduled for release.`,
            400,
            {
                field: "targetId",
            }
        );
    }
};

const ensureTargetCanBeReleased = ({ type, target }) => {
    if (type === "album") {
        if (target?.status === "blocked") {
            throw new AppError("Blocked albums cannot be released.", 409, {
                field: "targetId",
            });
        }

        return;
    }

    if (target?.approvalStatus !== "approved") {
        throw new AppError("Track must be approved before it can be released.", 409, {
            field: "targetId",
        });
    }

    if (target?.activeStatus === "blocked") {
        throw new AppError("Blocked tracks cannot be released.", 409, {
            field: "targetId",
        });
    }
};

const ensureNoConflictingScheduledRelease = async ({ artistId, type, targetId }) => {
    const existingSchedule = await ReleaseSchedule.findOne({
        artistId,
        type,
        targetId,
        status: "scheduled",
    }).lean();

    if (existingSchedule) {
        throw new AppError(
            "A scheduled release already exists for this item.",
            409
        );
    }
};

const syncTargetReleaseDate = async ({ type, targetId, scheduledAt }) => {
    if (type === "album") {
        await Album.updateOne(
            { _id: targetId },
            { $set: { releaseDate: scheduledAt } }
        );
        return;
    }

    await Track.updateOne(
        { _id: targetId },
        { $set: { releaseDate: scheduledAt } }
    );
};

const syncTargetVisibilityForRelease = async ({ type, targetId }) => {
    if (type === "album") {
        await Album.updateOne(
            {
                _id: targetId,
                status: { $in: ["draft", "hidden"] },
            },
            {
                $set: { status: "active" },
            }
        );
        return;
    }

    await Track.updateOne(
        {
            _id: targetId,
            activeStatus: { $in: ["draft", "hidden", "inactive"] },
        },
        {
            $set: { activeStatus: "active" },
        }
    );
};

const ensureScheduledAtIsValid = (value) => {
    const scheduledAt = new Date(value);

    if (Number.isNaN(scheduledAt.getTime())) {
        throw new AppError("Scheduled date is invalid.", 400, {
            field: "scheduledAt",
        });
    }

    return scheduledAt;
};

const ensureReleaseScheduleIsEditable = (schedule) => {
    if (schedule.status === "cancelled") {
        throw new AppError("Cancelled schedules cannot be edited.", 409);
    }

    if (schedule.status === "released") {
        throw new AppError("Released schedules cannot be edited.", 409);
    }

    if (new Date(schedule.scheduledAt).getTime() <= Date.now()) {
        throw new AppError("This release schedule can no longer be edited.", 409);
    }
};

const syncTargetReleaseDateAfterCancellation = async ({
    artistId,
    type,
    targetId,
    cancelledScheduledAt,
    currentReleaseDate,
}) => {
    const nextScheduledRelease = await ReleaseSchedule.findOne({
        artistId,
        type,
        targetId,
        status: "scheduled",
    })
        .sort({ scheduledAt: 1, createdAt: 1, _id: 1 })
        .lean();

    const currentReleaseDateValue = currentReleaseDate
        ? new Date(currentReleaseDate).getTime()
        : null;
    const cancelledScheduledAtValue = cancelledScheduledAt
        ? new Date(cancelledScheduledAt).getTime()
        : null;

    if (
        currentReleaseDateValue === null ||
        cancelledScheduledAtValue === null ||
        currentReleaseDateValue !== cancelledScheduledAtValue
    ) {
        return currentReleaseDate || null;
    }

    if (type === "album") {
        if (nextScheduledRelease?.scheduledAt) {
            await Album.updateOne(
                { _id: targetId, artistId },
                { $set: { releaseDate: nextScheduledRelease.scheduledAt } }
            );
            return nextScheduledRelease.scheduledAt;
        }

        await Album.updateOne(
            { _id: targetId, artistId },
            { $unset: { releaseDate: 1 } }
        );
        return null;
    }

    if (nextScheduledRelease?.scheduledAt) {
        await Track.updateOne(
            { _id: targetId, artist_artistId: artistId },
            { $set: { releaseDate: nextScheduledRelease.scheduledAt } }
        );
        return nextScheduledRelease.scheduledAt;
    }

    await Track.updateOne(
        { _id: targetId, artist_artistId: artistId },
        { $unset: { releaseDate: 1 } }
    );

    return null;
};

const publishDueReleaseSchedules = async (extraFilter = {}) => {
    const now = new Date();
    const dueSchedules = await ReleaseSchedule.find({
        status: "scheduled",
        scheduledAt: { $lte: now },
        ...extraFilter,
    })
        .select("_id scheduledAt type targetId")
        .lean();

    if (dueSchedules.length === 0) {
        return {
            updatedCount: 0,
        };
    }

    const dueAlbumSchedules = dueSchedules.filter(
        (schedule) => schedule.type === "album" && schedule.targetId
    );
    const dueTrackSchedules = dueSchedules.filter((schedule) => schedule.type !== "album");
    const dueAlbumIds = dueAlbumSchedules.map((schedule) => schedule.targetId);
    const dueTrackIds = dueTrackSchedules
        .filter((schedule) => schedule.targetId)
        .map((schedule) => schedule.targetId);

    let releasableAlbumScheduleIds = [];

    if (dueAlbumIds.length > 0) {
        const dueAlbums = await Album.find({
            _id: { $in: dueAlbumIds },
        })
            .select("_id status trackList")
            .lean();

        const releasableAlbumIdSet = new Set(
            dueAlbums
                .filter((album) => Array.isArray(album.trackList) && album.trackList.length >= MIN_TRACKS_TO_PUBLISH_ALBUM)
                .map((album) => album._id.toString())
        );

        releasableAlbumScheduleIds = dueAlbumSchedules
            .filter((schedule) => releasableAlbumIdSet.has(schedule.targetId.toString()))
            .map((schedule) => schedule._id);

        const albumIdsToActivate = dueAlbums
            .filter(
                (album) =>
                    releasableAlbumIdSet.has(album._id.toString()) &&
                    ["draft", "hidden"].includes(album.status)
            )
            .map((album) => album._id);

        if (albumIdsToActivate.length > 0) {
            await Album.updateMany(
                {
                    _id: { $in: albumIdsToActivate },
                },
                {
                    $set: { status: "active" },
                }
            );
        }
    }

    if (dueTrackIds.length > 0) {
        await Track.updateMany(
            {
                _id: { $in: dueTrackIds },
                activeStatus: { $in: ["draft", "hidden", "inactive"] },
            },
            {
                $set: { activeStatus: "active" },
            }
        );
    }

    const releasableScheduleIds = [
        ...dueTrackSchedules.map((schedule) => schedule._id),
        ...releasableAlbumScheduleIds,
    ];

    if (releasableScheduleIds.length === 0) {
        return {
            updatedCount: 0,
        };
    }

    await ReleaseSchedule.bulkWrite(
        dueSchedules
            .filter((schedule) =>
                releasableScheduleIds.some(
                    (scheduleId) => scheduleId.toString() === schedule._id.toString()
                )
            )
            .map((schedule) => ({
            updateOne: {
                filter: {
                    _id: schedule._id,
                    status: "scheduled",
                },
                update: {
                    $set: {
                        status: "released",
                        releasedAt: schedule.scheduledAt,
                    },
                },
            },
        }))
    );

    return {
        updatedCount: releasableScheduleIds.length,
    };
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
    await publishDueReleaseSchedules({ artistId: artist._id });
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

const getMyReleaseScheduleDetail = async (userId, scheduleId) => {
    const artist = await getArtistByUserId(userId);
    await publishDueReleaseSchedules({ artistId: artist._id });
    const schedule = await ReleaseSchedule.findOne({
        _id: scheduleId,
        artistId: artist._id,
    }).lean();

    if (!schedule) {
        throw new AppError("Release schedule not found.", 404);
    }

    const target = await getOwnedReleaseTarget({
        artistId: artist._id,
        type: schedule.type,
        targetId: schedule.targetId,
    });

    return {
        artist: {
            id: artist._id.toString(),
            name: artist.name,
        },
        releaseSchedule: {
            ...formatArtistComingRelease({ schedule, target }),
            createdAt: schedule.createdAt || null,
            updatedAt: schedule.updatedAt || null,
        },
    };
};

const cancelMyReleaseSchedule = async (userId, scheduleId) => {
    const artist = await getArtistByUserId(userId);
    await publishDueReleaseSchedules({ artistId: artist._id });
    const schedule = await ReleaseSchedule.findOne({
        _id: scheduleId,
        artistId: artist._id,
    });

    if (!schedule) {
        throw new AppError("Release schedule not found.", 404);
    }

    if (schedule.status === "cancelled") {
        throw new AppError("Release schedule has already been cancelled.", 409);
    }

    if (schedule.status === "released") {
        throw new AppError("Released schedules cannot be cancelled.", 409);
    }

    if (new Date(schedule.scheduledAt).getTime() <= Date.now()) {
        throw new AppError("This release schedule can no longer be cancelled.", 409);
    }

    const target = await getOwnedReleaseTarget({
        artistId: artist._id,
        type: schedule.type,
        targetId: schedule.targetId,
    });

    schedule.status = "cancelled";
    schedule.releasedAt = null;
    await schedule.save();

    const nextReleaseDate = await syncTargetReleaseDateAfterCancellation({
        artistId: artist._id,
        type: schedule.type,
        targetId: schedule.targetId,
        cancelledScheduledAt: schedule.scheduledAt,
        currentReleaseDate: target?.releaseDate || null,
    });

    return {
        artist: {
            id: artist._id.toString(),
            name: artist.name,
        },
        releaseSchedule: {
            ...formatArtistComingRelease({
                schedule,
                target: {
                    ...target,
                    releaseDate: nextReleaseDate,
                },
            }),
            createdAt: schedule.createdAt || null,
            updatedAt: schedule.updatedAt || null,
        },
    };
};

const createMyReleaseSchedule = async (userId, payload) => {
    const artist = await getArtistByUserId(userId);
    const publishMode = payload.publishMode === "immediate" ? "immediate" : "scheduled";
    const isImmediateRelease = publishMode === "immediate";
    const scheduledAt = isImmediateRelease
        ? new Date()
        : ensureScheduledAtIsValid(payload.scheduledAt);

    const target = await getOwnedReleaseTarget({
        artistId: artist._id,
        type: payload.type,
        targetId: payload.targetId,
    });

    ensureTargetCanBeReleased({
        type: payload.type,
        target,
    });

    if (payload.type === "album") {
        ensureAlbumCanBeScheduledForRelease(target);
    }

    await ensureNoConflictingScheduledRelease({
        artistId: artist._id,
        type: payload.type,
        targetId: payload.targetId,
    });

    const schedule = await ReleaseSchedule.create({
        type: payload.type,
        targetId: payload.targetId,
        artistId: artist._id,
        scheduledAt,
        status: isImmediateRelease ? "released" : "scheduled",
        releasedAt: isImmediateRelease ? scheduledAt : null,
    });

    await syncTargetReleaseDate({
        type: payload.type,
        targetId: payload.targetId,
        scheduledAt,
    });

    if (isImmediateRelease) {
        await syncTargetVisibilityForRelease({
            type: payload.type,
            targetId: payload.targetId,
        });
    }

    return {
        artist: {
            id: artist._id.toString(),
            name: artist.name,
        },
        releaseSchedule: formatArtistComingRelease({
            schedule,
            target: {
                ...target,
                releaseDate: scheduledAt,
            },
        }),
    };
};

const updateMyReleaseSchedule = async (userId, scheduleId, payload) => {
    const artist = await getArtistByUserId(userId);
    await publishDueReleaseSchedules({ artistId: artist._id });
    const schedule = await ReleaseSchedule.findOne({
        _id: scheduleId,
        artistId: artist._id,
    });

    if (!schedule) {
        throw new AppError("Release schedule not found.", 404);
    }

    ensureReleaseScheduleIsEditable(schedule);

    const scheduledAt = ensureScheduledAtIsValid(payload.scheduledAt);
    const target = await getOwnedReleaseTarget({
        artistId: artist._id,
        type: schedule.type,
        targetId: schedule.targetId,
    });

    schedule.scheduledAt = scheduledAt;
    schedule.releasedAt = null;
    await schedule.save();

    await syncTargetReleaseDate({
        type: schedule.type,
        targetId: schedule.targetId,
        scheduledAt,
    });

    return {
        artist: {
            id: artist._id.toString(),
            name: artist.name,
        },
        releaseSchedule: {
            ...formatArtistComingRelease({
                schedule,
                target: {
                    ...target,
                    releaseDate: scheduledAt,
                },
            }),
            createdAt: schedule.createdAt || null,
            updatedAt: schedule.updatedAt || null,
        },
    };
};

export default {
    cancelMyReleaseSchedule,
    createMyReleaseSchedule,
    getMyReleaseScheduleDetail,
    getMyReleaseSchedules,
    updateMyReleaseSchedule,
};

export { publishDueReleaseSchedules };
