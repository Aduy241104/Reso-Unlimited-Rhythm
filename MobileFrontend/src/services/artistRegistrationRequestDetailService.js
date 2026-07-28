import axiosClient from '../api/axiosClient';
import artistRegistrationRequestService from './artistRegistrationRequestService';

const ARTIST_REGISTRATION_ENDPOINT = '/users/artist-registration-requests';

const STATUS_LABELS = {
  pending: 'Đang chờ duyệt',
  approved: 'Đã được duyệt',
  rejected: 'Đã bị từ chối',
};

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');
const asArray = (value) => (Array.isArray(value) ? value : []);
const getPayload = (response) => response?.data || response || {};

const normalizeUser = (user = {}) => ({
  id: String(user?._id || user?.id || ''),
  email: normalizeString(user?.email),
  fullName: normalizeString(user?.profile?.fullName),
  avatar: normalizeString(user?.avatar || user?.profile?.avatar),
  displayName: normalizeString(user?.profile?.fullName || user?.email),
});

const normalizeChecklist = (checklist = {}) => ({
  profileComplete: Boolean(checklist?.profileComplete),
  identityVerified: Boolean(checklist?.identityVerified),
  hasMusicActivity: Boolean(checklist?.hasMusicActivity),
  socialLinksValid: Boolean(checklist?.socialLinksValid),
  noImpersonation: Boolean(checklist?.noImpersonation),
  acceptedCopyrightPolicy: Boolean(checklist?.acceptedCopyrightPolicy),
});

const normalizeSocialLinks = (socialLinks = {}) => ({
  spotify: normalizeString(socialLinks?.spotify),
  youtube: normalizeString(socialLinks?.youtube),
  tiktok: normalizeString(socialLinks?.tiktok),
  facebook: normalizeString(socialLinks?.facebook),
  instagram: normalizeString(socialLinks?.instagram),
  soundcloud: normalizeString(socialLinks?.soundcloud),
  website: normalizeString(socialLinks?.website),
  other: normalizeString(socialLinks?.other),
});

const normalizeRequestDetail = (item = {}) => ({
  id: String(item?._id || item?.id || ''),
  status: normalizeString(item?.status),
  statusLabel: STATUS_LABELS[item?.status] || 'Không xác định',
  stageName: normalizeString(item?.stageName),
  avatar: normalizeString(item?.avatar),
  bio: normalizeString(item?.bio),
  genres: asArray(item?.genres).filter(Boolean),
  rejectReason: normalizeString(item?.rejectReason),
  createdAt: item?.createdAt || '',
  updatedAt: item?.updatedAt || '',
  reviewedAt: item?.reviewedAt || '',
  user: normalizeUser(item?.userId),
  reviewedBy: normalizeUser(item?.reviewedBy),
  socialLinks: normalizeSocialLinks(item?.socialLinks),
  identityInfo: {
    fullName: normalizeString(item?.identityInfo?.fullName),
    idNumber: normalizeString(item?.identityInfo?.idNumber),
    dateOfBirth: item?.identityInfo?.dateOfBirth || '',
    frontImage: normalizeString(item?.identityInfo?.frontImage),
    backImage: normalizeString(item?.identityInfo?.backImage),
  },
  portfolio: {
    demoTrackUrls: asArray(item?.portfolio?.demoTrackUrls).filter(Boolean),
    musicLinks: asArray(item?.portfolio?.musicLinks).filter(Boolean),
    description: normalizeString(item?.portfolio?.description),
  },
  artistDeclaration: {
    acceptedTerms: Boolean(item?.artistDeclaration?.acceptedTerms),
    copyrightCommitment: Boolean(item?.artistDeclaration?.copyrightCommitment),
    truthfulInformationCommitment: Boolean(item?.artistDeclaration?.truthfulInformationCommitment),
    acceptedAt: item?.artistDeclaration?.acceptedAt || '',
  },
  review: {
    adminNote: normalizeString(item?.review?.adminNote),
    checklist: normalizeChecklist(item?.review?.checklist),
  },
  raw: item,
});

export const artistRegistrationRequestDetailService = {
  translateArtistRegistrationDetailError(error, fallback = 'Không thể tải chi tiết yêu cầu lúc này.') {
    return artistRegistrationRequestService.translateArtistRegistrationError(error, fallback);
  },

  async getRequestDetail(requestId) {
    const response = await axiosClient.get(`${ARTIST_REGISTRATION_ENDPOINT}/${requestId}`);
    const payload = getPayload(response);
    const item = payload?.request || payload?.data?.request || payload?.data || payload;
    return normalizeRequestDetail(item);
  },
};

export default artistRegistrationRequestDetailService;
