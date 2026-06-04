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

export {
    normalizePositiveInteger,
    formatFollowedArtist,
};
