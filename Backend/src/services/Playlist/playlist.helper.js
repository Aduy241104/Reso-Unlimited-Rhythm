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

const formatPlaylistTrack = (playlistTrack) => {
    const track = playlistTrack.trackId;

    return {
        order: playlistTrack.order,
        addedAt: playlistTrack.addedAt,
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
                artist: track.artist_artistId
                    ? {
                        id: toId(track.artist_artistId._id),
                        name: track.artist_artistId.name,
                        avatar: track.artist_artistId.avatar,
                        coverImage: track.artist_artistId.coverImage,
                    }
                    : null,
                album: track.album_albumId
                    ? {
                        id: toId(track.album_albumId._id),
                        title: track.album_albumId.title,
                        coverImage: track.album_albumId.coverImage,
                    }
                    : null,
            }
            : null,
    };
};

const formatPlaylistDetail = (playlist) => ({
    id: toId(playlist._id),
    title: playlist.title,
    description: playlist.description,
    type: playlist.type,
    coverImage: playlist.coverImage,
    isPublic: playlist.isPublic,
    isHidden: playlist.isHidden,
    trackCount: playlist.trackCount,
    totalDuration: playlist.totalDuration,
    aiPrompt: playlist.aiPrompt,
    aiGeneratedAt: playlist.aiGeneratedAt,
    owner: playlist.userId
        ? {
            id: toId(playlist.userId._id),
            email: playlist.userId.email || "",
            fullName: playlist.userId.profile?.fullName || "",
            avatar: playlist.userId.avatar || "",
            role: playlist.userId.role,
        }
        : null,
    tracks: (playlist.tracks || [])
        .sort((firstTrack, secondTrack) => firstTrack.order - secondTrack.order)
        .map(formatPlaylistTrack),
    createdAt: playlist.createdAt,
    updatedAt: playlist.updatedAt,
});

const formatSystemPlaylistSummary = (playlist) => ({
    id: toId(playlist._id),
    title: playlist.title,
    description: playlist.description ?? "",
    type: playlist.type,
    coverImage: playlist.coverImage ?? "",
    isPublic: playlist.isPublic,
    isHidden: playlist.isHidden,
    trackCount: playlist.trackCount ?? 0,
    totalDuration: playlist.totalDuration ?? 0,
    createdAt: playlist.createdAt,
    updatedAt: playlist.updatedAt,
});

export {
    formatPlaylistDetail,
    formatSystemPlaylistSummary,
    normalizePositiveInteger,
};
