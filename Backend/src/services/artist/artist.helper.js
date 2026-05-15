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
    totalPlays: album.totalPlays,
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
    formatArtistTrack,
    formatArtistProfile,
    normalizePositiveInteger,
};
