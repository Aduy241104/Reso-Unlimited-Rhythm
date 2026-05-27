const toId = (value) => {
    if (!value) {
        return null;
    }

    return value.toString();
};

const normalizePositiveInteger = (value, fallback) => {
    const parsedValue = Number.parseInt(value, 10);

    if (Number.isNaN(parsedValue) || parsedValue < 1) {
        return fallback;
    }

    return parsedValue;
};

const formatArtistAlbum = (album) => ({
    id: toId(album._id),
    title: album.title,
    coverImage: album.coverImage,
    releaseDate: album.releaseDate,
    status: album.status,
    totalDuration: album.totalDuration,
    trackCount: Array.isArray(album.trackList) ? album.trackList.length : 0,
});

const formatArtistTrack = (track) => ({
    id: toId(track._id),
    title: track.title,
    duration: track.duration,
    avatar: track.avatar,
    coverImage: track.coverImage,
    stats: track.stats,
    releaseDate: track.releaseDate,
    album: track.album_albumId
        ? {
            id: toId(track.album_albumId._id),
            title: track.album_albumId.title,
            coverImage: track.album_albumId.coverImage,
            releaseDate: track.album_albumId.releaseDate,
        }
        : null,
});

const formatArtistComingRelease = ({ schedule, target }) => {
    const isTrackRelease = schedule.type === "track";

    return {
        id: toId(schedule._id),
        type: isTrackRelease ? "single" : "album",
        sourceType: schedule.type,
        scheduledAt: schedule.scheduledAt,
        releasedAt: schedule.releasedAt || null,
        status: schedule.status,
        item: isTrackRelease
            ? {
                id: toId(target?._id),
                title: target?.title || "",
                duration: target?.duration || 0,
                avatar: target?.avatar || "",
                coverImage: Array.isArray(target?.coverImage)
                    ? target.coverImage
                    : [],
                releaseDate: target?.releaseDate || null,
            }
            : {
                id: toId(target?._id),
                title: target?.title || "",
                coverImage: target?.coverImage || "",
                releaseDate: target?.releaseDate || null,
                trackCount: Array.isArray(target?.trackList)
                    ? target.trackList.length
                    : 0,
            },
    };
};

const formatArtistProfile = ({ artist, artistStat, albums, tracks }) => ({
    artist: {
        id: toId(artist._id),
        userId: toId(artist.userId),
        name: artist.name,
        bio: artist.bio,
        avatar: artist.avatar,
        coverImage: artist.coverImage,
        socialLinks: artist.socialLinks,
        stats: {
            followers: artist.stats?.followers || 0,
            totalStreams: artist.stats?.totalStreams || 0,
            totalFollowers: artistStat?.totalFollowers || artist.stats?.followers || 0,
            monthlyListeners: artistStat?.monthlyListeners || 0,
        },
        albumCount: albums.length,
        trackCount: tracks.length,
    },
    albums: albums.map(formatArtistAlbum),
    tracks: tracks.map(formatArtistTrack),
});

export {
    formatArtistAlbum,
    formatArtistComingRelease,
    formatArtistTrack,
    formatArtistProfile,
    normalizePositiveInteger,
};
