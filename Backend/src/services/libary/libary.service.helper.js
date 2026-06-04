const normalizePositiveInteger = (value, defaultValue) => {
    const parsedValue = Number.parseInt(value, 10);

    if (Number.isNaN(parsedValue) || parsedValue < 1) {
        return defaultValue;
    }

    return parsedValue;
};

const formatFollowedArtist = (interaction) => {
    if (!interaction?.targetId) {
        return null;
    }

    return {
        artistId: interaction.targetId._id,
        name: interaction.targetId.name,
        avatar: interaction.targetId.avatar,
        followedAt: interaction.createdAt,
    };
};

const formatFollowedAlbum = (interaction) => {
    if (!interaction?.targetId) {
        return null;
    }

    const album = interaction.targetId;

    return {
        albumId: album._id,
        title: album.title,
        coverImage: album.coverImage,
        artistName: album.artistId?.name || "",
        trackList: album.trackList || [],
    };
};
export {
    normalizePositiveInteger,
    formatFollowedArtist,
    formatFollowedAlbum,
};
