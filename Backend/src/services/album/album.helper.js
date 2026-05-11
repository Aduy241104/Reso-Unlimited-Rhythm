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

const formatAlbumItem = (album) => ({
    id: toId(album._id),
    title: album.title,
    coverImage: album.coverImage,
    releaseDate: album.releaseDate,
    status: album.status,
    totalPlays: album.totalPlays,
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

export {
    formatAlbumItem,
    normalizePositiveInteger,
};
