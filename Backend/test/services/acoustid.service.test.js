import { jest } from "@jest/globals";
import {
    encodeChromaprint,
    isReusableAcoustIdResult,
    lookupAcoustId,
    normalizeAcoustIdResult,
} from "../../src/services/external/acoustid.service.js";
import {
    assertAcoustIdApprovalAllowed,
    isInternalFingerprintApprovalBlocked,
} from "../../src/services/track/moderationReview.service.js";

const recordingPayload = ({
    score = 0.96,
    title = "Lạc Trôi",
    artist = "Sơn Tùng M-TP",
} = {}) => ({
    status: "ok",
    results: [{
        id: "acoustid-track-1",
        score,
        recordings: [{
            id: "c1713485-658e-4ae7-b024-7f40905ca29a",
            title,
            duration: 233,
            artists: [{ id: "artist-1", name: artist }],
            isrcs: ["VNA231700001"],
            releasegroups: [{ id: "release-group-1", title, type: "Single" }],
        }],
    }],
});

const declared = (overrides = {}) => ({
    primaryCopyrightType: "original",
    title: "Lạc Trôi",
    artist: "Quách Thái",
    copyrightOwner: "Quách Thái",
    recordingOwner: "Quách Thái",
    usesSample: false,
    usesThirdPartyBeat: false,
    ...overrides,
});

describe("AcoustID verification decisions", () => {
    test("encodes an existing raw Chromaprint without running fpcalc", () => {
        expect(encodeChromaprint([1], 0)).toBe("AAAAAQE");
        expect(encodeChromaprint([1], 1)).toBe("AQAAAQE");
        expect(encodeChromaprint(Array(100).fill(558758263))).toBe(
            "AQAAZEmUaEkSZSoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
        );
    });

    test("high-score original with artist ownership conflict blocks approval", () => {
        const result = normalizeAcoustIdResult({ payload: recordingPayload(), declared: declared() });

        expect(result).toMatchObject({
            status: "matched",
            decision: "blocked",
            acoustIdTrackId: "acoustid-track-1",
            musicBrainzRecordingIds: ["c1713485-658e-4ae7-b024-7f40905ca29a"],
        });
        expect(result.reasonCodes).toContain("external_audio_artist_conflict");
    });

    test("matching declared owner does not create an ownership conflict", () => {
        const result = normalizeAcoustIdResult({
            payload: recordingPayload(),
            declared: declared({ copyrightOwner: "Sơn Tùng M-TP" }),
        });

        expect(result.decision).toBe("clear");
        expect(result.reasonCodes).toEqual(["external_audio_match_consistent"]);
    });

    test.each(["cover", "remix"])("a declared %s requires review but is not automatically blocked", (primaryCopyrightType) => {
        const result = normalizeAcoustIdResult({
            payload: recordingPayload(),
            declared: declared({ primaryCopyrightType }),
        });

        expect(result.status).toBe("matched");
        expect(result.decision).toBe("review_required");
        expect(result.reasonCodes).toContain(`declared_${primaryCopyrightType}_external_audio_match`);
    });

    test("a lower non-zero score is a possible match requiring review", () => {
        const result = normalizeAcoustIdResult({
            payload: recordingPayload({ score: 0.6 }),
            declared: declared(),
            minScore: 0.85,
        });

        expect(result).toMatchObject({ status: "possible_match", decision: "review_required", score: 0.6 });
    });

    test("a high score without a recording identity is not described as low confidence", () => {
        const result = normalizeAcoustIdResult({
            payload: {
                status: "ok",
                results: [{ id: "acoustid-unknown", score: 0.93, recordings: [] }],
            },
            declared: declared(),
        });

        expect(result).toMatchObject({ status: "possible_match", decision: "review_required", score: 0.93 });
        expect(result.reasonCodes).toContain("ACOUSTID_HIGH_SCORE_WITHOUT_IDENTITY");
        expect(result.reasonCodes).not.toContain("low_confidence_external_audio_match");
    });

    test("karaoke/instrumental/radio-edit ambiguity stays in manual review", () => {
        const result = normalizeAcoustIdResult({
            payload: recordingPayload({ title: "Lạc Trôi (Instrumental)" }),
            declared: declared({ title: "Lạc Trôi (Instrumental)", artist: "Sơn Tùng M-TP" }),
        });

        expect(result).toMatchObject({ status: "matched", decision: "review_required" });
        expect(result.reasonCodes).toContain("similar_version_ambiguous");
    });

    test("an empty response is not found and does not claim infringement", () => {
        const result = normalizeAcoustIdResult({
            payload: { status: "ok", results: [] },
            declared: declared(),
        });

        expect(result).toMatchObject({ status: "not_found", decision: "review_required", score: 0 });
    });
});

