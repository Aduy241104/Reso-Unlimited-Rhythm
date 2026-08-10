import { getTrackDeletionDisposition } from "../../src/services/fingerprint/fingerprint.lifecycle.service.js";

describe("fingerprint deletion lifecycle policy", () => {
    test("unsubmitted draft is operationally cleaned", () => {
        expect(getTrackDeletionDisposition({
            approvalStatus: "draft",
            moderation: { submittedAt: null, violationFlags: [] },
            pendingUpdate: { status: "none" },
        })).toMatchObject({ mode: "operational_cleanup" });
    });

    test("copyright/duplicate rejection retains enforcement evidence", () => {
        expect(getTrackDeletionDisposition({
            approvalStatus: "rejected",
            moderation: { violationFlags: ["copyright", "duplicate_track"] },
            fingerprintScreening: { exactDuplicate: true },
        })).toMatchObject({ mode: "retain_enforcement", reasonCode: "exact_duplicate" });
    });

    test("approved deletion remains historical and does not block re-upload", () => {
        expect(getTrackDeletionDisposition({
            approvalStatus: "approved",
            moderation: { submittedAt: new Date(), violationFlags: [] },
            fingerprintScreening: { exactDuplicate: false },
        })).toMatchObject({ mode: "historical" });
    });
});
