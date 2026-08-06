import axiosClient from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/apiEndpoints';
import subscriptionService from './subscriptionService';

const getPayload = (response) => response?.data || response || {};
const wait = (durationMs = 0) => new Promise((resolve) => setTimeout(resolve, durationMs));

const toNumber = (value, fallback = 0) => {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const normalizePlan = (plan = {}) => {
  const price = toNumber(plan?.price);
  const taxAmount = toNumber(plan?.taxAmount);
  const totalPrice = toNumber(plan?.totalPrice, price + taxAmount);

  return {
    _id: plan?._id || plan?.originalPlanId || '',
    originalPlanId: plan?.originalPlanId || plan?._id || '',
    name: plan?.name || 'Premium',
    price,
    durationDays: toNumber(plan?.durationDays),
    description: plan?.description || '',
    features: Array.isArray(plan?.features) ? plan.features : [],
    status: plan?.status || 'active',
    taxRate: toNumber(plan?.taxRate),
    taxAmount,
    totalPrice,
  };
};

export const premiumService = {
  async getPremiumPlans() {
    const response = await axiosClient.get(API_ENDPOINTS.PREMIUM.PLANS);
    const payload = getPayload(response);
    const plans = Array.isArray(payload) ? payload : Array.isArray(payload?.plans) ? payload.plans : [];

    return plans.map(normalizePlan);
  },

  async getPremiumPlanDetail(planId) {
    const response = await axiosClient.get(`${API_ENDPOINTS.PREMIUM.PLANS}/${planId}`);
    const payload = getPayload(response);

    return normalizePlan(payload?.plan || payload);
  },

  async getMySubscription(options = {}) {
    const attempts = Math.max(1, Number(options?.attempts) || 1);
    const delayMs = Math.max(0, Number(options?.delayMs) || 0);
    const requirePremium = Boolean(options?.requirePremium);
    let latestSubscription = null;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      latestSubscription = await subscriptionService.getMySubscription();

      if (!requirePremium || latestSubscription?.isPremium) {
        return latestSubscription;
      }

      if (attempt < attempts - 1 && delayMs > 0) {
        await wait(delayMs);
      }
    }

    return latestSubscription;
  },

  async createVnpayOrder(planId) {
    const response = await axiosClient.post(API_ENDPOINTS.PAYMENTS.VNPAY_CREATE_ORDER, {
      planId,
      clientPlatform: 'mobile',
    });
    const payload = getPayload(response);
    const result = payload?.data || payload;

    return {
      paymentUrl: result?.paymentUrl || '',
      invoiceNumber: result?.invoiceNumber || '',
      transactionId: result?.transactionId || '',
      subscriptionId: result?.subscriptionId || '',
      amount: toNumber(result?.amount),
      tax: toNumber(result?.tax),
      taxRate: toNumber(result?.taxRate),
      totalAmount: toNumber(result?.totalAmount),
      plan: result?.plan ? normalizePlan(result.plan) : null,
    };
  },
};

export default premiumService;
