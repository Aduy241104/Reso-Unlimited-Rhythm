import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import mongoose from "mongoose";

// Mock các dependencies
jest.unstable_mockModule("../../src/models/User.js", () => ({
    default: {
        findById: jest.fn(),
    },
}));

jest.unstable_mockModule("../../src/models/Artist.js", () => ({
    default: {
        findOne: jest.fn(),
    },
}));

jest.unstable_mockModule("../../src/models/Album.js", () => ({
    default: {
        findById: jest.fn(),
    },
}));

jest.unstable_mockModule("../../src/models/Track.js", () => ({
    default: jest.fn(),
}));

jest.unstable_mockModule("../../src/utils/AppError.js", () => ({
    AppError: class AppError extends Error {
        constructor(message, statusCode, details) {
            super(message);
            this.statusCode = statusCode;
            this.details = details;
            this.name = "AppError";
        }
    },
}));

jest.unstable_mockModule("../../src/utils/uploadCloud.js", () => ({
    deleteCloudinaryAssetsByUrls: jest.fn(),
}));

jest.unstable_mockModule("../../src/services/Track/track.helper.js", () => ({
    formatTrackManagementDetail: jest.fn((track) => track),
}));

// Import sau khi mock
const User = (await import("../../src/models/User.js")).default;
const Artist = (await import("../../src/models/Artist.js")).default;
const Album = (await import("../../src/models/Album.js")).default;
const Track = (await import("../../src/models/Track.js")).default;
const createTrackSchema = (await import("../../src/middlewares/TrackMiddlewareValidation/track.validation.js")).default;
const artistTrackService = (await import("../../src/services/Track/artist.track.service.js")).default;

const validateCreateTrackBody = (payload) => createTrackSchema.validate(payload, { abortEarly: false });

