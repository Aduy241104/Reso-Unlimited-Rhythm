import cron from "node-cron";
import { getAnalyticsTimezone } from "../services/analytics/trackStatAggregation.service.js";
import { processPendingAudioFingerprints } from "../services/fingerprint/audioFingerprint.job.js";
import { getFingerprintEngineStatus } from "../services/fingerprint/audioFingerprint.service.js";

const SCHEDULE = process.env.FINGERPRINT_CRON_SCHEDULE || "*/5 * * * *";
let started = false;

export const runPendingAudioFingerprints = (options = {}) =>
    processPendingAudioFingerprints(options);

export const startAudioFingerprintCron = () => {
    if (started || process.env.FINGERPRINT_ENABLED === "false") return;

    cron.schedule(SCHEDULE, async () => {
        try {
            const result = await processPendingAudioFingerprints({ batchSize: 10 });
            if (result.found > 0) console.log("[Cron] Audio fingerprint batch:", result);
        } catch (error) {
            console.error("[Cron] Audio fingerprint batch failed:", error.message);
        }
    }, { timezone: getAnalyticsTimezone() });

    started = true;
    console.log(`[Cron] Audio fingerprint scheduled with '${SCHEDULE}'.`);
    void getFingerprintEngineStatus().then((status) => {
        if (status.enabled && !status.available) {
            console.warn(`[Fingerprint] Engine unavailable (${status.errorCode || "unknown"}).`);
        } else if (!status.enabled) {
            console.log("[Fingerprint] Engine disabled by FINGERPRINT_ENABLED=false.");
        } else {
            console.log(`[Fingerprint] Engine ready: ${status.version || "fpcalc"}.`);
        }
    }).catch((error) => {
        console.warn(`[Fingerprint] Health check failed: ${error.message}`);
    });
};

export default { runPendingAudioFingerprints, startAudioFingerprintCron };
