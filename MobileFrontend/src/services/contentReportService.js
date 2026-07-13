import axiosClient from '../api/axiosClient';

const REPORT_API_PREFIX = '/users/reports';
const MAX_REPORT_IMAGES = 5;
const MAX_REPORT_DESCRIPTION_LENGTH = 2000;

export const REPORT_REASON_GROUPS = [
  {
    label: 'An toàn và nội dung',
    options: [
      { value: 'harassment_or_hate', label: 'Quấy rối / thù ghét' },
      { value: 'nudity_or_sexual_content', label: 'Nội dung nhạy cảm' },
      { value: 'violence_or_dangerous_content', label: 'Bạo lực / nguy hiểm' },
      { value: 'spam_or_scam', label: 'Spam / lừa đảo' },
    ],
  },
  {
    label: 'Bản quyền và danh tính',
    options: [
      { value: 'copyright_infringement', label: 'Vi phạm bản quyền' },
      { value: 'impersonation', label: 'Mạo danh / nghệ sĩ giả mạo' },
    ],
  },
  {
    label: 'Thông tin và chất lượng',
    options: [
      { value: 'misleading_information', label: 'Thông tin sai lệch' },
      { value: 'other', label: 'Khác' },
    ],
  },
];

export const REPORT_TARGET_LABELS = {
  track: 'Bài hát',
  album: 'Album',
  artist: 'Nghệ sĩ',
};

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeMessage = (value) => String(value || '').trim().toLowerCase();
const getPayload = (response) => response?.data || response || {};

const appendStringField = (formData, field, value) => {
  formData.append(field, normalizeString(value));
};

const appendFileField = (formData, field, file) => {
  if (!file?.uri) {
    return;
  }

  formData.append(field, {
    uri: file.uri,
    name: file.name || file.fileName || `${field}-${Date.now()}.jpg`,
    type: file.type || file.mimeType || 'image/jpeg',
  });
};

const createReportDraft = ({ targetId = '', targetType = 'track', targetTitle = '' } = {}) => ({
  targetId: String(targetId || '').trim(),
  targetType: String(targetType || 'track').trim(),
  targetTitle: String(targetTitle || '').trim(),
  reason: '',
  description: '',
  images: [],
});

const validateReportDraft = (draft = {}) => {
  const errors = {};

  if (!normalizeString(draft.targetId)) {
    errors.targetId = 'Không xác định được nội dung cần báo cáo.';
  }

  if (!normalizeString(draft.targetType)) {
    errors.targetType = 'Không xác định được loại nội dung.';
  }

  if (!normalizeString(draft.reason)) {
    errors.reason = 'Vui lòng chọn lý do báo cáo.';
  }

  if (!normalizeString(draft.description)) {
    errors.description = 'Vui lòng mô tả chi tiết vấn đề bạn gặp phải.';
  }

  if (normalizeString(draft.description).length > MAX_REPORT_DESCRIPTION_LENGTH) {
    errors.description = `Mô tả không được vượt quá ${MAX_REPORT_DESCRIPTION_LENGTH} ký tự.`;
  }

  if (Array.isArray(draft.images) && draft.images.length > MAX_REPORT_IMAGES) {
    errors.images = `Bạn chỉ có thể tải lên tối đa ${MAX_REPORT_IMAGES} ảnh minh chứng.`;
  }

  return errors;
};

const translateReportError = (error, fallback = 'Không thể gửi báo cáo vào lúc này.') => {
  const backendMessage = error?.response?.data?.message || error?.message || '';
  const normalizedMessage = normalizeMessage(backendMessage);

  const dictionary = {
    'invalid report data.': 'Thông tin báo cáo chưa hợp lệ.',
    'invalid report data': 'Thông tin báo cáo chưa hợp lệ.',
    'image file is too large.': 'Ảnh minh chứng quá lớn.',
    'image file is too large': 'Ảnh minh chứng quá lớn.',
    'could not upload report evidence image. check storage configuration and try again.': 'Không thể tải ảnh minh chứng lên lúc này.',
    'could not upload report evidence image. check storage configuration and try again': 'Không thể tải ảnh minh chứng lên lúc này.',
    'report not found.': 'Không tìm thấy báo cáo.',
    'report not found': 'Không tìm thấy báo cáo.',
    'target id is required.': 'Thiếu mã nội dung cần báo cáo.',
    'target id is invalid.': 'Mã nội dung cần báo cáo không hợp lệ.',
    'target type is required.': 'Thiếu loại nội dung cần báo cáo.',
    'report reason is required.': 'Vui lòng chọn lý do báo cáo.',
    'description is required.': 'Vui lòng nhập mô tả chi tiết.',
  };

  return dictionary[normalizedMessage] || backendMessage || fallback;
};

export const contentReportService = {
  MAX_REPORT_IMAGES,
  MAX_REPORT_DESCRIPTION_LENGTH,
  REPORT_REASON_GROUPS,
  REPORT_TARGET_LABELS,
  createReportDraft,
  validateReportDraft,
  translateReportError,

  async submitReport(draft = {}) {
    const formData = new FormData();

    appendStringField(formData, 'targetId', draft.targetId);
    appendStringField(formData, 'targetType', draft.targetType);
    appendStringField(formData, 'reason', draft.reason);
    appendStringField(formData, 'description', draft.description);

    (Array.isArray(draft.images) ? draft.images : []).slice(0, MAX_REPORT_IMAGES).forEach((image) => {
      appendFileField(formData, 'images', image);
    });

    const response = await axiosClient.post(REPORT_API_PREFIX, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const payload = getPayload(response);
    return payload?.report || payload?.data?.report || payload?.data || payload;
  },
};

export default contentReportService;
