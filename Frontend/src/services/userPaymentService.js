import api from "../axios/axiosClient";

const USER_PAYMENT_HISTORY_ENDPOINT = "/api/users/payment-history";

const normalizePaymentHistoryPayload = (response) => {
  const payload = response?.data;
  const primaryData = payload?.data ?? payload ?? null;

  if (Array.isArray(primaryData?.items)) {
    return {
      items: primaryData.items,
      pagination: primaryData?.pagination ?? payload?.pagination ?? null,
    };
  }

  if (Array.isArray(payload?.items)) {
    return {
      items: payload.items,
      pagination: payload?.pagination ?? null,
    };
  }

  if (Array.isArray(primaryData)) {
    return {
      items: primaryData,
      pagination: payload?.pagination ?? null,
    };
  }

  if (Array.isArray(payload)) {
    return {
      items: payload,
      pagination: null,
    };
  }

  return {
    items: [],
    pagination: primaryData?.pagination ?? payload?.pagination ?? null,
  };
};

export const getUserPaymentHistory = async (params = {}) => {
  const response = await api.get(USER_PAYMENT_HISTORY_ENDPOINT, {
    params,
  });

  return normalizePaymentHistoryPayload(response);
};

export const getUserPaymentReceiptPdf = async (paymentId) => {
  const endpoint = `/api/users/payments/${paymentId}/receipt`;
  const response = await api.get(endpoint, {
    responseType: "blob",
  });

  return response.data;
};

export default {
  getUserPaymentHistory,
  getUserPaymentReceiptPdf,
};
