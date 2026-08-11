import {
    evaluateModerationDecision,
    getDisplayRejectionReason,
    isPerfectFingerprintMatch,
    MODERATION_DECISIONS,
} from "../../src/services/fingerprint/moderationDecision.service.js";

const evidence = {
    documentId: "proof-1",
    type: "copyright_certificate",
    uploadStatus: "uploaded",
    originalName: "proof.pdf",
    mimeType: "application/pdf",
    size: 1024,
    storageUrl: "https://example.test/proof.pdf",
    sha256: "a".repeat(64),
};

const copyright = (overrides = {}) => ({
    copyrightOwner: "Artist A",
    recordingOwner: "Artist A",
    composer: "Artist A",
    primaryCopyrightType: "original",
    rightsConfirmed: true,
    declarationAccepted: true,
    copyrightEvidenceDocuments: [evidence],
    ...overrides,
});

const cleanInput = (overrides = {}) => ({
    fingerprint: { status: "completed", complete: true },
    content: { audioValid: true, metadataValid: true },
    copyright: copyright(),
    acoustId: { status: "not_found", decision: "review_required", reasonCodes: [] },
    musicBrainz: { status: "not_found", confidence: 0, flags: [] },
    ...overrides,
});

describe("central automatic moderation decision policy", () => {
    test("clean submission becomes AUTO_CLEAR without publishing", () => {
        expect(evaluateModerationDecision(cleanInput()).decision).toBe(MODERATION_DECISIONS.AUTO_CLEAR);
    });

    test("missing declaration becomes AUTO_REJECT", () => {
        expect(evaluateModerationDecision(cleanInput({ copyright: {} })).decision).toBe(MODERATION_DECISIONS.AUTO_REJECT);
    });

    test("same Artist exact duplicate of an approved Track becomes AUTO_REJECT", () => {
        const result = evaluateModerationDecision(cleanInput({
            exactCandidate: {
                candidateContext: "approved_active",
                sameArtist: true,
                candidateTrack: { approvalStatus: "approved", activeStatus: "active" },
            },
        }));
        expect(result).toMatchObject({
            decision: MODERATION_DECISIONS.AUTO_REJECT,
            reasonCodes: ["SAME_ARTIST_EXACT_DUPLICATE"],
        });
    });

    test("approved other-artist exact conflict with evidence is MANUAL_REVIEW_HIGH", () => {
        expect(evaluateModerationDecision(cleanInput({
            exactCandidate: {
                candidateContext: "approved_active",
                sameArtist: false,
                candidateTrack: { approvalStatus: "approved", activeStatus: "active" },
            },
        })).decision).toBe(MODERATION_DECISIONS.MANUAL_REVIEW_HIGH);
    });

    test("approved active perfect Chromaprint duplicate is AUTO_REJECT", () => {
        expect(isPerfectFingerprintMatch({
            matchType: "chromaprint",
            similarityScore: 1,
            overlapRatio: 1,
        })).toBe(true);
        expect(isPerfectFingerprintMatch({
            matchType: "chromaprint",
            similarityScore: 0.99,
            overlapRatio: 1,
        })).toBe(false);
        expect(evaluateModerationDecision(cleanInput({
            perfectCandidate: {
                candidateContext: "approved_active",
                sameArtist: true,
                candidateTrack: { approvalStatus: "approved", activeStatus: "active" },
            },
        }))).toMatchObject({
            decision: MODERATION_DECISIONS.AUTO_REJECT,
            reasonCodes: ["SAME_ARTIST_PERFECT_FINGERPRINT_DUPLICATE"],
        });
        expect(getDisplayRejectionReason(
            "Hồ sơ hiện tại chưa đủ thông tin để tiếp tục duyệt. Vui lòng bổ sung và gửi lại.",
            {
                decision: MODERATION_DECISIONS.AUTO_REJECT,
                reasonCodes: ["SAME_ARTIST_PERFECT_FINGERPRINT_DUPLICATE"],
            },
        )).toContain("trùng với một bài hát đã phát hành khác của cùng nghệ sĩ");
    });

    test("pending A/B exact duplicate is MANUAL_REVIEW_HIGH", () => {
        expect(evaluateModerationDecision(cleanInput({
            exactCandidate: {
                candidateContext: "pending",
                sameArtist: false,
                candidateTrack: { approvalStatus: "pending" },
            },
        })).decision).toBe(MODERATION_DECISIONS.MANUAL_REVIEW_HIGH);
    });

    test("confirmed blocklist is ENFORCEMENT_BLOCK", () => {
        expect(evaluateModerationDecision(cleanInput({
            enforcementEvidence: { _id: "block-1" },
        })).decision).toBe(MODERATION_DECISIONS.ENFORCEMENT_BLOCK);
    });

    test("strong AcoustID original conflict is AUTO_REJECT", () => {
        expect(evaluateModerationDecision(cleanInput({
            copyright: copyright({ copyrightEvidenceDocuments: [] }),
            acoustId: {
                status: "matched",
                decision: "blocked",
                score: 1,
                comparison: { artistMatch: false },
            },
        })).decision).toBe(MODERATION_DECISIONS.AUTO_REJECT);
    });

    test.each(["cover", "remix"])("AcoustID %s with evidence is MANUAL_REVIEW", (primaryCopyrightType) => {
        expect(evaluateModerationDecision(cleanInput({
            copyright: copyright({
                primaryCopyrightType,
                isOriginal: false,
                isCover: primaryCopyrightType === "cover",
                isRemix: primaryCopyrightType === "remix",
                originalTrackTitle: "Original work",
                originalArtistName: "Original artist",
            }),
            acoustId: {
                status: "matched",
                decision: "blocked",
                score: 1,
                comparison: { artistMatch: false },
            },
        })).decision).toBe(MODERATION_DECISIONS.MANUAL_REVIEW);
    });

    test("AcoustID timeout does not create a rejection or review", () => {
        expect(evaluateModerationDecision(cleanInput({
            acoustId: {
                status: "failed",
                decision: "review_required",
                providerUnavailable: true,
                reasonCodes: ["acoustid_timeout"],
            },
        })).decision).toBe(MODERATION_DECISIONS.AUTO_CLEAR);
    });

    test("MusicBrainz unavailable does not create a rejection or hard block", () => {
        expect(evaluateModerationDecision(cleanInput({
            musicBrainz: {
                status: "failed",
                providerUnavailable: true,
                flags: ["musicbrainz_unavailable"],
            },
        })).decision).toBe(MODERATION_DECISIONS.AUTO_CLEAR);
    });

    test("high AcoustID score without identity is a medium-risk manual review", () => {
        const result = evaluateModerationDecision(cleanInput({
            acoustId: {
                status: "possible_match",
                decision: "review_required",
                score: 0.93,
                reasonCodes: ["ACOUSTID_HIGH_SCORE_WITHOUT_IDENTITY"],
                match: { mbid: null },
                musicBrainzRecordingIds: [],
                comparison: { artistMatch: null },
            },
        }));

        expect(result).toMatchObject({
            decision: MODERATION_DECISIONS.MANUAL_REVIEW,
            riskLevel: "medium",
        });
        expect(result.reasonCodes).toContain("ACOUSTID_HIGH_SCORE_WITHOUT_IDENTITY");
    });

    test("AcoustID 93% without identity plus MusicBrainz artist mismatch is manual review", () => {
        const result = evaluateModerationDecision(cleanInput({
            acoustId: {
                status: "possible_match",
                decision: "review_required",
                score: 0.93,
                reasonCodes: ["ACOUSTID_HIGH_SCORE_WITHOUT_IDENTITY"],
                match: { mbid: null },
                musicBrainzRecordingIds: [],
                comparison: { artistMatch: null },
            },
            musicBrainz: {
                status: "possible_match",
                confidence: 0.61,
                metadataSimilarity: 0.61,
                comparison: {
                    titleMatch: 1,
                    artistMatch: 0,
                    durationMatch: 1,
                    isrcMatch: null,
                    iswcMatch: null,
                },
                flags: ["possible_existing_work", "external_metadata_conflict"],
                reasonCodes: ["MUSICBRAINZ_ARTIST_MISMATCH", "MUSICBRAINZ_METADATA_CONFLICT"],
            },
        }));

        expect(result.decision).toBe(MODERATION_DECISIONS.MANUAL_REVIEW);
        expect(result.riskLevel).toBe("medium");
        expect(result.reasonCodes).toEqual(expect.arrayContaining([
            "ACOUSTID_HIGH_SCORE_WITHOUT_IDENTITY",
            "MUSICBRAINZ_ARTIST_MISMATCH",
            "MUSICBRAINZ_METADATA_CONFLICT",
        ]));
        expect(result.decision).not.toBe(MODERATION_DECISIONS.AUTO_CLEAR);
        expect(result.decision).not.toBe(MODERATION_DECISIONS.AUTO_REJECT);
        expect(result.decision).not.toBe(MODERATION_DECISIONS.ENFORCEMENT_BLOCK);
    });

    test("MusicBrainz mismatch alone never becomes AUTO_REJECT or enforcement", () => {
        const result = evaluateModerationDecision(cleanInput({
            musicBrainz: {
                status: "matched",
                confidence: 0.91,
                metadataSimilarity: 0.91,
                comparison: { titleMatch: 1, artistMatch: 0, durationMatch: 1 },
                reasonCodes: ["MUSICBRAINZ_ARTIST_MISMATCH", "MUSICBRAINZ_STRONG_METADATA_CONFLICT"],
            },
        }));

        expect(result.decision).toBe(MODERATION_DECISIONS.MANUAL_REVIEW_HIGH);
        expect(result.decision).not.toBe(MODERATION_DECISIONS.AUTO_REJECT);
        expect(result.decision).not.toBe(MODERATION_DECISIONS.ENFORCEMENT_BLOCK);
    });
});
