export const normalizePositiveInteger = (value, defaultValue) => {
    const number = Number(value);

    if (!Number.isInteger(number) || number <= 0) {
        return defaultValue;
    }

    return number;
};

export const formatUserPlaylist = (playlist) => {
    return {
        playlistId: playlist._id,
        title: playlist.title,
        description: playlist.description || "",
        coverImage: playlist.coverImage || "",
        totalTracks: Array.isArray(playlist.trackList)
            ? playlist.trackList.length
            : 0,
        userName: playlist.userId?.profile?.fullName || "",
        status: playlist.status,
        createdAt: playlist.createdAt,
    };
};