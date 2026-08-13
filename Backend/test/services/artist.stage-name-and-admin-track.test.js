import { jest } from "@jest/globals";
import Artist from "../../src/models/Artist.js";
import ArtistRequest from "../../src/models/ArtistRequest.js";
import {
    normalizeArtistName,
} from "../../src/services/artist/artist.name.normalizer.js";
import { globalErrorHandler } from "../../src/middlewares/error.middleware.js";
import {
    assertTrackNotDeleted,
    getAdminTrackDeletionFilter,
} from "../../src/services/track/admin/admin.track.service.js";

describe("artist stage-name normalization", () => {
    test.each([
        ["Sơn Tùng", "sơn tùng"],
        ["  Sơn   Tùng ", "sơn tùng"],
        ["Ｓơn Tùng", "sơn tùng"],
    ])("normalizes %j to the canonical key", (value, expected) => {
        expect(normalizeArtistName(value)).toBe(expected);
    });

    test("does not strip Vietnamese accents", () => {
        expect(normalizeArtistName("Sơn Tùng")).not.toBe(
            normalizeArtistName("Son Tung")
        );
    });
});

describe("artist stage-name database constraints", () => {
    test("declares partial unique indexes for active artists and pending requests", () => {
        const artistIndex = Artist.schema.indexes().find(
            ([keys, options]) => keys.nameKey === 1 && options.name === "unique_active_artist_name_key"
        );
        const requestIndex = ArtistRequest.schema.indexes().find(
            ([keys, options]) => keys.stageNameKey === 1 && options.name === "unique_pending_artist_request_stage_name_key"
        );

        expect(artistIndex?.[1]).toMatchObject({ unique: true });
        expect(requestIndex?.[1]).toMatchObject({ unique: true });
        expect(artistIndex?.[1].partialFilterExpression.isDeleted.$in).toEqual([false, null]);
        expect(requestIndex?.[1].partialFilterExpression.status).toBe("pending");
    });
});

describe("admin track deletion dimension", () => {
    test("defaults to active tracks and supports deleted/all explicitly", () => {
        expect(getAdminTrackDeletionFilter()).toEqual({ isDeleted: { $ne: true } });
        expect(getAdminTrackDeletionFilter("active")).toEqual({ isDeleted: { $ne: true } });
        expect(getAdminTrackDeletionFilter("deleted")).toEqual({ isDeleted: true });
        expect(getAdminTrackDeletionFilter("all")).toEqual({});
    });

    test("rejects mutation actions for a deleted track with TRACK_DELETED", () => {
        let error;
        try {
            assertTrackNotDeleted({ isDeleted: true });
        } catch (caughtError) {
            error = caughtError;
        }
        expect(error).toMatchObject({
            message: "Không thể thao tác với track của nghệ sĩ đã bị xóa.",
            statusCode: 409,
            details: expect.objectContaining({ code: "TRACK_DELETED" }),
        });
        expect(() => assertTrackNotDeleted({ isDeleted: false })).not.toThrow();
    });
});

describe("duplicate stage-name error mapping", () => {
    test("maps Mongo nameKey duplicate to the required 409 contract", () => {
        const response = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

        globalErrorHandler(
            {
                code: 11000,
                keyPattern: { nameKey: 1 },
                keyValue: { nameKey: "sơn tùng" },
                index: "unique_active_artist_name_key",
            },
            { method: "POST", originalUrl: "/api/artists/register" },
            response,
            jest.fn()
        );

        expect(response.status).toHaveBeenCalledWith(409);
        expect(response.json.mock.calls[0][0]).toMatchObject({
            message: "Nghệ danh này đã được sử dụng. Vui lòng chọn nghệ danh khác.",
            errors: expect.objectContaining({
                code: "ARTIST_STAGE_NAME_EXISTS",
            }),
        });
        warnSpy.mockRestore();
    });
});
