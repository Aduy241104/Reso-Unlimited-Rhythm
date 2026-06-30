const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

const calculateDaysRemaining = (endDate) => {
    if (!endDate) {
        return 0;
    }

    return Math.max(
        0,
        Math.ceil((new Date(endDate) - new Date()) / MILLISECONDS_PER_DAY)
    );
};

const buildEmptySubscriptionResponse = () => ({
    isPremium: false,
    planId: null,
    planName: null,
    price: null,
    durationDays: null,
    status: "none",
    startDate: null,
    endDate: null,
    autoRenew: false,
    daysRemaining: 0,
    features: [],
});

export { calculateDaysRemaining, buildEmptySubscriptionResponse };

export default {
    calculateDaysRemaining,
    buildEmptySubscriptionResponse,
};
