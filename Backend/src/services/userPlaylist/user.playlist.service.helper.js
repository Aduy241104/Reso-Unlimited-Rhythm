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
const toId = (value) => {
    if (!value) {
        return "";
    }

    return value.toString();
};

const getTrackCoverImage = (track) => {
    if (Array.isArray(track.coverImage)) {
        return track.coverImage[0] || "";
    }

    return track.coverImage || track.avatar || "";
};

const formatPlaylistTrack = (playlistTrack) => {
    const track = playlistTrack.trackId;

    if (!track) {
        return null;
    }

    return {
        order: playlistTrack.order,
        trackId: toId(track._id),
        track: {
            id: toId(track._id),
            title: track.title || "",
            duration: track.duration || 0,
            coverImage: getTrackCoverImage(track),
            avatar: track.avatar || "",
            audioFiles: track.audioFiles || [],
            lyricsStatic: track.lyricsStatic || "",
            lyricsSyncUrl: track.lyricsSyncUrl || "",
            stats: track.stats || {},
            releaseDate: track.releaseDate,
            artist: track.artist_artistId
                ? {
                    id: toId(track.artist_artistId._id),
                    name: track.artist_artistId.name || "",
                    avatar: track.artist_artistId.avatar || "",
                    coverImage: track.artist_artistId.coverImage || "",
                }
                : null,
            album: track.album_albumId
                ? {
                    id: toId(track.album_albumId._id),
                    title: track.album_albumId.title || "",
                    coverImage: track.album_albumId.coverImage || "",
                }
                : null,
        },
    };
};

export const formatPlaylistDetail = (playlist) => ({
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