import Album from "../models/Album.js";
import Artist from "../models/Artist.js";
import Podcast from "../models/Podcast.js";
import ReleaseSchedule from "../models/ReleaseSchedule.js";
import Track from "../models/Track.js";
import { AppError } from "../utils/AppError.js";
import { assertArtistOperational } from "./artist/artist.status.helper.js";
import {
    TRACK_RELEASE_STATUS,
    resolveTrackReleaseStatus,
} from "../utils/trackRelease.js";
import {
    formatArtistComingRelease,
    normalizePositiveInteger,
} from "./artistBrowse/artistBrowse.helper.js";
import {
    createNewReleaseNotificationForArtistFollowers,
    createUpcomingReleaseNotificationForArtistFollowers,
} from "./notification/notificationAuto.service.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const VALID_STATUSES = new Set(["scheduled", "released", "cancelled"]);
const VALID_TYPES = new Set(["track", "album", "podcast"]);
const MIN_TRACKS_TO_PUBLISH_ALBUM = 2;

const getAlbumTrackIds = (album) => {
    const trackIds = new Map();

    for (const item of album?.trackList || []) {
        const trackId = item?.trackId?._id || item?.trackId;

        if (trackId) {
            trackIds.set(trackId.toString(), trackId);
        }
    }

    return Array.from(trackIds.values());
};

const syncAlbumTracksForSchedule = async ({ album, scheduledAt }) => {
    const trackIds = getAlbumTrackIds(album);

    if (trackIds.length === 0) {
        return;
    }

    await Track.updateMany(
        {
            _id: { $in: trackIds },
            releaseStatus: { $ne: TRACK_RELEASE_STATUS.RELEASED },
            activeStatus: { $ne: "blocked" },
        },
        {
            $set: {
                releaseDate: scheduledAt,
                releaseStatus: TRACK_RELEASE_STATUS.SCHEDULED,
                releasedAt: null,
                activeStatus: "hidden",
            },
        }
    );
};

const buildAlbumTrackReleaseOperation = ({ album, releasedAt }) => {
    const trackIds = getAlbumTrackIds(album);

    if (trackIds.length === 0) {
        return null;
    }

    return {
        updateMany: {
            filter: {
                _id: { $in: trackIds },
                approvalStatus: "approved",
                activeStatus: { $ne: "blocked" },
                releaseStatus: { $ne: TRACK_RELEASE_STATUS.RELEASED },
            },
            update: {
                $set: {
                    activeStatus: "active",
                    releaseDate: releasedAt,
                    releaseStatus: TRACK_RELEASE_STATUS.RELEASED,
                    releasedAt,
                    hiddenReason: "",
                    hiddenAt: null,
                },
            },
        },
    };
};

const syncAlbumTracksAfterCancellation = async ({
    album,
    cancelledScheduledAt,
    nextScheduledAt = null,
}) => {
    const trackIds = getAlbumTrackIds(album);

    if (trackIds.length === 0) {
        return;
    }

    const filter = {
        _id: { $in: trackIds },
        releaseStatus: TRACK_RELEASE_STATUS.SCHEDULED,
        releaseDate: cancelledScheduledAt,
    };

    if (nextScheduledAt) {
        await Track.updateMany(filter, {
            $set: {
                releaseDate: nextScheduledAt,
                releaseStatus: TRACK_RELEASE_STATUS.SCHEDULED,
                releasedAt: null,
            },
        });
        return;
    }

    await Track.updateMany(filter, {
        $set: {
            releaseStatus: TRACK_RELEASE_STATUS.UNRELEASED,
            releasedAt: null,
        },
        $unset: { releaseDate: 1 },
    });
};

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
    const artist = await Artist.findOne({ userId })
        .select("_id name activeStatus isDeleted")
        .lean();

    if (!artist) {
        throw new AppError("Không tìm thấy hồ sơ nghệ sĩ.", 404);
    }

    return artist;
};

