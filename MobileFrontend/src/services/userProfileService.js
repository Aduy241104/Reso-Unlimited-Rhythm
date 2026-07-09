import axiosClient from '../api/axiosClient';

const USER_PROFILE_ENDPOINT = '/users/me';

const pickFirstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

const getPayload = (response) => response?.data || response || {};

const roleLabels = {
  admin: 'Quản trị viên',
  artist: 'Nghệ sĩ',
  user: 'Người nghe',
};

const activeStatusLabels = {
  active: 'Đang hoạt động',
  inactive: 'Tạm ngưng',
  blocked: 'Bị khóa',
};

const resolveDisplayName = (user = {}) => {
  const fullName = user?.profile?.fullName || user?.fullName || user?.name || '';

  if (fullName) {
    return fullName;
  }

  const email = String(user?.email || '').trim();

  if (email.includes('@')) {
    return email.split('@')[0];
  }

  return email || 'Tai khoan cua ban';
};

const normalizeUserProfile = (payload = {}, fallbackUser = null) => {
  const source = payload?.user || payload?.data?.user || payload?.profile || payload?.data || payload || {};
  const mergedUser = {
    ...(fallbackUser || {}),
    ...(source || {}),
    profile: {
      ...(fallbackUser?.profile || {}),
      ...(source?.profile || {}),
    },
  };
  const normalizedRole = String(mergedUser?.role || '').trim();
  const normalizedStatus = String(mergedUser?.activeStatus || '').trim();

  return {
    id: String(pickFirstDefined(mergedUser?.id, mergedUser?._id, '')),
    displayName: resolveDisplayName(mergedUser),
    email: String(pickFirstDefined(mergedUser?.email, fallbackUser?.email, '')).trim(),
    username: String(pickFirstDefined(mergedUser?.username, fallbackUser?.username, '')).trim(),
    avatar: String(pickFirstDefined(mergedUser?.avatar, fallbackUser?.avatar, '')).trim(),
    role: normalizedRole,
    roleLabel: roleLabels[normalizedRole] || 'Tai khoan',
    activeStatus: normalizedStatus,
    activeStatusLabel: activeStatusLabels[normalizedStatus] || 'Khong xac dinh',
    isPremium: Boolean(mergedUser?.isPremium),
    profile: mergedUser?.profile || {},
  };
};

export const userProfileService = {
  async getMyProfile(fallbackUser = null) {
    const response = await axiosClient.get(USER_PROFILE_ENDPOINT);
    const payload = getPayload(response);

    return normalizeUserProfile(payload, fallbackUser);
  },

  normalizeUserProfile,
};

export default userProfileService;
