const toIdString = (value) => {
    if (!value) {
        return "";
    }

    if (typeof value === "string") {
        return value;
    }

    return value.toString();
};

export const formatArtistProfile = (artist) => {
    const user =
        artist.userId && typeof artist.userId === "object" ? artist.userId : null;

    const userId = user ? toIdString(user._id) : toIdString(artist.userId);

    return {
        id: toIdString(artist._id),
        userId,
        name: artist.name,
        bio: artist.bio ?? "",
        avatar: artist.avatar ?? "",
        coverImage: artist.coverImage ?? "",
        socialLinks: artist.socialLinks ?? {},
        verificationStatus: artist.verificationStatus,
        stats: artist.stats ?? { followers: 0, totalStreams: 0 },
        activeStatus: artist.activeStatus,
        blockedReason: artist.blockedReason ?? "",
        createdAt: artist.createdAt,
        updatedAt: artist.updatedAt,
        account: user
            ? {
                email: user.email ?? "",
                fullName: user.profile?.fullName ?? "",
                userAvatar: user.avatar ?? "",
            }
            : null,
    };
};