const getOwnedReleaseTarget = async ({ artistId, type, targetId }) => {
    if (type === "album") {
        const album = await Album.findOne({
            _id: targetId,
            artistId,
            isDeleted: { $ne: true },
        }).lean();

        if (!album) {
            throw new AppError("Không tìm thấy album của nghệ sĩ này.", 404);
        }

        return album;
    }

    if (type === "podcast") {
        const podcast = await Podcast.findOne({
            _id: targetId,
            creator: artistId,
            isDeleted: { $ne: true },
        }).lean();

        if (!podcast) {
            throw new AppError("Không tìm thấy Podcast của nghệ sĩ này.", 404);
        }

        return podcast;
    }

    const track = await Track.findOne({
        _id: targetId,
        artist_artistId: artistId,
        isDeleted: { $ne: true },
    }).lean();

    if (!track) {
        throw new AppError("Không tìm thấy bài hát của nghệ sĩ này.", 404);
    }

    return track;
};

const ensureAlbumCanBeScheduledForRelease = (album) => {
    const trackCount = Array.isArray(album?.trackList) ? album.trackList.length : 0;

    if (trackCount < MIN_TRACKS_TO_PUBLISH_ALBUM) {
        throw new AppError(
            `Album phải có ít nhất ${MIN_TRACKS_TO_PUBLISH_ALBUM} bài hát trước khi lên lịch phát hành.`,
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
            throw new AppError("Không thể phát hành album đang bị khóa.", 409, {
                field: "targetId",
            });
        }

        return;
    }

    if (type === "podcast") {
        if (target?.approvalStatus !== "approved") {
            throw new AppError("Podcast phải được phê duyệt trước khi phát hành.", 409, {
                field: "targetId",
            });
        }

        if (target?.isBlocked) {
            throw new AppError("Không thể phát hành Podcast đang bị khóa.", 409, {
                field: "targetId",
            });
        }

        if (!target?.audioUrl || Number(target?.duration || 0) <= 0) {
            throw new AppError("Podcast phải có tệp âm thanh hợp lệ trước khi phát hành.", 409, {
                field: "targetId",
            });
        }

        return;
    }

    if (target?.approvalStatus !== "approved") {
        throw new AppError("Bài hát phải được phê duyệt trước khi phát hành.", 409, {
            field: "targetId",
        });
    }

    if (target?.activeStatus === "blocked") {
        throw new AppError("Không thể phát hành bài hát đang bị khóa.", 409, {
            field: "targetId",
        });
    }
};

const ensureTrackHasNotBeenReleased = async ({ artistId, target }) => {
    if (resolveTrackReleaseStatus(target) === TRACK_RELEASE_STATUS.RELEASED) {
        throw new AppError("Không thể lên lịch lại cho bài hát đã phát hành.", 409, {
            field: "targetId",
            code: "TRACK_ALREADY_RELEASED",
        });
    }

    const releasedScheduleExists = await ReleaseSchedule.exists({
        artistId,
        type: "track",
        targetId: target?._id,
        status: "released",
    });

    if (releasedScheduleExists) {
        throw new AppError("Không thể lên lịch lại cho bài hát đã phát hành.", 409, {
            field: "targetId",
            code: "TRACK_ALREADY_RELEASED",
        });
    }
};

const ensureAlbumHasNotBeenReleased = async ({ artistId, target }) => {
    if (["active", "hidden"].includes(target?.status)) {
        throw new AppError("Không thể lên lịch lại cho album đã phát hành.", 409, {
            field: "targetId",
            code: "ALBUM_ALREADY_RELEASED",
        });
    }

    const releasedScheduleExists = await ReleaseSchedule.exists({
        artistId,
        type: "album",
        targetId: target?._id,
        status: "released",
    });

    if (releasedScheduleExists) {
        throw new AppError("Không thể lên lịch lại cho album đã phát hành.", 409, {
            field: "targetId",
            code: "ALBUM_ALREADY_RELEASED",
        });
    }
};

