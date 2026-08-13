import {
    getCopyrightChangeFlags,
    getMeaningfulChangedFields,
    hashTrackMutableData,
} from "../../src/services/track/track.rejection.js";
import { sanitizeArtistCopyright } from "../../src/services/track/track.draft.validation.js";
import { assertRejectedTrackHasMeaningfulChanges } from "../../src/services/Track/artist/artist.track.service.js";

const baseTrack = {
    title: "Original title",
    versionTitle: "",
    description: "Description",
    tags: ["pop"],
    genreIds: ["507f1f77bcf86cd799439011"],
    audioFiles: [{ url: "https://cdn.test/audio.mp3", format: "mp3", bitrate: 320, label: "original", priority: 0 }],
    duration: 180,
    avatar: "https://cdn.test/avatar.jpg",
    coverImage: ["https://cdn.test/cover.jpg"],
    lyricsStatic: "lyrics",
    lyricsSyncUrl: "",
    copyright: {
        copyrightOwner: "Artist",
        recordingOwner: "Artist",
        copyrightEvidenceDocuments: [{
            documentId: "doc-1",
            type: "license",
            originalName: "license.pdf",
            mimeType: "application/pdf",
            size: 100,
            url: "https://cdn.test/license.pdf",
            sha256: "a".repeat(64),
            reviewedAt: new Date(),
            reviewedBy: "admin",
            reviewedSessionId: "session",
            adminNote: "server only",
        }],
    },
};

test("artist copyright sanitizer strips server-managed evidence metadata", () => {
    const sanitized = sanitizeArtistCopyright(baseTrack.copyright);
    const document = sanitized.copyrightEvidenceDocuments[0];

    expect(document).toMatchObject({ documentId: "doc-1", url: "https://cdn.test/license.pdf" });
    expect(document).not.toHaveProperty("reviewedAt");
    expect(document).not.toHaveProperty("reviewedBy");
    expect(document).not.toHaveProperty("reviewedSessionId");
    expect(document).not.toHaveProperty("adminNote");
});

test("rejection hash ignores audit metadata but changes for artist-editable fields", () => {
    const withAudit = structuredClone(baseTrack);
    withAudit.copyright.copyrightEvidenceDocuments[0].reviewedAt = "different";
    withAudit.copyright.copyrightEvidenceDocuments[0].reviewedBy = "other-admin";

    expect(hashTrackMutableData(baseTrack)).toBe(hashTrackMutableData(withAudit));
    expect(getMeaningfulChangedFields(baseTrack, { ...baseTrack, title: "Updated title" })).toEqual(["title"]);
});

test("copyright and evidence versions can be compared independently", () => {
    const changedEvidence = structuredClone(baseTrack);
    changedEvidence.copyright.copyrightEvidenceDocuments[0].documentId = "doc-2";
    const changedDeclaration = structuredClone(baseTrack);
    changedDeclaration.copyright.copyrightOwner = "Another owner";

    expect(getCopyrightChangeFlags(baseTrack.copyright, changedEvidence.copyright)).toEqual({
        declarationChanged: false,
        evidenceChanged: true,
    });
    expect(getCopyrightChangeFlags(baseTrack.copyright, changedDeclaration.copyright)).toEqual({
        declarationChanged: true,
        evidenceChanged: false,
    });
});

test("rejected resubmission guard blocks unchanged state and accepts an artist edit", () => {
    const track = {
        ...baseTrack,
        approvalStatus: "rejected",
        moderation: {
            lastRejection: {
                rejectionId: "rejection-1",
                mutableSnapshotHash: hashTrackMutableData(baseTrack),
                submissionVersion: 1,
                audioVersion: 1,
                copyrightVersion: 1,
                evidenceVersion: 1,
            },
        },
    };

    expect(() => assertRejectedTrackHasMeaningfulChanges(track, baseTrack)).toThrow(expect.objectContaining({
        statusCode: 409,
        details: { code: "TRACK_RESUBMIT_REQUIRES_CHANGES" },
    }));
    expect(() => assertRejectedTrackHasMeaningfulChanges(track, { ...baseTrack, title: "Updated" })).not.toThrow();
});
