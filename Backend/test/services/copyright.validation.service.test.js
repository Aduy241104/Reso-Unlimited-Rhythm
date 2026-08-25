import {
    normalizeISWC,
    validateCopyrightForSubmit,
} from "../../src/services/Track/copyright.validation.service.js";
import Track from "../../src/models/Track.js";

const validOriginal = () => ({
    copyrightOwner: "Nguyen Van A",
    recordingOwner: "Nguyen Van A",
    composer: "Nguyen Van A",
    primaryCopyrightType: "original",
    isOriginal: true,
    rightsConfirmed: true,
    declarationAccepted: true,
    copyrightEvidenceDocuments: [{
        documentId: "evidence-1",
        type: "copyright_certificate",
        version: 1,
        originalName: "proof.pdf",
        mimeType: "application/pdf",
        size: 1024,
        storageUrl: "https://example.com/proof.pdf",
        sha256: "a".repeat(64),
        uploadStatus: "uploaded",
    }],
});

describe("server-side copyright declaration validation", () => {
    test("accepts a complete original declaration", () => {
        expect(validateCopyrightForSubmit(validOriginal()).primaryCopyrightType).toBe("original");
    });

    test("requires uploaded copyright evidence for an original declaration", () => {
        const declaration = validOriginal();
        declaration.copyrightEvidenceDocuments = [];

        expect(() => validateCopyrightForSubmit(declaration)).toThrow("Thông tin bản quyền chưa hợp lệ.");
    });

    test("accepts copyright stored as a Mongoose nested document", () => {
        const track = new Track({
            title: "Nested copyright test",
            artist_artistId: "6a44d1972c39caf158e3734d",
            duration: 180,
            copyright: validOriginal(),
        });

        expect(validateCopyrightForSubmit(track.copyright)).toMatchObject({
            copyrightOwner: "Nguyen Van A",
            recordingOwner: "Nguyen Van A",
            composer: "Nguyen Van A",
            primaryCopyrightType: "original",
        });
    });

    test("rejects wrong field types and placeholder owners", () => {
        expect(() => validateCopyrightForSubmit({
            ...validOriginal(),
            copyrightOwner: 123,
            recordingOwner: "-",
        })).toThrow("Thông tin bản quyền chưa hợp lệ.");
    });

    test("requires the canonical rights confirmation", () => {
        const declaration = validOriginal();
        delete declaration.rightsConfirmed;
        expect(() => validateCopyrightForSubmit(declaration)).toThrow("Thông tin bản quyền chưa hợp lệ.");
    });

    test("rejects conflicting primary types", () => {
        expect(() => validateCopyrightForSubmit({
            ...validOriginal(),
            isCover: true,
            primaryCopyrightType: "original",
        })).toThrow("Thông tin bản quyền chưa hợp lệ.");
    });

    test("requires source work and evidence for remix", () => {
        expect(() => validateCopyrightForSubmit({
            ...validOriginal(),
            primaryCopyrightType: "remix",
            isOriginal: false,
            isRemix: true,
        })).toThrow("Thông tin bản quyền chưa hợp lệ.");
    });

    test("does not treat a clean fingerprint declaration as legal verification", () => {
        const result = validateCopyrightForSubmit(validOriginal());
        expect(result.rightsConfirmed).toBe(true);
    });

    test("normalizes an ISWC with a numeric check digit", () => {
        expect(normalizeISWC("T0345246801")).toBe("T-034.524.680-1");
    });

    test("rejects an ISWC whose check digit is a letter", () => {
        expect(() => validateCopyrightForSubmit({
            ...validOriginal(),
            iswc: "T-034.524.680-A",
        })).toThrow("Thông tin bản quyền chưa hợp lệ.");
    });
});
