import axiosClient from '../api/axiosClient';
import { REPORT_TARGET_LABELS } from './contentReportService';

const REPORT_API_PREFIX = '/users/reports';

export const REPORT_REASON_LABELS = {
  copyright_infringement: 'Vi phạm bản quyền',
  harassment_or_hate: 'Quấy rối / thù ghét',
  nudity_or_sexual_content: 'Nội dung nhạy cảm',
  violence_or_dangerous_content: 'Bạo lực / nguy hiểm',
  spam_or_scam: 'Spam / lừa đảo',
  misleading_information: 'Thông tin sai lệch',
  impersonation: 'Mạo danh',
  wrong_metadata: 'Thông tin bài hát không chính xác',
  lyrics_issue: 'Lời bài hát không phù hợp',
  audio_quality: 'Chất lượng âm thanh kém',
  fake_artist: 'Nghệ sĩ giả mạo',
  other: 'Khác',
};

export const REPORT_STATUS_LABELS = {
  pending: 'Chờ tiếp nhận',
  reviewing: 'Đang xem xét',
  resolved: 'Đã xử lý',
  rejected: 'Bị từ chối',
};

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');
const getPayload = (response) => response?.data || response || {};
const asArray = (value) => (Array.isArray(value) ? value : []);

const normalizeReportItem = (item = {}) => {
  const status = normalizeString(item?.status).toLowerCase();
  const reason = normalizeString(item?.reason).toLowerCase();
  const targetType = normalizeString(item?.targetType).toLowerCase();

  return {
    id: String(item?._id || item?.id || ''),
    targetId: String(item?.targetId || ''),
    targetType,
    targetTypeLabel: REPORT_TARGET_LABELS[targetType] || 'Nội dung',
    reason,
    reasonLabel: REPORT_REASON_LABELS[reason] || reason || 'Khác',
    description: normalizeString(item?.description),
    images: asArray(item?.images).filter(Boolean),
    status,
    statusLabel: REPORT_STATUS_LABELS[status] || 'Đang xem xét',
    resolution: normalizeString(item?.resolution),
    resolutionNote: normalizeString(item?.resolutionNote),
    createdAt: item?.createdAt || '',
    updatedAt: item?.updatedAt || '',
    raw: item,
  };
};

const translateReportListError = (error, fallback = 'Không thể tải danh sách báo cáo lúc này.') => {
  const backendMessage = error?.response?.data?.message || error?.message || '';

  if (!backendMessage) {
    return fallback;
  }

  if (String(backendMessage).trim().toLowerCase() === 'report not found.') {
    return 'Không tìm thấy báo cáo.';
  }

  return backendMessage;
};

export const contentReportListService = {
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,

  translateReportListError,

  async getMyReports(params = {}) {
    const response = await axiosClient.get(REPORT_API_PREFIX, {
      params: {
        page: 1,
        limit: 50,
        ...params,
      },
    });

    const payload = getPayload(response);
    const rawItems = asArray(payload?.reports || payload?.data?.reports || payload?.data);
    const pagination = payload?.pagination || payload?.meta || payload?.data?.pagination || payload?.data?.meta || {};

    return {
      items: rawItems.map(normalizeReportItem),
      pagination: {
        page: Number(pagination?.page) || 1,
        limit: Number(pagination?.limit) || rawItems.length || 0,
        total: Number(pagination?.total) || rawItems.length || 0,
        totalPages: Number(pagination?.totalPages) || 1,
      },
    };
  },
};

export default contentReportListService;