const ensurePodcastHasNotBeenReleased = async ({ artistId, target }) => {
    if (target?.releaseStatus === "released" || target?.releasedAt) {
        throw new AppError("Không thể lên lịch lại cho Podcast đã phát hành.", 409, {
            field: "targetId",
            code: "PODCAST_ALREADY_RELEASED",
        });
    }

    const releasedScheduleExists = await ReleaseSchedule.exists({
        artistId,
        type: "podcast",
        targetId: target?._id,
        status: "released",
    });

    if (releasedScheduleExists) {
        throw new AppError("Không thể lên lịch lại cho Podcast đã phát hành.", 409, {
            field: "targetId",
            code: "PODCAST_ALREADY_RELEASED",
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
            "Nội dung này đã có lịch phát hành.",
            409
        );
    }
};

const syncTargetReleaseDate = async ({ type, target, targetId, scheduledAt }) => {
    if (type === "album") {
        await Album.updateOne(
            { _id: targetId },
            { $set: { releaseDate: scheduledAt } }
        );

        await syncAlbumTracksForSchedule({
            album: target,
            scheduledAt,
        });
        return;
    }

    if (type === "podcast") {
        await Podcast.updateOne(
            { _id: targetId, creator: target?.creator },
            {
                $set: {
                    releaseDate: scheduledAt,
                    releaseStatus: "scheduled",
                    releasedAt: null,
                    visibility: "hidden",
                },
            }
        );
        return;
    }

    await Track.updateOne(
        { _id: targetId },
        {
            $set: {
                releaseDate: scheduledAt,
                releaseStatus: TRACK_RELEASE_STATUS.SCHEDULED,
                releasedAt: null,
                activeStatus: "hidden",
            },
        }
    );
};

const syncTargetVisibilityForRelease = async ({
    type,
    target,
    targetId,
    releasedAt = new Date(),
}) => {
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

        const trackReleaseOperation = buildAlbumTrackReleaseOperation({
            album: target,
            releasedAt,
        });

        if (trackReleaseOperation) {
            await Track.bulkWrite([trackReleaseOperation]);
        }
        return;
    }

    if (type === "podcast") {
        await Podcast.updateOne(
            {
                _id: targetId,
                approvalStatus: "approved",
                isBlocked: { $ne: true },
            },
            {
                $set: {
                    visibility: "public",
                    releaseDate: releasedAt,
                    releaseStatus: "released",
                    releasedAt,
                },
            }
        );
        return;
    }

    await Track.updateOne(
        {
            _id: targetId,
            activeStatus: { $ne: "blocked" },
        },
        {
            $set: {
                activeStatus: "active",
                releaseStatus: TRACK_RELEASE_STATUS.RELEASED,
                releasedAt,
                hiddenReason: "",
                hiddenAt: null,
            },
        }
    );
};

const ensureScheduledAtIsValid = (value) => {
    const scheduledAt = new Date(value);

    if (Number.isNaN(scheduledAt.getTime())) {
        throw new AppError("Ngày phát hành theo lịch không hợp lệ.", 400, {
            field: "scheduledAt",
        });
    }

    return scheduledAt;
};

const ensureReleaseScheduleIsEditable = (schedule) => {
    if (schedule.status === "cancelled") {
        throw new AppError("Không thể chỉnh sửa lịch đã hủy.", 409);
    }

    if (schedule.status === "released") {
        throw new AppError("Không thể chỉnh sửa lịch đã phát hành.", 409);
    }

    if (new Date(schedule.scheduledAt).getTime() <= Date.now()) {
        throw new AppError("Lịch phát hành này không còn có thể chỉnh sửa.", 409);
    }
};

const syncTargetReleaseDateAfterCancellation = async ({
    artistId,
    type,
    targetId,
    cancelledScheduledAt,
    currentReleaseDate,
    target,
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

            await syncAlbumTracksAfterCancellation({
                album: target,
                cancelledScheduledAt,
                nextScheduledAt: nextScheduledRelease.scheduledAt,
            });
            return nextScheduledRelease.scheduledAt;
        }

        await Album.updateOne(
            { _id: targetId, artistId },
            { $unset: { releaseDate: 1 } }
        );

        await syncAlbumTracksAfterCancellation({
            album: target,
            cancelledScheduledAt,
        });
        return null;
    }

    if (type === "podcast") {
        if (nextScheduledRelease?.scheduledAt) {
            await Podcast.updateOne(
                { _id: targetId, creator: artistId },
                {
                    $set: {
                        releaseDate: nextScheduledRelease.scheduledAt,
                        releaseStatus: "scheduled",
                        releasedAt: null,
                        visibility: "hidden",
                    },
                }
            );
            return nextScheduledRelease.scheduledAt;
        }

        await Podcast.updateOne(
            { _id: targetId, creator: artistId },
            {
                $set: {
                    releaseStatus: "unreleased",
                    releasedAt: null,
                    visibility: "hidden",
                },
                $unset: { releaseDate: 1 },
            }
        );
        return null;
    }

    if (nextScheduledRelease?.scheduledAt) {
        await Track.updateOne(
            { _id: targetId, artist_artistId: artistId },
            {
                $set: {
                    releaseDate: nextScheduledRelease.scheduledAt,
                    releaseStatus: TRACK_RELEASE_STATUS.SCHEDULED,
                    releasedAt: null,
                },
            }
        );
        return nextScheduledRelease.scheduledAt;
    }

    await Track.updateOne(
        { _id: targetId, artist_artistId: artistId },
        {
            $set: {
                releaseStatus: TRACK_RELEASE_STATUS.UNRELEASED,
                releasedAt: null,
            },
            $unset: { releaseDate: 1 },
        }
    );

    return null;
};

