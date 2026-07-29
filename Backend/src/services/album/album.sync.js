import Album from "../../models/Album.js";
import Track from "../../models/Track.js";

const toTrackIdString = (trackRef) => {
    if (!trackRef) {
        return null;
    }

    if (typeof trackRef === "object" && trackRef._id) {
        return trackRef._id.toString();
    }

    return trackRef.toString();
};

const computeTotalDurationFromTrackList = (trackList = [], durationByTrackId = null) =>
    trackList.reduce((sum, entry) => {
        const ref = entry?.trackId;

        if (!ref) {
            return sum;
        }

        if (typeof ref === "object" && ref !== null && ref.duration !== undefined) {
            return sum + (Number(ref.duration) || 0);
        }

        if (durationByTrackId) {
            const trackId = toTrackIdString(ref);
            return sum + (durationByTrackId.get(trackId) || 0);
        }

        return sum;
    }, 0);

const resolveAlbumTotalDuration = (album, durationByTrackId = null) => {
    const stored = Number(album?.totalDuration);

    if (Number.isFinite(stored) && stored > 0) {
        return stored;
    }

    return computeTotalDurationFromTrackList(album?.trackList, durationByTrackId);
};

const buildDurationByTrackId = async (albums) => {
    const trackIds = new Set();

    for (const album of albums) {
        for (const entry of album.trackList || []) {
            const trackId = toTrackIdString(entry?.trackId);

            if (trackId) {
                trackIds.add(trackId);
            }
        }
    }

    if (trackIds.size === 0) {
        return new Map();
    }

    const found = await Track.find({ _id: { $in: [...trackIds] } })
        .select("duration")
        .lean();

    return new Map(
        found.map((doc) => [doc._id.toString(), Number(doc.duration) || 0])
    );
};

const backfillAlbumTotalDuration = (albums) => {
    const updates = albums
        .filter((album) => {
            const resolved = Number(album.totalDuration) || 0;
            const stored = Number(album._storedTotalDuration) || 0;
            return resolved > 0 && stored !== resolved;
        })
        .map((album) =>
            Album.updateOne(
                { _id: album._id },
                { $set: { totalDuration: album.totalDuration } }
            )
        );

    if (updates.length > 0) {
        void Promise.allSettled(updates);
    }
};

const enrichAlbumsWithTotalDuration = async (albums) => {
    if (!Array.isArray(albums) || albums.length === 0) {
        return;
    }

    const durationByTrackId = await buildDurationByTrackId(albums);

    for (const album of albums) {
        album._storedTotalDuration = album.totalDuration;
        album.totalDuration = resolveAlbumTotalDuration(album, durationByTrackId);
    }

    backfillAlbumTotalDuration(albums);
};

const enrichAlbumWithTotalDuration = async (album) => {
    if (!album) {
        return;
    }

    const durationByTrackId = await buildDurationByTrackId([album]);

    album._storedTotalDuration = album.totalDuration;
    album.totalDuration = resolveAlbumTotalDuration(album, durationByTrackId);

    backfillAlbumTotalDuration([album]);
};

const syncAlbumTotalDuration = async (album) => {
    const entries = album.trackList || [];

    if (entries.length === 0) {
        album.totalDuration = 0;
        return;
    }

    const ids = entries.map((entry) => entry.trackId);
    const found = await Track.find({ _id: { $in: ids } }).select("duration").lean();
    const durationById = new Map(
        found.map((doc) => [doc._id.toString(), Number(doc.duration) || 0])
    );

    album.totalDuration = entries.reduce(
        (sum, entry) => sum + (durationById.get(toTrackIdString(entry.trackId)) || 0),
        0
    );
};

export {
    computeTotalDurationFromTrackList,
    enrichAlbumWithTotalDuration,
    enrichAlbumsWithTotalDuration,
    resolveAlbumTotalDuration,
    syncAlbumTotalDuration,
};
