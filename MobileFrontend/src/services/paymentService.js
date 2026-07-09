import axiosClient from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/apiEndpoints';

const getPayload = (response) => response?.data || response || {};

const toNumber = (value, fallback = 0) => {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const pickFirstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

const extractHistoryItems = (payload = {}) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  const candidates = [
    payload?.items,
    payload?.history,
    payload?.payments,
    payload?.data,
    payload?.data?.items,
    payload?.data?.history,
    payload?.data?.payments,
  ];

  return candidates.find((value) => Array.isArray(value)) || [];
};

const normalizePaymentMethod = (value) => {
  const normalizedValue = String(value || '').trim().toLowerCase();

  if (normalizedValue === 'vnpay') {
    return 'VNPay';
  }

  return value || 'VNPay';
};

const normalizePaymentHistoryItem = (payment = {}) => {
  const planName =
    payment?.plan?.name ||
    payment?.planId?.name ||
    payment?.planId?.title ||
    payment?.subscriptionPlan?.name ||
    payment?.subscription?.plan?.name ||
    payment?.planName ||
    payment?.packageName ||
    'Premium';
  const amount = toNumber(
    pickFirstDefined(
      payment?.totalAmount,
      payment?.amount,
      payment?.total,
      payment?.finalAmount,
      payment?.price,
      payment?.plan?.totalPrice,
      payment?.planId?.price
    )
  );
  const status =
    pickFirstDefined(payment?.status, payment?.paymentStatus, payment?.transactionStatus, payment?.result) || '';
  const paidAt =
    pickFirstDefined(
      payment?.paidAt,
      payment?.paymentDate,
      payment?.completedAt,
      payment?.createdAt,
      payment?.updatedAt
    ) || null;
  const transactionId =
    pickFirstDefined(
      payment?.gatewayTransactionId,
      payment?.transactionId,
      payment?.transactionCode,
      payment?.invoiceNumber,
      payment?.vnpTransactionNo,
      payment?.vnpTxnRef,
      payment?.orderCode
    ) || '';
  const method = pickFirstDefined(payment?.paymentGateway, payment?.paymentMethod, payment?.method, 'vnpay');
  const id = String(
    pickFirstDefined(
      payment?._id,
      payment?.id,
      transactionId,
      `${planName}-${paidAt || 'unknown'}-${amount}-${status || 'unknown'}`
    )
  );

  return {
    _id: payment?._id || payment?.id || id,
    id,
    planName,
    amount,
    status,
    method: normalizePaymentMethod(method),
    paidAt,
    transactionId,
    invoiceNumber: payment?.invoiceNumber || '',
    createdAt: payment?.createdAt || null,
  };
};

const normalizePaymentDetail = (payment = {}) => {
  const planName =
    payment?.planName ||
    payment?.plan?.name ||
    payment?.plan?.title ||
    payment?.planId?.name ||
    payment?.planId?.title ||
    'Premium';
  const amount = toNumber(pickFirstDefined(payment?.totalAmount, payment?.amount, payment?.price, payment?.plan?.price));
  const method = pickFirstDefined(payment?.paymentGateway, payment?.paymentMethod, payment?.method, 'vnpay');
  const subscriptionStartDate = payment?.subscription?.startDate || payment?.subscriptionId?.startDate || null;
  const subscriptionEndDate = payment?.subscription?.endDate || payment?.subscriptionId?.endDate || null;
  const content =
    pickFirstDefined(payment?.content, payment?.description, payment?.paymentContent, payment?.orderInfo, payment?.note) || '';

  return {
    _id: payment?._id || payment?.id || '',
    id: payment?.id || payment?._id || '',
    planName,
    amount,
    status: payment?.status || '',
    method: normalizePaymentMethod(method),
    transactionId: payment?.gatewayTransactionId || payment?.transactionId || '',
    invoiceNumber: payment?.invoiceNumber || payment?.orderCode || '',
    createdAt: payment?.createdAt || null,
    paidAt: payment?.paidAt || null,
    updatedAt: payment?.updatedAt || null,
    durationDays: toNumber(payment?.plan?.durationDays || payment?.planId?.durationDays, 0),
    subscriptionStartDate,
    subscriptionEndDate,
    content,
  };
};

export const paymentService = {
  async getPaymentHistory(status = 'all') {
    try {
      const normalizedStatus = String(status || 'all').trim().toLowerCase();
      const requestConfig =
        normalizedStatus !== 'all'
          ? {
              params: {
                status: normalizedStatus,
              },
            }
          : undefined;
      const response = await axiosClient.get(API_ENDPOINTS.PAYMENTS.HISTORY, requestConfig);
      const payload = getPayload(response);
      const historyItems = extractHistoryItems(payload);

      return historyItems.map(normalizePaymentHistoryItem);
    } catch (error) {
      throw error;
    }
  },

  async getPaymentDetail(paymentId) {
    try {
      const response = await axiosClient.get(`${API_ENDPOINTS.PAYMENTS.DETAIL}/${paymentId}`);
      const payload = getPayload(response);
      const detail = payload?.data || payload;

      return normalizePaymentDetail(detail);
    } catch (error) {
      throw error;
    }
  },
};

export default paymentService;