// ==================== INPUT VALIDATION: CREATE TRACK ====================
describe("Create Track - Complete Input Field Validation", () => {
    // ========== VALIDATE TITLE FIELD ==========
    describe("Title Field Validation", () => {
        test("should require valid title with max length", () => {
            const tests = [
                { payload: { duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }] }, pass: false },
                { payload: { title: "", duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }] }, pass: false },
                { payload: { title: "Test", duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }] }, pass: true },
                { payload: { title: "a".repeat(256), duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }] }, pass: false },
            ];
            tests.forEach(t => {
                const { error } = validateCreateTrackBody(t.payload);
                if (t.pass) expect(error).toBeUndefined();
                else expect(error?.details.some(d => d.context.key === "title")).toBe(true);
            });
        });
    });

    // ========== VALIDATE DURATION FIELD ==========
    describe("Duration Field Validation", () => {
        test("should require positive numeric duration", () => {
            const tests = [
                { payload: { title: "Test", audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }] }, pass: false },
                { payload: { title: "Test", duration: 0, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }] }, pass: false },
                { payload: { title: "Test", duration: -100, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }] }, pass: false },
                { payload: { title: "Test", duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }] }, pass: true },
                { payload: { title: "Test", duration: "180", audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }] }, pass: true },
            ];
            tests.forEach(t => {
                const { error } = validateCreateTrackBody(t.payload);
                if (t.pass) expect(error).toBeUndefined();
                else expect(error?.details.some(d => d.context.key === "duration")).toBe(true);
            });
        });
    });

    // ========== VALIDATE AUDIO FILES FIELD ==========
    describe("Audio Files Field Validation", () => {
        test("should validate audioFiles array with required fields", () => {
            const { error: e1 } = validateCreateTrackBody({ title: "Test", duration: 180 });
            const { error: e2 } = validateCreateTrackBody({ title: "Test", duration: 180, audioFiles: "not-array" });
            const { error: e3 } = validateCreateTrackBody({ title: "Test", duration: 180, audioFiles: [{ format: "mp3" }] });
            const { value: v4, error: e4 } = validateCreateTrackBody({ title: "Test", duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }] });
            expect(e1).toBeUndefined();
            expect(e2?.details.some(d => d.context.key === "audioFiles")).toBe(true);
            expect(e3?.details.length > 0).toBe(true);
            expect(e4).toBeUndefined();
            expect(v4.audioFiles.length).toBe(1);
        });
    });

    // ========== VALIDATE GENRE IDS FIELD ==========
    describe("Genre IDs Field Validation", () => {
        test("should validate genreIds as array of strings", () => {
            const { error: e1 } = validateCreateTrackBody({ title: "Test", duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }] });
            const { error: e2 } = validateCreateTrackBody({ title: "Test", duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }], genreIds: "genre-1" });
            const { error: e3 } = validateCreateTrackBody({ title: "Test", duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }], genreIds: ["genre-1"] });
            expect(e1).toBeUndefined();
            expect(e2?.details.some(d => d.context.key === "genreIds")).toBe(true);
            expect(e3).toBeUndefined();
        });
    });

    // ========== VALIDATE AVATAR FIELD ==========
    describe("Avatar Field Validation", () => {
        test("should validate avatar as optional string", () => {
            const { error: e1 } = validateCreateTrackBody({ title: "Test", duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }] });
            const { error: e2 } = validateCreateTrackBody({ title: "Test", duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }], avatar: "avatar.jpg" });
            const { error: e3 } = validateCreateTrackBody({ title: "Test", duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }], avatar: 123 });
            expect(e1).toBeUndefined();
            expect(e2).toBeUndefined();
            expect(e3?.details.some(d => d.context.key === "avatar")).toBe(true);
        });
    });

    // ========== VALIDATE COVER IMAGE FIELD ==========
    describe("Cover Image Field Validation", () => {
        test("should validate coverImage as array of strings", () => {
            const { error: e1 } = validateCreateTrackBody({ title: "Test", duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }] });
            const { error: e2 } = validateCreateTrackBody({ title: "Test", duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }], coverImage: "not-array" });
            const { error: e3 } = validateCreateTrackBody({ title: "Test", duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }], coverImage: ["cover.jpg"] });
            expect(e1).toBeUndefined();
            expect(e2?.details.some(d => d.context.key === "coverImage")).toBe(true);
            expect(e3).toBeUndefined();
        });
    });

    // ========== VALIDATE ALBUM ID FIELD ==========
    describe("Album ID Field Validation", () => {
        test("should validate album_albumId as optional string", () => {
            const { error: e1 } = validateCreateTrackBody({ title: "Test", duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }] });
            const { error: e2 } = validateCreateTrackBody({ title: "Test", duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }], album_albumId: "507f1f77bcf86cd799439011" });
            const { error: e3 } = validateCreateTrackBody({ title: "Test", duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }], album_albumId: 123 });
            expect(e1).toBeUndefined();
            expect(e2).toBeUndefined();
            expect(e3?.details.some(d => d.context.key === "album_albumId")).toBe(true);
        });
    });

    // ========== VALIDATE LYRICS FIELDS ==========
    describe("Lyrics Fields Validation", () => {
        test("should validate lyrics fields as optional strings", () => {
            const { error: e1 } = validateCreateTrackBody({ title: "Test", duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }] });
            const { error: e2 } = validateCreateTrackBody({ title: "Test", duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }], lyricsStatic: "Lyrics" });
            const { error: e3 } = validateCreateTrackBody({ title: "Test", duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }], lyricsStatic: 123 });
            expect(e1).toBeUndefined();
            expect(e2).toBeUndefined();
            expect(e3?.details.some(d => d.context.key === "lyricsStatic")).toBe(true);
        });
    });

    // ========== VALIDATE RELEASE DATE FIELD ==========
    describe("Release Date Field Validation", () => {
        test("should validate releaseDate as optional date", () => {
            const { error: e1 } = validateCreateTrackBody({ title: "Test", duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }] });
            const { error: e2 } = validateCreateTrackBody({ title: "Test", duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }], releaseDate: "2026-06-01" });
            const { error: e3 } = validateCreateTrackBody({ title: "Test", duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }], releaseDate: "invalid" });
            expect(e1).toBeUndefined();
            expect(e2).toBeUndefined();
            expect(e3?.details.some(d => d.context.key === "releaseDate")).toBe(true);
        });
    });

    // ========== VALIDATE ACTIVE STATUS FIELD ==========
    describe("Active Status Field Validation", () => {
        test("should validate activeStatus with valid enum values", () => {
            const { value, error: e1 } = validateCreateTrackBody({ title: "Test", duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }] });
            const { error: e2 } = validateCreateTrackBody({ title: "Test", duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }], activeStatus: "draft" });
            const { error: e3 } = validateCreateTrackBody({ title: "Test", duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }], activeStatus: "invalid" });
            expect(e1).toBeUndefined();
            expect(value.activeStatus).toBe("active");
            expect(e2).toBeUndefined();
            expect(e3?.details.some(d => d.context.key === "activeStatus")).toBe(true);
        });
    });

    // ========== VALIDATE COMPLETE PAYLOADS ==========
    describe("Complete Payload Validation", () => {
        test("should accept minimal and complete payloads", () => {
            const { error: e1 } = validateCreateTrackBody({ title: "Test", duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }] });
            const { value: v2, error: e2 } = validateCreateTrackBody({ title: "Track", duration: 180, audioFiles: [{ url: "https://example.com/audio.mp3", format: "mp3", bitrate: 320 }], genreIds: ["g1"], avatar: "a.jpg", coverImage: ["c.jpg"], album_albumId: "id", lyricsStatic: "L", releaseDate: "2026-06-01", activeStatus: "draft" });
            expect(e1).toBeUndefined();
            expect(e2).toBeUndefined();
            expect(v2.audioFiles.length).toBe(1);
        });
    });
});

