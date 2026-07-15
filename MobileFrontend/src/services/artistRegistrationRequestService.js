import axiosClient from '../api/axiosClient';
import { isDateDisplayValueValid, toApiDateValue } from '../utils/artistRegistrationDate';

const ARTIST_REGISTRATION_ENDPOINT = '/users/artist-registration-requests';

const STATUS_LABELS = {
  pending: 'Đang chờ duyệt',
  approved: 'Đã được duyệt',
  rejected: 'Đã bị từ chối',
};

const normalizeSocialLinks = (socialLinks = {}) => ({
  spotify: typeof socialLinks.spotify === 'string' ? socialLinks.spotify : '',
  youtube: typeof socialLinks.youtube === 'string' ? socialLinks.youtube : '',
  tiktok: typeof socialLinks.tiktok === 'string' ? socialLinks.tiktok : '',
  facebook: typeof socialLinks.facebook === 'string' ? socialLinks.facebook : '',
  instagram: typeof socialLinks.instagram === 'string' ? socialLinks.instagram : '',
  soundcloud: typeof socialLinks.soundcloud === 'string' ? socialLinks.soundcloud : '',
  website: typeof socialLinks.website === 'string' ? socialLinks.website : '',
  other: typeof socialLinks.other === 'string' ? socialLinks.other : '',
});

const createArtistRegistrationDraft = () => ({
  stageName: '',
  bio: '',
  avatar: null,
  genres: [],
  socialLinks: normalizeSocialLinks(),
  fullName: '',
  idNumber: '',
  dateOfBirth: '',
  frontImage: null,
  backImage: null,
  demoTrackUrlsText: '',
  musicLinksText: '',
  portfolioDescription: '',
  acceptedTerms: false,
  copyrightCommitment: false,
  truthfulInformationCommitment: false,
});

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeMessage = (value) => String(value || '').trim().toLowerCase();
const asArray = (value) => (Array.isArray(value) ? value : []);
const getPayload = (response) => response?.data || response || {};

const getFileExtension = (uri = '') => {
  const match = String(uri).match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match?.[1]?.toLowerCase() || 'jpg';
};

const splitLinesToArray = (value) => (
  String(value || '')
    .split('\n')
    .flatMap((entry) => entry.split(','))
    .map((entry) => entry.trim())
    .filter(Boolean)
);

const appendStringField = (formData, field, value) => {
  formData.append(field, normalizeString(value));
};

const appendBooleanField = (formData, field, value) => {
  formData.append(field, value ? 'true' : 'false');
};

const appendArrayField = (formData, field, values = []) => {
  values.forEach((value) => {
    formData.append(field, value);
  });
};

const appendFileField = (formData, field, file) => {
  if (!file?.uri) {
    return;
  }

  const extension = getFileExtension(file.uri);

  formData.append(field, {
    uri: file.uri,
    name: file.name || file.fileName || `${field}-${Date.now()}.${extension}`,
    type: file.type || file.mimeType || `image/${extension === 'jpg' ? 'jpeg' : extension}`,
  });
};

const normalizeRequestItem = (item = {}) => ({
  id: String(item?._id || item?.id || ''),
  status: String(item?.status || '').trim(),
  statusLabel: STATUS_LABELS[item?.status] || 'Không xác định',
  stageName: normalizeString(item?.stageName),
  avatar: normalizeString(item?.avatar),
  bio: normalizeString(item?.bio),
  genres: asArray(item?.genres),
  rejectReason: normalizeString(item?.rejectReason),
  createdAt: item?.createdAt || '',
  updatedAt: item?.updatedAt || '',
  reviewedAt: item?.reviewedAt || '',
  review: item?.review || {},
  raw: item,
});

const validateArtistRegistrationDraft = (draft = {}) => {
  const errors = {};

  if (!normalizeString(draft.stageName)) {
    errors.stageName = 'Vui lòng nhập nghệ danh.';
  }

  if (!normalizeString(draft.fullName)) {
    errors.fullName = 'Vui lòng nhập họ tên trên CCCD.';
  }

  if (!normalizeString(draft.idNumber)) {
    errors.idNumber = 'Vui lòng nhập số CCCD.';
  }

  if (!normalizeString(draft.dateOfBirth)) {
    errors.dateOfBirth = 'Vui lòng chọn ngày sinh.';
  } else if (!isDateDisplayValueValid(draft.dateOfBirth)) {
    errors.dateOfBirth = 'Ngày sinh phải đúng định dạng dd-mm-yyyy và không lớn hơn ngày hiện tại.';
  }

  if (!draft.frontImage?.uri) {
    errors.frontImage = 'Vui lòng chọn ảnh mặt trước CCCD.';
  }

  if (!draft.backImage?.uri) {
    errors.backImage = 'Vui lòng chọn ảnh mặt sau CCCD.';
  }

  if (!draft.acceptedTerms) {
    errors.acceptedTerms = 'Bạn cần đồng ý điều khoản dành cho nghệ sĩ.';
  }

  if (!draft.copyrightCommitment) {
    errors.copyrightCommitment = 'Bạn cần xác nhận trách nhiệm bản quyền.';
  }

  if (!draft.truthfulInformationCommitment) {
    errors.truthfulInformationCommitment = 'Bạn cần xác nhận thông tin là trung thực.';
  }

  return errors;
};

