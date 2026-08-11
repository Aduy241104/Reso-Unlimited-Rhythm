import {
    assertTrackEditableByArtist,
    getTrackSubmissionData,
} from "../../src/services/Track/track.submit.validation.js";

describe("track submission snapshot", () => {
    test("fills missing pending copyright fields from the current track", () => {
        const result = getTrackSubmissionData({
            _id: "track-1",
            title: "Demo",
            copyright: {
                copyrightOwner: "Thái",
                recordingOwner: "Thái",
                composer: "Quốc Thái",
            },
            pendingUpdate: {
                status: "rejected",
                data: {
                    title: "Demo revised",
                    copyright: {
                        declarationAccepted: true,
                        rightsConfirmed: true,
                    },
                },
            },
        });

        expect(result.title).toBe("Demo revised");
        expect(result.copyright).toMatchObject({
            copyrightOwner: "Thái",
            recordingOwner: "Thái",
            composer: "Quốc Thái",
            declarationAccepted: true,
            rightsConfirmed: true,
        });
    });
});

describe("artist track edit guards", () => {
    test("allows a draft to be edited without creating a pending-update draft status", () => {
        expect(() => assertTrackEditableByArtist({
            approvalStatus: "draft",
            activeStatus: "draft",
            pendingUpdate: { status: "none" },
        })).not.toThrow();
    });

    test("keeps approval-pending tracks locked", () => {
        expect(() => assertTrackEditableByArtist({
            approvalStatus: "pending",
            activeStatus: "draft",
            pendingUpdate: { status: "none" },
        })).toThrow("đang chờ duyệt");
    });

    test("keeps pending updates locked", () => {
        expect(() => assertTrackEditableByArtist({
            approvalStatus: "approved",
            activeStatus: "active",
            pendingUpdate: { status: "pending" },
        })).toThrow("bản cập nhật đang được xem xét");
    });
});