const publishDueReleaseSchedules = async (extraFilter = {}, io = null) => {
    const now = new Date();

    const dueSchedules = await ReleaseSchedule.find({
        status: "scheduled",
        scheduledAt: { $lte: now },
        ...extraFilter,
    })
        .select("_id scheduledAt type targetId artistId")
        .lean();

    if (dueSchedules.length === 0) {
        return {
            updatedCount: 0,
        };
    }

    const dueAlbumSchedules = dueSchedules.filter(
        (schedule) => schedule.type === "album" && schedule.targetId
    );

    const duePodcastSchedules = dueSchedules.filter(
        (schedule) => schedule.type === "podcast" && schedule.targetId
    );

    const dueTrackSchedules = dueSchedules.filter(
        (schedule) => schedule.type === "track" && schedule.targetId
    );

    const dueAlbumIds = dueAlbumSchedules.map((schedule) => schedule.targetId);
    const dueTrackIds = dueTrackSchedules
        .map((schedule) => schedule.targetId);
    const duePodcastIds = duePodcastSchedules.map((schedule) => schedule.targetId);

    let releasableAlbumSchedules = [];

    if (dueAlbumIds.length > 0) {
        const dueAlbums = await Album.find({
            _id: { $in: dueAlbumIds },
        })
            .select("_id status trackList")
            .lean();

        const releasableAlbumIdSet = new Set(
            dueAlbums
                .filter(
                    (album) =>
                        Array.isArray(album.trackList) &&
                        album.trackList.length >= MIN_TRACKS_TO_PUBLISH_ALBUM
                )
                .map((album) => album._id.toString())
        );

        releasableAlbumSchedules = dueAlbumSchedules
            .filter((schedule) =>
                releasableAlbumIdSet.has(schedule.targetId.toString())
            );

        const dueAlbumMap = new Map(
            dueAlbums.map((album) => [album._id.toString(), album])
        );

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

        const albumTrackReleaseOperations = releasableAlbumSchedules
            .map((schedule) =>
                buildAlbumTrackReleaseOperation({
                    album: dueAlbumMap.get(schedule.targetId.toString()),
                    releasedAt: schedule.scheduledAt,
                })
            )
            .filter(Boolean);

        if (albumTrackReleaseOperations.length > 0) {
            await Track.bulkWrite(albumTrackReleaseOperations);
        }
    }

    let releasableTrackSchedules = [];

    if (dueTrackIds.length > 0) {
        const dueTracks = await Track.find({
            _id: { $in: dueTrackIds },
            approvalStatus: "approved",
            activeStatus: { $ne: "blocked" },
            releaseStatus: { $ne: TRACK_RELEASE_STATUS.RELEASED },
        })
            .select("_id")
            .lean();

        const releasableTrackIdSet = new Set(
            dueTracks.map((track) => track._id.toString())
        );

        releasableTrackSchedules = dueTrackSchedules.filter((schedule) =>
            releasableTrackIdSet.has(schedule.targetId.toString())
        );

        if (releasableTrackSchedules.length > 0) {
            await Track.bulkWrite(
                releasableTrackSchedules.map((schedule) => ({
                    updateOne: {
                        filter: {
                            _id: schedule.targetId,
                            approvalStatus: "approved",
                            activeStatus: { $ne: "blocked" },
                            releaseStatus: { $ne: TRACK_RELEASE_STATUS.RELEASED },
                        },
                        update: {
                            $set: {
                                activeStatus: "active",
                                releaseDate: schedule.scheduledAt,
                                releaseStatus: TRACK_RELEASE_STATUS.RELEASED,
                                releasedAt: schedule.scheduledAt,
                                hiddenReason: "",
                                hiddenAt: null,
                            },
                        },
                    },
                }))
            );
        }
    }

    let releasablePodcastSchedules = [];

    if (duePodcastIds.length > 0) {
        const duePodcasts = await Podcast.find({
            _id: { $in: duePodcastIds },
            approvalStatus: "approved",
            isBlocked: { $ne: true },
            releaseStatus: { $ne: "released" },
        })
            .select("_id")
            .lean();

        const releasablePodcastIdSet = new Set(
            duePodcasts.map((podcast) => podcast._id.toString())
        );

        releasablePodcastSchedules = duePodcastSchedules.filter((schedule) =>
            releasablePodcastIdSet.has(schedule.targetId.toString())
        );

        if (releasablePodcastSchedules.length > 0) {
            await Podcast.bulkWrite(
                releasablePodcastSchedules.map((schedule) => ({
                    updateOne: {
                        filter: {
                            _id: schedule.targetId,
                            approvalStatus: "approved",
                            isBlocked: { $ne: true },
                            releaseStatus: { $ne: "released" },
                        },
                        update: {
                            $set: {
                                visibility: "public",
                                releaseDate: schedule.scheduledAt,
                                releaseStatus: "released",
                                releasedAt: schedule.scheduledAt,
                            },
                        },
                    },
                }))
            );
        }
    }

    const releasableScheduleIds = [
        ...releasableTrackSchedules.map((schedule) => schedule._id),
        ...releasableAlbumSchedules.map((schedule) => schedule._id),
        ...releasablePodcastSchedules.map((schedule) => schedule._id),
    ];

    if (releasableScheduleIds.length === 0) {
        return {
            updatedCount: 0,
        };
    }

    const releasableScheduleIdSet = new Set(
        releasableScheduleIds.map((id) => id.toString())
    );

    const releasableSchedules = dueSchedules.filter((schedule) =>
        releasableScheduleIdSet.has(schedule._id.toString())
    );

    await ReleaseSchedule.bulkWrite(
        releasableSchedules.map((schedule) => ({
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

    for (const schedule of releasableSchedules) {
        if (schedule.type === "track") {
            try {
                await createNewReleaseNotificationForArtistFollowers({
                    artistId: schedule.artistId,
                    trackId: schedule.targetId,
                    io,
                });
            } catch (error) {
                console.error(
                    "Failed to create new release notification for released schedule:",
                    error
                );
            }
        }
    }

    return {
        updatedCount: releasableSchedules.length,
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
    const podcastIds = schedules
        .filter((schedule) => schedule.type === "podcast")
        .map((schedule) => schedule.targetId);

    const [albums, tracks, podcasts] = await Promise.all([
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
        podcastIds.length > 0
            ? Podcast.find({
                _id: { $in: podcastIds },
                creator: artistId,
            }).lean()
            : [],
    ]);

    return {
        albumMap: new Map(albums.map((album) => [album._id.toString(), album])),
        trackMap: new Map(tracks.map((track) => [track._id.toString(), track])),
        podcastMap: new Map(podcasts.map((podcast) => [podcast._id.toString(), podcast])),
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

    const { albumMap, trackMap, podcastMap } = await mapReleaseTargets({
        schedules,
        artistId: artist._id,
    });

    const releaseSchedules = schedules
        .map((schedule) => {
            const target =
                schedule.type === "album"
                    ? albumMap.get(schedule.targetId.toString())
                    : schedule.type === "podcast"
                        ? podcastMap.get(schedule.targetId.toString())
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
        throw new AppError("Không tìm thấy lịch phát hành.", 404);
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
    assertArtistOperational(artist);
    await publishDueReleaseSchedules({ artistId: artist._id });
    const schedule = await ReleaseSchedule.findOne({
        _id: scheduleId,
        artistId: artist._id,
    });

    if (!schedule) {
        throw new AppError("Không tìm thấy lịch phát hành.", 404);
    }

    if (schedule.status === "cancelled") {
        throw new AppError("Lịch phát hành đã được hủy trước đó.", 409);
    }

    if (schedule.status === "released") {
        throw new AppError("Không thể hủy lịch đã phát hành.", 409);
    }

    if (new Date(schedule.scheduledAt).getTime() <= Date.now()) {
        throw new AppError("Lịch phát hành này không còn có thể hủy.", 409);
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
        target,
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
                    releaseStatus: schedule.type === "podcast"
                        ? nextReleaseDate ? "scheduled" : "unreleased"
                        : nextReleaseDate
                            ? TRACK_RELEASE_STATUS.SCHEDULED
                            : TRACK_RELEASE_STATUS.UNRELEASED,
                    releasedAt: null,
                },
            }),
            createdAt: schedule.createdAt || null,
            updatedAt: schedule.updatedAt || null,
        },
    };
};

const createMyReleaseSchedule = async (userId, payload, io = null) => {
    const artist = await getArtistByUserId(userId);
    assertArtistOperational(artist);
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

    if (payload.type === "track") {
        await ensureTrackHasNotBeenReleased({
            artistId: artist._id,
            target,
        });
    }

    if (payload.type === "album") {
        ensureAlbumCanBeScheduledForRelease(target);
        await ensureAlbumHasNotBeenReleased({
            artistId: artist._id,
            target,
        });
    }

    if (payload.type === "podcast") {
        await ensurePodcastHasNotBeenReleased({
            artistId: artist._id,
            target,
        });
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
        target,
        targetId: payload.targetId,
        scheduledAt,
    });

    if (isImmediateRelease) {
        await syncTargetVisibilityForRelease({
            type: payload.type,
            target,
            targetId: payload.targetId,
            releasedAt: scheduledAt,
        });
    }
    
    if (payload.type === "track") {
        try {
            if (isImmediateRelease) {
                await createNewReleaseNotificationForArtistFollowers({
                    artistId: artist._id,
                    trackId: payload.targetId,
                    io,
                });
            } else {
                await createUpcomingReleaseNotificationForArtistFollowers({
                    artistId: artist._id,
                    trackId: payload.targetId,
                    io,
                });
            }
        } catch (error) {
            console.error("Failed to create release notification:", error);
        }
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
                releaseStatus: payload.type === "podcast"
                    ? isImmediateRelease ? "released" : "scheduled"
                    : isImmediateRelease
                        ? TRACK_RELEASE_STATUS.RELEASED
                        : TRACK_RELEASE_STATUS.SCHEDULED,
                releasedAt: isImmediateRelease ? scheduledAt : null,
            },
        }),
    };
};