const extractArtistRegistrationFieldErrors = (error) => {
  const details = error?.response?.data?.errors;
  const errors = {};

  if (Array.isArray(details)) {
    details.forEach((item) => {
      const field = normalizeString(item?.field);
      const message = normalizeString(item?.message);

      if (field && message) {
        errors[field] = message;
      }
    });
  } else if (details && typeof details === 'object') {
    const field = normalizeString(details.field);
    const message = normalizeString(details.message);

    if (field && message) {
      errors[field] = message;
    }
  }

  return errors;
};

const translateArtistRegistrationError = (error, fallback = 'Không thể gửi yêu cầu đăng ký nghệ sĩ lúc này.') => {
  const backendMessage = error?.response?.data?.message || error?.message || '';
  const normalizedMessage = normalizeMessage(backendMessage);

  const dictionary = {
    'this account is already an artist.': 'Tài khoản này đã là nghệ sĩ.',
    'this account is already an artist': 'Tài khoản này đã là nghệ sĩ.',
    'you already have a pending artist registration request.': 'Bạn đã có một yêu cầu đăng ký nghệ sĩ đang chờ duyệt.',
    'you already have a pending artist registration request': 'Bạn đã có một yêu cầu đăng ký nghệ sĩ đang chờ duyệt.',
    'invalid artist registration request data.': 'Thông tin đăng ký nghệ sĩ chưa hợp lệ.',
    'invalid artist registration request data': 'Thông tin đăng ký nghệ sĩ chưa hợp lệ.',
    'artist registration request not found.': 'Không tìm thấy yêu cầu đăng ký nghệ sĩ.',
    'artist registration request not found': 'Không tìm thấy yêu cầu đăng ký nghệ sĩ.',
    'only pending requests can be cancelled.': 'Chỉ có thể hủy yêu cầu đang chờ duyệt.',
    'only pending requests can be cancelled': 'Chỉ có thể hủy yêu cầu đang chờ duyệt.',
    'image file is too large.': 'Ảnh tải lên quá lớn.',
    'image file is too large': 'Ảnh tải lên quá lớn.',
  };

  return dictionary[normalizedMessage] || backendMessage || fallback;
};

export const artistRegistrationRequestService = {
  createArtistRegistrationDraft,
  extractArtistRegistrationFieldErrors,
  translateArtistRegistrationError,
  validateArtistRegistrationDraft,
  splitLinesToArray,
  normalizeSocialLinks,

  async getMyRequests() {
    const response = await axiosClient.get(ARTIST_REGISTRATION_ENDPOINT, {
      params: { limit: 10 },
    });
    const payload = getPayload(response);
    const rawItems = asArray(payload?.requests || payload?.data?.requests || payload?.data);

    return rawItems.map(normalizeRequestItem);
  },

  async submitRequest(draft = {}) {
    const formData = new FormData();

    appendStringField(formData, 'stageName', draft.stageName);
    appendStringField(formData, 'bio', draft.bio);
    appendStringField(formData, 'fullName', draft.fullName);
    appendStringField(formData, 'idNumber', draft.idNumber);
    appendStringField(formData, 'dateOfBirth', toApiDateValue(draft.dateOfBirth));
    appendStringField(formData, 'portfolioDescription', draft.portfolioDescription);
    appendBooleanField(formData, 'acceptedTerms', draft.acceptedTerms);
    appendBooleanField(formData, 'copyrightCommitment', draft.copyrightCommitment);
    appendBooleanField(formData, 'truthfulInformationCommitment', draft.truthfulInformationCommitment);

    appendArrayField(formData, 'genres', asArray(draft.genres));
    appendArrayField(formData, 'musicLinks', splitLinesToArray(draft.musicLinksText));
    appendArrayField(formData, 'demoTrackUrls', splitLinesToArray(draft.demoTrackUrlsText));

    Object.entries(normalizeSocialLinks(draft.socialLinks)).forEach(([key, value]) => {
      if (normalizeString(value)) {
        appendStringField(formData, `socialLinks[${key}]`, value);
      }
    });

    appendFileField(formData, 'avatar', draft.avatar);
    appendFileField(formData, 'frontImage', draft.frontImage);
    appendFileField(formData, 'backImage', draft.backImage);

    const response = await axiosClient.post(ARTIST_REGISTRATION_ENDPOINT, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const payload = getPayload(response);
    const requestItem = payload?.artistRequest || payload?.data?.artistRequest || payload?.data || payload;

    return normalizeRequestItem(requestItem);
  },

  async cancelRequest(requestId) {
    await axiosClient.delete(`${ARTIST_REGISTRATION_ENDPOINT}/${requestId}`);
    return true;
  },
};

export default artistRegistrationRequestService;
