import axiosClient from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/apiEndpoints';

const getPayload = (response) => response?.data || response || {};

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

const normalizeSubscription = (subscription = {}) => ({
  isPremium: Boolean(subscription?.isPremium),
  premiumEndDate: subscription?.premiumEndDate || null,
  currentPlan: subscription?.currentPlan ? normalizePlan(subscription.currentPlan) : null,
  activeSubscription: subscription?.activeSubscription
    ? {
        _id: subscription.activeSubscription._id || '',
        status: subscription.activeSubscription.status || '',
        startDate: subscription.activeSubscription.startDate || null,
        endDate: subscription.activeSubscription.endDate || null,
        planId: subscription.activeSubscription.planId || '',
        plan: subscription.activeSubscription.plan ? normalizePlan(subscription.activeSubscription.plan) : null,
      }
    : null,
});

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

  async getMySubscription() {
    const response = await axiosClient.get(API_ENDPOINTS.PREMIUM.MY_SUBSCRIPTION);
    const payload = getPayload(response);

    return normalizeSubscription(payload?.subscription || payload);
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
