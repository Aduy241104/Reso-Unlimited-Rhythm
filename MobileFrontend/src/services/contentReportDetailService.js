import { REPORT_REASON_LABELS, REPORT_STATUS_LABELS } from './contentReportListService';
import { REPORT_TARGET_LABELS } from './contentReportService';
import axiosClient from '../api/axiosClient';

const REPORT_API_PREFIX = '/users/reports';

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');
const asArray = (value) => (Array.isArray(value) ? value : []);
const getPayload = (response) => response?.data || response || {};

export const REPORT_RESOLUTION_LABELS = {
  remove_content: 'Gỡ nội dung vi phạm',
  ignore: 'Bỏ qua',
  warning: 'Cảnh cáo',
  '': 'Chưa có',
};

const normalizeReportDetail = (item = {}) => {
  const status = normalizeString(item?.status).toLowerCase();
  const reason = normalizeString(item?.reason).toLowerCase();
  const targetType = normalizeString(item?.targetType).toLowerCase();
  const resolution = normalizeString(item?.resolution).toLowerCase();

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
    resolution,
    resolutionLabel: REPORT_RESOLUTION_LABELS[resolution] || resolution || 'Chưa có',
    resolutionNote: normalizeString(item?.resolutionNote),
    createdAt: item?.createdAt || '',
    updatedAt: item?.updatedAt || '',
    handledAt: item?.handledAt || '',
    raw: item,
  };
};

const translateReportDetailError = (error, fallback = 'Không thể tải chi tiết báo cáo lúc này.') => {
  const backendMessage = error?.response?.data?.message || error?.message || '';
  const normalized = String(backendMessage || '').trim().toLowerCase();

  const dictionary = {
    'report not found.': 'Không tìm thấy báo cáo.',
    'report not found': 'Không tìm thấy báo cáo.',
    'report id is invalid.': 'Mã báo cáo không hợp lệ.',
    'report id is invalid': 'Mã báo cáo không hợp lệ.',
  };

  return dictionary[normalized] || backendMessage || fallback;
};

export const contentReportDetailService = {
  REPORT_RESOLUTION_LABELS,
  translateReportDetailError,

  async getReportDetail(reportId) {
    const response = await axiosClient.get(`${REPORT_API_PREFIX}/${reportId}`);
    const payload = getPayload(response);
    const item = payload?.report || payload?.data?.report || payload?.data || payload;
    return normalizeReportDetail(item);
  },
};

export default contentReportDetailService;
