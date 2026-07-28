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

const isBlockedTrack = (track) => track?.activeStatus === "blocked";

const formatPlaylistTrack = (playlistTrack) => {
    const rawRef = playlistTrack.trackId;
    const isPopulatedTrack =
        rawRef &&
        typeof rawRef === "object" &&
        rawRef._id &&
        ("title" in rawRef || "duration" in rawRef);
    const trackDoc = isPopulatedTrack ? rawRef : null;
    const refId = trackDoc ? trackDoc._id : rawRef;

    return {
        order: playlistTrack.order,
        addedAt: playlistTrack.addedAt,
        trackId: refId ? toId(refId) : null,
        track: trackDoc
            ? {
                id: toId(trackDoc._id),
                title: trackDoc.title,
                duration: trackDoc.duration,
                avatar: trackDoc.avatar,
                coverImage: trackDoc.coverImage,
                audioFiles: trackDoc.audioFiles,
                lyricsStatic: trackDoc.lyricsStatic,
                lyricsSyncUrl: trackDoc.lyricsSyncUrl,
                stats: trackDoc.stats,
                releaseDate: trackDoc.releaseDate,
                activeStatus: trackDoc.activeStatus,
                approvalStatus: trackDoc.approvalStatus,
                isBlocked: isBlockedTrack(trackDoc),
                artist: trackDoc.artist_artistId
                    ? {
                        id: toId(trackDoc.artist_artistId._id),
                        name: trackDoc.artist_artistId.name,
                        avatar: trackDoc.artist_artistId.avatar,
                        coverImage: trackDoc.artist_artistId.coverImage,
                    }
                    : null,
                album: trackDoc.album_albumId
                    ? {
                        id: toId(trackDoc.album_albumId._id),
                        title: trackDoc.album_albumId.title,
                        coverImage: trackDoc.album_albumId.coverImage,
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
