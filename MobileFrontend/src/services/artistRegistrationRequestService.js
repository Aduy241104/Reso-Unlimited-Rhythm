import axiosClient from '../api/axiosClient';
import { isDateDisplayValueValid, parseDateDisplayValue, toApiDateValue } from '../utils/artistRegistrationDate';

const ARTIST_REGISTRATION_ENDPOINT = '/users/artist-registration-requests';
const MAX_STAGE_NAME_LENGTH = 60;
const MAX_FULL_NAME_LENGTH = 100;
const MAX_ID_NUMBER_LENGTH = 12;
const ID_NUMBER_REGEX = /^[0-9]{9,12}$/;
const MIN_ARTIST_AGE = 16;

const STATUS_LABELS = {
  pending: 'Đang chờ duyệt',
  approved: 'Đã được duyệt',
  rejected: 'Đã bị từ chối',
};

const SOCIAL_LINK_REQUIRED_MESSAGE =
  'Vui lòng nhập ít nhất 1 liên kết Website, Liên kết khác, TikTok, Instagram, SoundCloud, Facebook, YouTube hoặc Spotify.';

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
const sanitizeIdNumber = (value) => String(value ?? '').replace(/\D/g, '');
const hasAtLeastOneSocialLink = (socialLinks = {}) => (
  Object.values(normalizeSocialLinks(socialLinks)).some((value) => Boolean(normalizeString(value)))
);

const calculateAgeFromDisplayDate = (displayDateValue) => {
  const parts = parseDateDisplayValue(displayDateValue);
  if (!parts?.year || !parts?.month || !parts?.day) {
    return 0;
  }

  const now = new Date();
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);

  let age = now.getFullYear() - year;
  const monthOffset = (now.getMonth() + 1) - month;

  if (monthOffset < 0 || (monthOffset === 0 && now.getDate() < day)) {
    age -= 1;
  }

  return age;
};

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
  const stageName = normalizeString(draft.stageName);
  const fullName = normalizeString(draft.fullName);
  const idNumber = normalizeString(draft.idNumber);
  const sanitizedId = sanitizeIdNumber(draft.idNumber);
  const dateOfBirth = normalizeString(draft.dateOfBirth);
  const demoUrls = splitLinesToArray(draft.demoTrackUrlsText);
  const musicUrls = splitLinesToArray(draft.musicLinksText);

  // Stage name validation
  if (!stageName) {
    errors.stageName = 'Vui lòng nhập nghệ danh.';
  } else if (stageName.length > MAX_STAGE_NAME_LENGTH) {
    errors.stageName = `Tên nghệ sĩ không được vượt quá ${MAX_STAGE_NAME_LENGTH} ký tự.`;
  }

  // Full name validation
  if (!fullName) {
    errors.fullName = 'Vui lòng nhập họ tên trên CCCD.';
  } else if (fullName.length > MAX_FULL_NAME_LENGTH) {
    errors.fullName = `Họ và tên thật không được vượt quá ${MAX_FULL_NAME_LENGTH} ký tự.`;
  }

  // ID Number validation
  if (!idNumber) {
    errors.idNumber = 'Vui lòng nhập số CCCD.';
  } else if (sanitizedId !== idNumber) {
    errors.idNumber = 'Số CCCD chỉ được nhập số.';
  } else if (idNumber.length > MAX_ID_NUMBER_LENGTH) {
    errors.idNumber = `Số CCCD/CMND không được vượt quá ${MAX_ID_NUMBER_LENGTH} ký tự.`;
  } else if (!ID_NUMBER_REGEX.test(idNumber)) {
    errors.idNumber = 'Số CCCD/CMND phải gồm từ 9 đến 12 chữ số.';
  }

  // Date of birth validation
  if (!dateOfBirth) {
    errors.dateOfBirth = 'Vui lòng chọn ngày sinh.';
  } else if (!isDateDisplayValueValid(dateOfBirth)) {
    errors.dateOfBirth = 'Ngày sinh phải đúng định dạng dd-mm-yyyy và không lớn hơn ngày hiện tại.';
  } else {
    const age = calculateAgeFromDisplayDate(dateOfBirth);
    if (age < MIN_ARTIST_AGE) {
      errors.dateOfBirth = `Bạn phải đủ ${MIN_ARTIST_AGE} tuổi để đăng ký nghệ sĩ.`;
    }
  }

  // Identity images validation
  if (!draft.frontImage?.uri) {
    errors.frontImage = 'Vui lòng chọn ảnh mặt trước CCCD.';
  }

  if (!draft.backImage?.uri) {
    errors.backImage = 'Vui lòng chọn ảnh mặt sau CCCD.';
  }

  // Social links validation
  if (!hasAtLeastOneSocialLink(draft.socialLinks)) {
    errors.socialLinks = SOCIAL_LINK_REQUIRED_MESSAGE;
  }

  // Portfolio link requirement (at least 1 demo link OR 1 music link)
  if (demoUrls.length === 0 && musicUrls.length === 0) {
    const portfolioMsg = 'Vui lòng nhập ít nhất 1 link demo bài hát hoặc 1 link sản phẩm âm nhạc đã phát hành.';
    errors.demoTrackUrlsText = portfolioMsg;
    errors.musicLinksText = portfolioMsg;
  }

  // Declarations & Commitments
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
    'stage name already exists. please choose another name.': 'Tên nghệ sĩ đã tồn tại. Vui lòng chọn tên khác.',
    'stage name already exists': 'Tên nghệ sĩ đã tồn tại. Vui lòng chọn tên khác.',
    'identity number already exists in the system.': 'Số CCCD/CMND đã tồn tại trong hệ thống.',
    'identity number already exists': 'Số CCCD/CMND đã tồn tại trong hệ thống.',
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

  async checkArtistStageNameAvailability(stageName, options = {}) {
    const response = await axiosClient.get(`${ARTIST_REGISTRATION_ENDPOINT}/stage-name-availability`, {
      params: {
        stageName: typeof stageName === 'string' ? stageName.trim() : '',
      },
      signal: options.signal,
    });
    const payload = getPayload(response);
    return payload?.data || payload || null;
  },

  async checkArtistIdNumberAvailability(idNumber, options = {}) {
    const response = await axiosClient.get(`${ARTIST_REGISTRATION_ENDPOINT}/id-number-availability`, {
      params: {
        idNumber: typeof idNumber === 'string' ? idNumber.trim() : '',
      },
      signal: options.signal,
    });
    const payload = getPayload(response);
    return payload?.data || payload || null;
  },

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
    appendStringField(formData, 'idNumber', sanitizeIdNumber(draft.idNumber));
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
