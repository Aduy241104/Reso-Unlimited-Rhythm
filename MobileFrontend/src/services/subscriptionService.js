import axiosClient from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/apiEndpoints';

const getPayload = (response) => response?.data || response || {};

const toNumber = (value, fallback = 0) => {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const pickFirstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

const pickFirstObject = (...values) =>
  values.find((value) => value && typeof value === 'object' && !Array.isArray(value));

const normalizePlan = (plan = {}) => {
  const normalizedPlan = plan && typeof plan === 'object' ? plan : {};
  const price = toNumber(
    pickFirstDefined(
      normalizedPlan?.price,
      normalizedPlan?.basePrice,
      normalizedPlan?.amount,
      normalizedPlan?.totalPrice
    )
  );
  const totalPrice = toNumber(
    pickFirstDefined(normalizedPlan?.totalPrice, normalizedPlan?.finalAmount, normalizedPlan?.amount),
    price
  );

  return {
    _id: pickFirstDefined(normalizedPlan?._id, normalizedPlan?.id, normalizedPlan?.originalPlanId) || '',
    originalPlanId:
      pickFirstDefined(normalizedPlan?.originalPlanId, normalizedPlan?._id, normalizedPlan?.id) || '',
    name:
      pickFirstDefined(
        normalizedPlan?.name,
        normalizedPlan?.title,
        normalizedPlan?.planName,
        normalizedPlan?.packageName
      ) || 'Premium',
    price,
    totalPrice,
    durationDays: toNumber(
      pickFirstDefined(normalizedPlan?.durationDays, normalizedPlan?.duration, normalizedPlan?.days)
    ),
    description:
      pickFirstDefined(normalizedPlan?.description, normalizedPlan?.summary, normalizedPlan?.details) || '',
    features:
      (Array.isArray(normalizedPlan?.features) && normalizedPlan.features) ||
      (Array.isArray(normalizedPlan?.featureCodes) && normalizedPlan.featureCodes) ||
      [],
    status: pickFirstDefined(normalizedPlan?.status, normalizedPlan?.planStatus) || '',
  };
};

const normalizeActiveSubscription = (subscription = {}) => {
  const normalizedSubscription = subscription && typeof subscription === 'object' ? subscription : {};
  const planSource = pickFirstObject(
    normalizedSubscription?.plan,
    normalizedSubscription?.planId,
    normalizedSubscription?.subscriptionPlan,
    normalizedSubscription?.currentPlan
  );

  return {
    _id: pickFirstDefined(normalizedSubscription?._id, normalizedSubscription?.id) || '',
    status:
      pickFirstDefined(
        normalizedSubscription?.status,
        normalizedSubscription?.subscriptionStatus,
        normalizedSubscription?.state
      ) || '',
    startDate:
      pickFirstDefined(
        normalizedSubscription?.startDate,
        normalizedSubscription?.startedAt,
        normalizedSubscription?.createdAt
      ) || null,
    endDate:
      pickFirstDefined(
        normalizedSubscription?.endDate,
        normalizedSubscription?.expiredAt,
        normalizedSubscription?.expiresAt,
        normalizedSubscription?.premiumEndDate
      ) || null,
    planId:
      pickFirstDefined(
        typeof normalizedSubscription?.planId === 'string' || typeof normalizedSubscription?.planId === 'number'
          ? normalizedSubscription.planId
          : null,
        normalizedSubscription?.plan?._id,
        normalizedSubscription?.plan?.id,
        normalizedSubscription?.planId?._id,
        normalizedSubscription?.planId?.id
      ) || '',
    plan: planSource ? normalizePlan(planSource) : null,
  };
};

const normalizeSubscription = (subscription = {}) => {
  const normalizedSubscription = subscription && typeof subscription === 'object' ? subscription : {};
  const currentPlanSource = pickFirstObject(
    normalizedSubscription?.currentPlan,
    normalizedSubscription?.plan,
    normalizedSubscription?.planId,
    normalizedSubscription?.subscriptionPlan
  );
  const activeSubscriptionSource = pickFirstObject(
    normalizedSubscription?.activeSubscription,
    normalizedSubscription?.subscription,
    normalizedSubscription?.latestSubscription
  );
  const normalizedActiveSubscription = activeSubscriptionSource
    ? normalizeActiveSubscription(activeSubscriptionSource)
    : normalizeActiveSubscription(normalizedSubscription);
  const activeStatus = String(normalizedActiveSubscription?.status || '')
    .trim()
    .toLowerCase();
  const hasActiveSubscriptionData = Boolean(
    normalizedActiveSubscription?._id ||
      normalizedActiveSubscription?.status ||
      normalizedActiveSubscription?.planId ||
      normalizedActiveSubscription?.plan?._id ||
      normalizedActiveSubscription?.startDate ||
      normalizedActiveSubscription?.endDate
  );
  const rawPremiumFlag = pickFirstDefined(
    normalizedSubscription?.isPremium,
    normalizedSubscription?.premium,
    normalizedSubscription?.hasPremiumAccess
  );
  const isPremium =
    typeof rawPremiumFlag === 'boolean'
      ? rawPremiumFlag
      : activeStatus
        ? !['expired', 'cancelled', 'inactive'].includes(activeStatus)
        : Boolean(
            normalizedSubscription?.premiumEndDate ||
              normalizedActiveSubscription?.endDate ||
              currentPlanSource
          );

  return {
    isPremium,
    premiumEndDate:
      pickFirstDefined(
        normalizedSubscription?.premiumEndDate,
        normalizedSubscription?.expiresAt,
        normalizedActiveSubscription?.endDate
      ) || null,
    currentPlan: currentPlanSource ? normalizePlan(currentPlanSource) : normalizedActiveSubscription?.plan,
    activeSubscription: hasActiveSubscriptionData ? normalizedActiveSubscription : null,
  };
};

export const subscriptionService = {
  async getMySubscription() {
    const response = await axiosClient.get(API_ENDPOINTS.PREMIUM.MY_SUBSCRIPTION);
    const payload = getPayload(response);
    const result =
      pickFirstObject(payload?.subscription, payload?.data?.subscription, payload?.data, payload?.result, payload) ||
      {};

    return normalizeSubscription(result);
  },
};

export default subscriptionService;