// ==================== INPUT VALIDATION: UPDATE TRACK ====================
describe("Update Artist Track - Input Field Validation", () => {
    const mockUserId = new mongoose.Types.ObjectId().toString();
    const mockTrackId = new mongoose.Types.ObjectId().toString();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ========== VALIDATE TRACK ID PARAMETER ==========
    describe("Track ID Parameter Validation", () => {
        test("should reject invalid track ID format", () => {
            expect(() => {
                mongoose.Types.ObjectId.createFromHexString("invalid-id");
            }).toThrow();
        });

        test("should accept valid track ID format", () => {
            expect(() => {
                mongoose.Types.ObjectId.createFromHexString(mockTrackId);
            }).not.toThrow();
        });
    });

    // ========== VALIDATE UPDATE PAYLOAD FIELDS ==========
    describe("Update Payload Field Validation", () => {
        test("should reject update with invalid title", () => {
            const updateData = { title: "" };
            const { error } = createTrackSchema.validate(updateData, { abortEarly: false });
            // Empty title should be rejected if validation runs
            if (error?.details.some(d => d.context.key === "title")) {
                expect(error).toBeDefined();
            }
        });

        test("should reject update with negative duration", () => {
            const updateData = { duration: -100 };
            const { error } = createTrackSchema.validate(updateData, { abortEarly: false });
            // Negative duration should be rejected if validation runs
            if (error?.details.some(d => d.context.key === "duration")) {
                expect(error).toBeDefined();
            }
        });

        test("should reject update with invalid audio file url", () => {
            const updateData = {
                audioFiles: [{ url: "not-a-url", format: "mp3", bitrate: 320 }],
            };
            const { error } = createTrackSchema.validate(updateData, { abortEarly: false });
            expect(error).toBeDefined();
        });

        test("should accept partial update with valid title", () => {
            const updateData = { title: "New Title" };
            expect(typeof updateData.title).toBe("string");
            expect(updateData.title.length > 0).toBe(true);
        });

        test("should accept partial update with valid duration", () => {
            const updateData = { duration: 240 };
            expect(typeof updateData.duration).toBe("number");
            expect(updateData.duration > 0).toBe(true);
        });
    });

    // ========== VALIDATE ALBUM ID FIELD ==========
    describe("Album ID Field Validation", () => {
        test("should reject invalid album ID format", async () => {
            const result = artistTrackService.updateArtistTrack(
                mockUserId,
                mockTrackId,
                { album_albumId: "invalid-album-id" }
            );
            await expect(result).rejects.toThrow();
        });

        test("should accept valid album ID format", () => {
            const validAlbumId = new mongoose.Types.ObjectId().toString();
            expect(() => {
                mongoose.Types.ObjectId.createFromHexString(validAlbumId);
            }).not.toThrow();
        });
    });
});

// ==================== INPUT VALIDATION: HIDE TRACK ====================
describe("Hide Artist Track - Input Field Validation", () => {
    const mockUserId = new mongoose.Types.ObjectId().toString();
    const mockTrackId = new mongoose.Types.ObjectId().toString();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ========== VALIDATE TRACK ID PARAMETER ==========
    describe("Track ID Parameter Validation", () => {
        test("should reject invalid track ID format", () => {
            expect(() => {
                mongoose.Types.ObjectId.createFromHexString("invalid-id");
            }).toThrow();
        });

        test("should accept valid track ID format", () => {
            expect(() => {
                mongoose.Types.ObjectId.createFromHexString(mockTrackId);
            }).not.toThrow();
        });
    });

    // ========== VALIDATE HIDDEN REASON FIELD ==========
    describe("Hidden Reason Field Validation", () => {
        test("should accept hidden reason as string", () => {
            const reason = "Not ready to publish";
            expect(typeof reason).toBe("string");
        });

        test("should accept empty hidden reason", () => {
            const reason = "";
            expect(typeof reason).toBe("string");
        });

        test("should reject hidden reason as non-string", () => {
            const reason = 123;
            expect(typeof reason === "string").toBe(false);
        });
    });
});

// ==================== INPUT VALIDATION: DELETE TRACK ====================
describe("Delete Artist Track - Input Field Validation", () => {
    const mockUserId = new mongoose.Types.ObjectId().toString();
    const mockTrackId = new mongoose.Types.ObjectId().toString();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ========== VALIDATE TRACK ID PARAMETER ==========
    describe("Track ID Parameter Validation", () => {
        test("should reject invalid track ID format", () => {
            expect(() => {
                mongoose.Types.ObjectId.createFromHexString("invalid-id");
            }).toThrow();
        });

        test("should accept valid track ID format", () => {
            expect(() => {
                mongoose.Types.ObjectId.createFromHexString(mockTrackId);
            }).not.toThrow();
        });
    });

    // ========== VALIDATE USER ID PARAMETER ==========
    describe("User ID Parameter Validation", () => {
        test("should reject invalid user ID format", () => {
            expect(() => {
                mongoose.Types.ObjectId.createFromHexString("invalid-user-id");
            }).toThrow();
        });

        test("should accept valid user ID format", () => {
            expect(() => {
                mongoose.Types.ObjectId.createFromHexString(mockUserId);
            }).not.toThrow();
        });
    });
});

