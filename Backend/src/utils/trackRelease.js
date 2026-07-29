const TRACK_RELEASE_STATUS = Object.freeze({
    UNRELEASED: "unreleased",
    SCHEDULED: "scheduled",
    RELEASED: "released",
});

const VALID_TRACK_RELEASE_STATUSES = new Set(Object.values(TRACK_RELEASE_STATUS));

const hasPersistedReleaseStatus = (track) => {
    if (!track || typeof track !== "object") {
        return false;
    }

    if (typeof track.$isDefault === "function") {
        return !track.$isDefault("releaseStatus");
    }

    return Object.prototype.hasOwnProperty.call(track, "releaseStatus");
};

const resolveTrackReleaseStatus = (track, now = new Date()) => {
    const explicitStatus = String(track?.releaseStatus || "").trim().toLowerCase();

    if (track?.releasedAt || explicitStatus === TRACK_RELEASE_STATUS.RELEASED) {
        return TRACK_RELEASE_STATUS.RELEASED;
    }

    if (explicitStatus === TRACK_RELEASE_STATUS.SCHEDULED) {
        return TRACK_RELEASE_STATUS.SCHEDULED;
    }

    if (
        explicitStatus === TRACK_RELEASE_STATUS.UNRELEASED &&
        hasPersistedReleaseStatus(track)
    ) {
        return TRACK_RELEASE_STATUS.UNRELEASED;
    }

    const releaseDate = track?.releaseDate ? new Date(track.releaseDate) : null;
    const releaseTime = releaseDate?.getTime();

    if (!Number.isFinite(releaseTime) || track?.approvalStatus !== "approved") {
        return TRACK_RELEASE_STATUS.UNRELEASED;
    }

    if (releaseTime > now.getTime()) {
        return TRACK_RELEASE_STATUS.SCHEDULED;
    }

    if (["active", "hidden"].includes(track?.activeStatus)) {
        return TRACK_RELEASE_STATUS.RELEASED;
    }

    return VALID_TRACK_RELEASE_STATUSES.has(explicitStatus)
        ? explicitStatus
        : TRACK_RELEASE_STATUS.UNRELEASED;
};

const resolveTrackReleasedAt = (track) => {
    if (resolveTrackReleaseStatus(track) !== TRACK_RELEASE_STATUS.RELEASED) {
        return null;
    }

    return track?.releasedAt || track?.releaseDate || null;
};

const buildReleasedTrackFilter = (now = new Date()) => ({
    $or: [
        { releaseStatus: TRACK_RELEASE_STATUS.RELEASED },
        {
            releaseStatus: { $exists: false },
            releaseDate: { $lte: now },
        },
        {
            releaseStatus: { $exists: false },
            releaseDate: null,
        },
    ],
});

export {
    TRACK_RELEASE_STATUS,
    buildReleasedTrackFilter,
    resolveTrackReleasedAt,
    resolveTrackReleaseStatus,
};