const updateMyReleaseSchedule = async (userId, scheduleId, payload) => {
    const artist = await getArtistByUserId(userId);
    assertArtistOperational(artist);
    await publishDueReleaseSchedules({ artistId: artist._id });
    const schedule = await ReleaseSchedule.findOne({
        _id: scheduleId,
        artistId: artist._id,
    });

    if (!schedule) {
        throw new AppError("Không tìm thấy lịch phát hành.", 404);
    }

    ensureReleaseScheduleIsEditable(schedule);

    const scheduledAt = ensureScheduledAtIsValid(payload.scheduledAt);
    const target = await getOwnedReleaseTarget({
        artistId: artist._id,
        type: schedule.type,
        targetId: schedule.targetId,
    });

    if (
        schedule.type === "track" &&
        resolveTrackReleaseStatus(target) === TRACK_RELEASE_STATUS.RELEASED
    ) {
        throw new AppError("Không thể lên lịch lại cho bài hát đã phát hành.", 409, {
            field: "targetId",
            code: "TRACK_ALREADY_RELEASED",
        });
    }

    if (
        schedule.type === "podcast" &&
        (target?.releaseStatus === "released" || target?.releasedAt)
    ) {
        throw new AppError("Không thể chỉnh sửa lịch của Podcast đã phát hành.", 409, {
            field: "targetId",
            code: "PODCAST_ALREADY_RELEASED",
        });
    }

    schedule.scheduledAt = scheduledAt;
    schedule.releasedAt = null;
    await schedule.save();

    await syncTargetReleaseDate({
        type: schedule.type,
        target,
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
                    releaseStatus: schedule.type === "podcast"
                        ? "scheduled"
                        : TRACK_RELEASE_STATUS.SCHEDULED,
                    releasedAt: null,
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