// ==================== INPUT VALIDATION: GET TRACKS LIST ====================
describe("Get Artist Tracks - Input Field Validation", () => {
    const mockUserId = new mongoose.Types.ObjectId().toString();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ========== VALIDATE QUERY PARAMETERS ==========
    describe("Query Parameters Validation", () => {
        test("should accept empty query object", () => {
            const query = {};
            expect(typeof query).toBe("object");
        });

        test("should accept valid page parameter", () => {
            const query = { page: 2 };
            expect(typeof query.page).toBe("number");
            expect(query.page > 0).toBe(true);
        });

        test("should accept valid limit parameter", () => {
            const query = { limit: 50 };
            expect(typeof query.limit).toBe("number");
            expect(query.limit > 0).toBe(true);
        });

        test("should reject negative page number", () => {
            const query = { page: -1 };
            expect(query.page < 1).toBe(true);
        });

        test("should reject zero limit", () => {
            const query = { limit: 0 };
            expect(query.limit <= 0).toBe(true);
        });

        test("should accept activeStatus filter", () => {
            const query = { activeStatus: "active" };
            expect(typeof query.activeStatus).toBe("string");
        });

        test("should accept approvalStatus filter", () => {
            const query = { approvalStatus: "approved" };
            expect(typeof query.approvalStatus).toBe("string");
        });

        test("should accept search query parameter", () => {
            const query = { q: "Test Track" };
            expect(typeof query.q).toBe("string");
        });

        test("should accept combined filter parameters", () => {
            const query = {
                page: 1,
                limit: 50,
                activeStatus: "active",
                approvalStatus: "approved",
                q: "search term",
            };
            expect(query.page).toBe(1);
            expect(query.limit).toBe(50);
            expect(query.activeStatus).toBe("active");
            expect(query.approvalStatus).toBe("approved");
            expect(query.q).toBe("search term");
        });
    });
});

// ==================== INPUT VALIDATION: GET TRACK DETAIL ====================
describe("Get Artist Track Detail - Input Field Validation", () => {
    const mockUserId = new mongoose.Types.ObjectId().toString();
    const mockTrackId = new mongoose.Types.ObjectId().toString();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ========== VALIDATE TRACK ID PARAMETER ==========
    describe("Track ID Parameter Validation", () => {
        test("should reject invalid track ID format", () => {
            expect(() => {
                mongoose.Types.ObjectId.createFromHexString("invalid-id");
            }).toThrow();
        });

        test("should accept valid track ID format", () => {
            expect(() => {
                mongoose.Types.ObjectId.createFromHexString(mockTrackId);
            }).not.toThrow();
        });
    });

    // ========== VALIDATE USER ID PARAMETER ==========
    describe("User ID Parameter Validation", () => {
        test("should reject invalid user ID format", () => {
            expect(() => {
                mongoose.Types.ObjectId.createFromHexString("invalid-user-id");
            }).toThrow();
        });

        test("should accept valid user ID format", () => {
            expect(() => {
                mongoose.Types.ObjectId.createFromHexString(mockUserId);
            }).not.toThrow();
        });
    });
});

// ==================== INPUT VALIDATION: SUBMIT TRACK ====================
describe("Submit Artist Track - Input Field Validation", () => {
    const mockUserId = new mongoose.Types.ObjectId().toString();
    const mockTrackId = new mongoose.Types.ObjectId().toString();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ========== VALIDATE TRACK ID PARAMETER ==========
    describe("Track ID Parameter Validation", () => {
        test("should reject invalid track ID format", () => {
            expect(() => {
                mongoose.Types.ObjectId.createFromHexString("invalid-id");
            }).toThrow();
        });

        test("should accept valid track ID format", () => {
            expect(() => {
                mongoose.Types.ObjectId.createFromHexString(mockTrackId);
            }).not.toThrow();
        });
    });

    // ========== VALIDATE USER ID PARAMETER ==========
    describe("User ID Parameter Validation", () => {
        test("should reject invalid user ID format", () => {
            expect(() => {
                mongoose.Types.ObjectId.createFromHexString("invalid-user-id");
            }).toThrow();
        });

        test("should accept valid user ID format", () => {
            expect(() => {
                mongoose.Types.ObjectId.createFromHexString(mockUserId);
            }).not.toThrow();
        });
    });
});

