import { getTrackSubmissionData } from "../../src/services/Track/track.submit.validation.js";

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
