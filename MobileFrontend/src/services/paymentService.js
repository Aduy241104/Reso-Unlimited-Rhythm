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
  const method =
    pickFirstDefined(payment?.paymentGateway, payment?.paymentMethod, payment?.method, 'vnpay') || 'vnpay';
  const id = String(
    pickFirstDefined(
      payment?._id,
      payment?.id,
      transactionId,
      `${planName}-${paidAt || 'unknown'}-${amount}-${status || 'unknown'}`
    )
  );

  return {
    id,
    planName,
    amount,
    status,
    method: String(method).toUpperCase() === 'VNPAY' ? 'VNPay' : String(method),
    paidAt,
    transactionId,
  };
};

export const paymentService = {
  async getPaymentHistory() {
    try {
      const response = await axiosClient.get(API_ENDPOINTS.PAYMENTS.HISTORY);
      const payload = getPayload(response);
      const historyItems = extractHistoryItems(payload);

      return historyItems.map(normalizePaymentHistoryItem);
    } catch (error) {
      throw error;
    }
  },
};

export default paymentService;
