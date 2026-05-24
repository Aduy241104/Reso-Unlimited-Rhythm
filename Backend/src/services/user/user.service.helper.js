const normalizeProfile = (profile = {}) => ({
    fullName: profile.fullName ?? "",
    gender: profile.gender ?? "prefer_not_to_say",
    country: profile.country ?? "",
});

const normalizeId = (user = {}) => {
    if (user.id) {
        return user.id.toString();
    }

    if (user._id) {
        return user._id.toString();
    }

    return "";
};

export const formatCurrentUserProfile = (user = {}) => ({
    id: normalizeId(user),
    email: user.email ?? "",
    username: user.username ?? "",
    avatar: user.avatar ?? "",
    role: user.role ?? "",
    activeStatus: user.activeStatus ?? "",
    profile: normalizeProfile(user.profile),
});

export default {
    formatCurrentUserProfile,
};
