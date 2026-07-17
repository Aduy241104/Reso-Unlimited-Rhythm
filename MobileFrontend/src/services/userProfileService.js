import axiosClient from '../api/axiosClient';

const USER_PROFILE_ENDPOINT = '/users/me';
const ALLOWED_GENDERS = new Set(['male', 'female', 'other']);

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

const genderLabels = {
  male: 'Nam',
  female: 'Nữ',
  other: 'Khác',
};

const genderOptions = [
  { value: 'male', label: genderLabels.male },
  { value: 'female', label: genderLabels.female },
  { value: 'other', label: genderLabels.other },
];

const normalizeGender = (value) => {
  const normalizedValue = String(value || '').trim().toLowerCase();
  return ALLOWED_GENDERS.has(normalizedValue) ? normalizedValue : '';
};

const normalizeProfileFields = (profile = {}) => {
  const fullName = String(profile?.fullName || '').trim();
  const gender = normalizeGender(profile?.gender);
  const country = String(profile?.country || '').trim();

  return {
    fullName,
    gender,
    country,
    genderLabel: genderLabels[gender] || 'Chưa cập nhật',
  };
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

  return email || 'Tài khoản của bạn';
};

const buildProfileDraft = (profile = null) => normalizeProfileFields(profile?.profile || profile || {});

const normalizeUserProfile = (payload = {}, fallbackUser = null) => {
  const source = payload?.user || payload?.data?.user || payload?.profile || payload?.data || payload || {};
  const mergedProfile = normalizeProfileFields({
    ...(fallbackUser?.profile || {}),
    ...(source?.profile || {}),
  });
  const mergedUser = {
    ...(fallbackUser || {}),
    ...(source || {}),
    profile: mergedProfile,
  };
  const normalizedRole = String(mergedUser?.role || '').trim();
  const normalizedStatus = String(mergedUser?.activeStatus || '').trim();

  return {
    id: String(pickFirstDefined(mergedUser?.id, mergedUser?._id, '')).trim(),
    displayName: resolveDisplayName(mergedUser),
    email: String(pickFirstDefined(mergedUser?.email, fallbackUser?.email, '')).trim(),
    username: String(pickFirstDefined(mergedUser?.username, fallbackUser?.username, '')).trim(),
    avatar: String(pickFirstDefined(mergedUser?.avatar, fallbackUser?.avatar, '')).trim(),
    role: normalizedRole,
    roleLabel: roleLabels[normalizedRole] || 'Tài khoản',
    activeStatus: normalizedStatus,
    activeStatusLabel: activeStatusLabels[normalizedStatus] || 'Không xác định',
    isPremium: Boolean(mergedUser?.isPremium),
    profile: mergedProfile,
  };
};

const hasProfileChanges = (draft, currentProfile = null) => {
  const nextDraft = buildProfileDraft(draft);
  const currentDraft = buildProfileDraft(currentProfile);

  return (
    nextDraft.fullName !== currentDraft.fullName ||
    nextDraft.gender !== currentDraft.gender ||
    nextDraft.country !== currentDraft.country
  );
};

const validateProfileDraft = (draft, currentProfile = null) => {
  const nextDraft = buildProfileDraft(draft);
  const currentDraft = buildProfileDraft(currentProfile);
  const errors = {};

  if (nextDraft.fullName && nextDraft.fullName.length < 2) {
    errors.fullName = 'Họ tên phải có ít nhất 2 ký tự.';
  }

  if (!nextDraft.fullName && currentDraft.fullName) {
    errors.fullName = 'Họ tên không được để trống.';
  }

  if (draft?.gender && !nextDraft.gender) {
    errors.gender = 'Giới tính không hợp lệ.';
  }

  return errors;
};

const buildProfileUpdatePayload = (draft, currentProfile = null) => {
  const nextDraft = buildProfileDraft(draft);
  const currentDraft = buildProfileDraft(currentProfile);
  const payload = {};

  if (nextDraft.fullName && nextDraft.fullName !== currentDraft.fullName) {
    payload.fullName = nextDraft.fullName;
  }

  if (nextDraft.gender && nextDraft.gender !== currentDraft.gender) {
    payload.gender = nextDraft.gender;
  }

  if (nextDraft.country !== currentDraft.country) {
    payload.country = nextDraft.country;
  }

  return payload;
};

export const userProfileService = {
  async getMyProfile(fallbackUser = null) {
    const response = await axiosClient.get(USER_PROFILE_ENDPOINT);
    const payload = getPayload(response);

    return normalizeUserProfile(payload, fallbackUser);
  },

  async updateMyProfile(draft, currentProfile = null) {
    const payload = buildProfileUpdatePayload(draft, currentProfile);

    if (Object.keys(payload).length === 0) {
      return normalizeUserProfile(currentProfile, currentProfile);
    }

    const response = await axiosClient.patch(USER_PROFILE_ENDPOINT, payload);
    const responsePayload = getPayload(response);
    const nextDraft = buildProfileDraft(draft);
    const mergedUser = {
      ...(currentProfile || {}),
      ...(responsePayload?.user || responsePayload?.data?.user || responsePayload || {}),
      profile: {
        ...(currentProfile?.profile || {}),
        fullName: nextDraft.fullName || currentProfile?.profile?.fullName || '',
        gender: nextDraft.gender || currentProfile?.profile?.gender || '',
        country: nextDraft.country,
      },
    };

    return normalizeUserProfile({ user: mergedUser }, currentProfile);
  },

  genderOptions,
  hasProfileChanges,
  buildProfileDraft,
  validateProfileDraft,
  normalizeUserProfile,
};

export default userProfileService;
