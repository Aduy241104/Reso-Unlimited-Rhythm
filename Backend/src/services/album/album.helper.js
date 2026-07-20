const normalizePositiveInteger = (value, fallback) => {
    const parsedValue = Number.parseInt(value, 10);

    if (Number.isNaN(parsedValue) || parsedValue < 1) {
        return fallback;
    }

    return parsedValue;
};

const toId = (value) => {
    if (!value) {
        return null;
    }

    return value.toString();
};

const isBlockedTrack = (track) => track?.activeStatus === "blocked";

const formatAlbumItem = (album) => ({
    id: toId(album._id),
    title: album.title,
    coverImage: album.coverImage,
    releaseDate: album.releaseDate,
    status: album.status,
    totalDuration: album.totalDuration,
    trackCount: Array.isArray(album.trackList) ? album.trackList.length : 0,
    artist: album.artistId
        ? {
            id: toId(album.artistId._id),
            name: album.artistId.name,
            avatar: album.artistId.avatar,
            coverImage: album.artistId.coverImage,
        }
        : null,
    createdAt: album.createdAt,
    updatedAt: album.updatedAt,
});

const formatAlbumTrack = (trackItem) => {
    const track = trackItem.trackId;

    return {
        order: trackItem.order,
        track: track
            ? {
                id: toId(track._id),
                title: track.title,
                duration: track.duration,
                avatar: track.avatar,
                coverImage: track.coverImage,
                audioFiles: track.audioFiles,
                lyricsStatic: track.lyricsStatic,
                lyricsSyncUrl: track.lyricsSyncUrl,
                stats: track.stats,
                releaseDate: track.releaseDate,
                activeStatus: track.activeStatus,
                approvalStatus: track.approvalStatus,
                isBlocked: isBlockedTrack(track),
                artist: track.artist_artistId
                    ? {
                        id: toId(track.artist_artistId._id),
                        name: track.artist_artistId.name,
                        avatar: track.artist_artistId.avatar,
                        coverImage: track.artist_artistId.coverImage,
                    }
                    : null,
            }
            : null,
    };
};

const formatAlbumDetail = (album) => ({
    id: toId(album._id),
    title: album.title,
    coverImage: album.coverImage,
    releaseDate: album.releaseDate,
    status: album.status,
    totalDuration: album.totalDuration,
    trackCount: Array.isArray(album.trackList) ? album.trackList.length : 0,
    artist: album.artistId
        ? {
            id: toId(album.artistId._id),
            name: album.artistId.name,
            bio: album.artistId.bio,
            avatar: album.artistId.avatar,
            coverImage: album.artistId.coverImage,
            activeStatus: album.artistId.activeStatus,
            stats: album.artistId.stats,
        }
        : null,
    tracks: (album.trackList || [])
        .sort((firstTrack, secondTrack) => firstTrack.order - secondTrack.order)
        .map(formatAlbumTrack),
    createdAt: album.createdAt,
    updatedAt: album.updatedAt,
});

const formatAlbumFollowState = ({ albumId, isFollowing }) => ({
    albumId: toId(albumId),
    isFollowing,
});

export {
    formatAlbumDetail,
    formatAlbumFollowState,
    formatAlbumItem,
    normalizePositiveInteger,
};