describe("AcoustID lookup failures and retries", () => {
    const lookupInput = {
        rawFingerprint: [1, 2, 3, 5, 8],
        duration: 233,
        declared: declared(),
        apiKey: "test-client-key",
        rateLimit: false,
    };

    test.each([
        [Object.assign(new Error("request timed out"), { name: "AbortError" }), "acoustid_timeout"],
        [new Error("upstream unavailable"), "acoustid_lookup_failed"],
    ])("timeout/API failure stays neutral and does not force an override", async (error, reasonCode) => {
        const result = await lookupAcoustId({
            ...lookupInput,
            fingerprintHash: `failure-${reasonCode}`,
            request: jest.fn().mockRejectedValue(error),
        });

        expect(result).toMatchObject({ status: "failed", decision: "review_required" });
        expect(result.reasonCodes).toContain(reasonCode);
        expect(assertAcoustIdApprovalAllowed({
            checklist: {
                acoustIdStatus: result.status,
                acoustIdDecision: result.decision,
                acoustIdResult: result,
            },
        })).toMatchObject({ overrideUsed: false, providerUnavailable: true });
    });

    test("a missing production key fails without making an HTTP request", async () => {
        const request = jest.fn();
        const result = await lookupAcoustId({
            ...lookupInput,
            fingerprintHash: "missing-key",
            apiKey: "",
            request,
        });

        expect(result.status).toBe("failed");
        expect(result.reasonCodes).toContain("acoustid_missing_api_key");
        expect(request).not.toHaveBeenCalled();
    });

    test("a failed lookup can be retried for the same fingerprint", async () => {
        const request = jest.fn()
            .mockRejectedValueOnce(new Error("temporary failure"))
            .mockResolvedValueOnce(recordingPayload());
        const input = { ...lookupInput, fingerprintHash: "retry-fingerprint", request };

        const first = await lookupAcoustId(input);
        const retried = await lookupAcoustId({ ...input, bypassCache: true });

        expect(first.status).toBe("failed");
        expect(retried.status).toBe("matched");
        expect(request).toHaveBeenCalledTimes(2);
    });

    test("a cached result from an older submission is recalculated for the active review", () => {
        const current = { status: "not_found", submissionVersion: 1, audioVersion: 1 };

        expect(isReusableAcoustIdResult({
            current,
            sameFingerprint: true,
            versions: { submissionVersion: 2, audioVersion: 1 },
        })).toBe(false);
        expect(isReusableAcoustIdResult({
            current,
            sameFingerprint: true,
            versions: { submissionVersion: 1, audioVersion: 1 },
        })).toBe(true);
    });
});

describe("AcoustID approval override", () => {
    const blockedChecklist = { acoustIdStatus: "matched", acoustIdDecision: "blocked" };

    test.each([
        blockedChecklist,
        {
            acoustIdStatus: "failed",
            acoustIdDecision: "blocked",
            acoustIdResult: { status: "failed", providerUnavailable: false },
        },
    ])("an authorized moderator can override a blocked/failed result with a non-empty reason", (checklist) => {
        expect(assertAcoustIdApprovalAllowed({
            checklist,
            payload: { acoustIdOverride: true, acoustIdOverrideReason: "Đã xác minh giấy phép hợp lệ." },
            overrideAuthorized: true,
        })).toEqual({ overrideUsed: true });
    });

    test("override without a reason is rejected", () => {
        expect(() => assertAcoustIdApprovalAllowed({
            checklist: blockedChecklist,
            payload: { acoustIdOverride: true, acoustIdOverrideReason: "   " },
            overrideAuthorized: true,
        })).toThrow("override reason is required");
    });

    test("a possible match needs a recorded manual-review reason while not_found stays neutral", () => {
        const checklist = { acoustIdStatus: "possible_match", acoustIdDecision: "review_required" };

        expect(() => assertAcoustIdApprovalAllowed({ checklist, payload: { adminNote: "short" } }))
            .toThrow("manual external-audio review reason");
        expect(assertAcoustIdApprovalAllowed({
            checklist,
            payload: { adminNote: "Đã đối chiếu tài liệu bản quyền thủ công." },
        })).toEqual({ overrideUsed: false });
        expect(assertAcoustIdApprovalAllowed({
            checklist: { acoustIdStatus: "not_found", acoustIdDecision: "review_required" },
        })).toEqual({ overrideUsed: false });
    });

    test("internal high-risk fingerprint blocking remains unchanged", () => {
        expect(isInternalFingerprintApprovalBlocked({ highRisk: true })).toBe(true);
        expect(isInternalFingerprintApprovalBlocked({ highRisk: false })).toBe(false);
    });
});
