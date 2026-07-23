import axiosClient from "../axios/axiosClient";

const SUBSCRIPTION_API_PREFIX = "/api";

const getResponseData = (response) => response?.data?.data ?? null;

export const getSubscriptionPlansService = async () => {
  const response = await axiosClient.get(
    `${SUBSCRIPTION_API_PREFIX}/subscription-plans`
  );

  return getResponseData(response);
};

export const getMySubscriptionService = async () => {
  const response = await axiosClient.get(
    `${SUBSCRIPTION_API_PREFIX}/subscriptions/me`
  );

  return getResponseData(response);
};

export const createVnpayOrderService = async (payload) => {
  const response = await axiosClient.post(
    `${SUBSCRIPTION_API_PREFIX}/payments/vnpay/create-order`,
    {
      ...payload,
      clientPlatform: "web",
    }
  );

  return getResponseData(response);
};
