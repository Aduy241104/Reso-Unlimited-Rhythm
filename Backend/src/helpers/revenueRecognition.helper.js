const REVENUE_INSTALLMENT_DAYS = 30;
const DEFAULT_REVENUE_DURATION_DAYS = 30;

export const resolveRevenueInstallmentCount = (durationDays) => {
    const normalizedDurationDays = Number(durationDays);

    if (!Number.isFinite(normalizedDurationDays) || normalizedDurationDays < 1) {
        return 1;
    }

    return Math.max(
        1,
        Math.ceil(normalizedDurationDays / REVENUE_INSTALLMENT_DAYS)
    );
};

const buildResolvedDurationDaysExpression = () => ({
    $ifNull: [
        "$planSnapshot.durationDays",
        {
            $ifNull: [
                { $arrayElemAt: ["$subscription.planSnapshot.durationDays", 0] },
                {
                    $ifNull: [
                        { $arrayElemAt: ["$plan.durationDays", 0] },
                        DEFAULT_REVENUE_DURATION_DAYS,
                    ],
                },
            ],
        },
    ],
});

/**
 * Builds the common transaction pipeline used to recognize premium revenue
 * in a monthly revenue period. A successful transaction contributes one
 * installment per month of its plan, starting in the transaction's month.
 */
export const buildRevenueRecognitionPipeline = ({
    periodStart,
    periodEnd,
    year,
    month,
    timezoneName,
}) => {
    const daysInRevenueMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

    return [
        {
            $match: {
                status: "success",
                paidAt: {
                    $exists: true,
                    $ne: null,
                    $lt: periodEnd,
                },
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "subscriptionId",
                foreignField: "_id",
                as: "subscription",
            },
        },
        {
            $lookup: {
                from: "plans",
                localField: "planId",
                foreignField: "_id",
                as: "plan",
            },
        },
        {
            $set: {
                resolvedDurationDays: buildResolvedDurationDaysExpression(),
            },
        },
        {
            $set: {
                installmentCount: {
                    $cond: [
                        { $gt: ["$resolvedDurationDays", 0] },
                        {
                            $ceil: {
                                $divide: [
                                    "$resolvedDurationDays",
                                    REVENUE_INSTALLMENT_DAYS,
                                ],
                            },
                        },
                        1,
                    ],
                },
                paidMonthStart: {
                    $dateTrunc: {
                        date: "$paidAt",
                        unit: "month",
                        timezone: timezoneName,
                    },
                },
            },
        },
        {
            $set: {
                monthOffset: {
                    $dateDiff: {
                        startDate: "$paidMonthStart",
                        endDate: periodStart,
                        unit: "month",
                        timezone: timezoneName,
                    },
                },
            },
        },
        {
            $match: {
                $expr: {
                    $and: [
                        { $gte: ["$monthOffset", 0] },
                        { $lt: ["$monthOffset", "$installmentCount"] },
                    ],
                },
            },
        },
        {
            $set: {
                installmentBaseAmount: {
                    $floor: {
                        $divide: ["$amount", "$installmentCount"],
                    },
                },
            },
        },
        {
            $set: {
                recognizedRevenue: {
                    $add: [
                        "$installmentBaseAmount",
                        {
                            $cond: [
                                {
                                    $lt: [
                                        "$monthOffset",
                                        {
                                            $subtract: [
                                                "$amount",
                                                {
                                                    $multiply: [
                                                        "$installmentBaseAmount",
                                                        "$installmentCount",
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                                1,
                                0,
                            ],
                        },
                    ],
                },
            },
        },
        {
            $set: {
                recognizedDate: {
                    $dateFromParts: {
                        year,
                        month,
                        day: {
                            $min: [
                                {
                                    $dayOfMonth: {
                                        date: "$paidAt",
                                        timezone: timezoneName,
                                    },
                                },
                                daysInRevenueMonth,
                            ],
                        },
                        timezone: timezoneName,
                    },
                },
            },
        },
    ];
};

export default {
    buildRevenueRecognitionPipeline,
    resolveRevenueInstallmentCount,
};
