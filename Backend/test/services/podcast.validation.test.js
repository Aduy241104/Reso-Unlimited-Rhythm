import { getPodcastSubmitValidationErrors, validatePodcastForSubmit } from "../../src/services/podcast/podcast.validation.service.js";

const validPodcast = (overrides = {}) => ({
    title: "The Reso Conversation",
    description: "A useful conversation about music and people.",
    audioUrl: "https://cdn.example.com/podcast.mp3",
    duration: 120,
    copyrightType: "original",
    copyrightConfirmed: true,
    ...overrides,
});

describe("Podcast V1 submit validation", () => {
    test("allows a minimal draft to exist without submit fields", () => {
        expect(getPodcastSubmitValidationErrors({})).toEqual(expect.arrayContaining([
            expect.objectContaining({ code: "PODCAST_AUDIO_REQUIRED" }),
        ]));
    });

    test("requires artist confirmation for original audio", () => {
        try {
            validatePodcastForSubmit(validPodcast({ copyrightConfirmed: false }));
            throw new Error("Expected validation to fail");
        } catch (error) {
            expect(error.details).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "PODCAST_COPYRIGHT_CONFIRMATION_REQUIRED" }),
            ]));
        }
    });

    test("requires source and proof for licensed audio", () => {
        const errors = getPodcastSubmitValidationErrors(validPodcast({ copyrightType: "licensed" }));
        expect(errors.map((item) => item.code)).toEqual(expect.arrayContaining([
            "PODCAST_COPYRIGHT_SOURCE_REQUIRED",
            "PODCAST_COPYRIGHT_PROOF_REQUIRED",
        ]));
    });

    test("requires a source for third-party audio", () => {
        const errors = getPodcastSubmitValidationErrors(validPodcast({ copyrightType: "third_party" }));
        expect(errors).toEqual(expect.arrayContaining([
            expect.objectContaining({ code: "PODCAST_COPYRIGHT_SOURCE_REQUIRED" }),
        ]));
    });

    test("accepts a complete original Podcast", () => {
        expect(validatePodcastForSubmit(validPodcast())).toMatchObject({ title: "The Reso Conversation" });
    });
});
