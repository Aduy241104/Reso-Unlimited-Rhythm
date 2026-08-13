import { assessCopyrightRisk } from "../../src/services/fingerprint/copyrightRisk.service.js";

describe("copyright fingerprint risk signals", () => {
    test("raises high risk for an exact duplicate with different owners", () => {
        const result = assessCopyrightRisk({
            sourceTrack: { copyright: { copyrightOwner: "Artist A" } },
            matchedTrack: { copyright: { copyrightOwner: "Artist B" } },
            match: { matchType: "exact_file_duplicate", similarityScore: 1 },
        });

        expect(result.level).toBe("high");
        expect(result.signals.map((signal) => signal.code)).toEqual(
            expect.arrayContaining(["exact_audio_hash_duplicate", "rights_owner_mismatch"])
        );
    });

    test("reduces risk when the same owner declares licensed third-party use", () => {
        const result = assessCopyrightRisk({
            sourceTrack: {
                copyright: {
                    copyrightOwner: "Same Owner",
                    usesLicensedBeat: true,
                    licenseDocumentUrls: ["https://example.test/license.pdf"],
                },
            },
            matchedTrack: { copyright: { copyrightOwner: "same owner" } },
            match: { matchType: "chromaprint", similarityScore: 0.8 },
        });

        expect(result.level).toBe("low");
        expect(result.signals.map((signal) => signal.code)).toEqual(
            expect.arrayContaining(["same_declared_rights_owner", "declared_third_party_use_with_evidence"])
        );
    });

    test("does not punish an artist automatically", () => {
        const result = assessCopyrightRisk({
            sourceTrack: { copyright: { copyrightOwner: "Artist A" } },
            matchedTrack: { copyright: { copyrightOwner: "Artist B" } },
            match: { matchType: "chromaprint", similarityScore: 0.75 },
        });

        expect(result).toEqual(expect.objectContaining({ score: expect.any(Number), level: expect.any(String) }));
    });
});
