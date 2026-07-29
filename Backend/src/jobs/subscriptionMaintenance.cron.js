import cron from "node-cron";
import subscriptionService from "../services/subscription.service.js";

const SUBSCRIPTION_MAINTENANCE_CRON_EXPRESSION =
    process.env.SUBSCRIPTION_MAINTENANCE_CRON || "*/10 * * * *";
const SUBSCRIPTION_MAINTENANCE_TIMEZONE =
    process.env.SUBSCRIPTION_MAINTENANCE_TIMEZONE || "Asia/Ho_Chi_Minh";

let isMaintenanceRunning = false;

export const runSubscriptionMaintenance = async () => {
    if (isMaintenanceRunning) {
        console.warn("[Cron] Subscription maintenance is already running, skipping this tick.");
        return {
            pendingCleanup: { updatedTransactions: 0, updatedSubscriptions: 0 },
            expiredCleanup: { updatedSubscriptions: 0, updatedUsers: 0 },
            skipped: true,
        };
    }

    isMaintenanceRunning = true;

    try {
        const [pendingCleanup, expiredCleanup] = await Promise.all([
            subscriptionService.cancelTimedOutPendingTransactions(),
            subscriptionService.expireEndedSubscriptions(),
        ]);

        if (
            pendingCleanup.updatedTransactions > 0 ||
            pendingCleanup.updatedSubscriptions > 0 ||
            expiredCleanup.updatedSubscriptions > 0 ||
            expiredCleanup.updatedUsers > 0
        ) {
            console.log(
                `[Cron] Subscription maintenance updated ${pendingCleanup.updatedTransactions} pending transaction(s), ` +
                `${pendingCleanup.updatedSubscriptions} pending subscription(s), ` +
                `${expiredCleanup.updatedSubscriptions} expired subscription(s) and ` +
                `${expiredCleanup.updatedUsers} user subscription flag(s).`
            );
        }

        return {
            pendingCleanup,
            expiredCleanup,
            skipped: false,
        };
    } catch (error) {
        console.error("[Cron] Subscription maintenance failed:", error);
        throw error;
    } finally {
        isMaintenanceRunning = false;
    }
};

export const startSubscriptionMaintenanceCron = () => {
    const task = cron.schedule(
        SUBSCRIPTION_MAINTENANCE_CRON_EXPRESSION,
        () => {
            void runSubscriptionMaintenance();
        },
        {
            timezone: SUBSCRIPTION_MAINTENANCE_TIMEZONE,
        }
    );

    console.log(
        `[Cron] Subscription maintenance scheduled with '${SUBSCRIPTION_MAINTENANCE_CRON_EXPRESSION}' (${SUBSCRIPTION_MAINTENANCE_TIMEZONE}).`
    );

    return { task };
};

export default {
    runSubscriptionMaintenance,
    startSubscriptionMaintenanceCron,
};
