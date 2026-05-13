const formatTrackDetail = (track) => {
    if (!track) return null;

    return {
        _id: track._id,
        title: track.title,
        artist: track.artist_artistId
            ? {
                  _id: track.artist_artistId._id,
                  name: track.artist_artistId.name,
                  avatar: track.artist_artistId.avatar,
                  coverImage: track.artist_artistId.coverImage,
              }
            : null,
        album: track.album_albumId
            ? {
                  _id: track.album_albumId._id,
                  title: track.album_albumId.title,
                  avatar: track.album_albumId.avatar,
              }
            : null,
        genres: track.genreIds
            ? track.genreIds.map((genre) => ({
                  _id: genre._id,
                  name: genre.name,
              }))
            : [],
        audioFiles: track.audioFiles || [],
        duration: track.duration,
        avatar: track.avatar,
        coverImage: track.coverImage || [],
        lyricsStatic: track.lyricsStatic,
        lyricsSyncUrl: track.lyricsSyncUrl,
        stats: track.stats || {
            totalLike: 0,
            totalPlay: 0,
        },
        releaseDate: track.releaseDate,
        activeStatus: track.activeStatus,
        approvalStatus: track.approvalStatus,
        blockedReason: track.blockedReason,
        hiddenReason: track.hiddenReason,
        hiddenAt: track.hiddenAt,
        createdAt: track.createdAt,
        updatedAt: track.updatedAt,
    };
};

const formatTrackItem = (track) => {
    if (!track) return null;

    return {
        _id: track._id,
        title: track.title,
        artist: track.artist_artistId
            ? {
                  _id: track.artist_artistId._id,
                  name: track.artist_artistId.name,
                  avatar: track.artist_artistId.avatar,
              }
            : null,
        duration: track.duration,
        avatar: track.avatar,
        stats: track.stats,
        activeStatus: track.activeStatus,
        approvalStatus: track.approvalStatus,
    };
};

export { formatTrackDetail, formatTrackItem };
