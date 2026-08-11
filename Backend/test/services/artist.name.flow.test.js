import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockArtistModel = {
    findOne: jest.fn(),
    find: jest.fn(),
};
const mockArtistRequestModel = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
};

const queryResult = (value) => ({
    select: () => ({
        lean: async () => value,
    }),
});

const loadNameService = async () => {
    jest.resetModules();
    jest.unstable_mockModule("../../src/models/Artist.js", () => ({
        default: mockArtistModel,
    }));
    jest.unstable_mockModule("../../src/models/ArtistRequest.js", () => ({
        default: mockArtistRequestModel,
    }));
    return import("../../src/services/artist/artist.name.service.js");
};

const resetNameQueries = () => {
    mockArtistModel.findOne.mockReturnValue(queryResult(null));
    mockArtistModel.find.mockReturnValue(queryResult([]));
    mockArtistRequestModel.findOne.mockReturnValue(queryResult(null));
    mockArtistRequestModel.find.mockReturnValue(queryResult([]));
};

describe("artist stage-name availability checks", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        resetNameQueries();
    });

    test("rejects a pending request when an active Artist already owns the normalized key", async () => {
        mockArtistModel.findOne.mockReturnValue(
            queryResult({ _id: "artist-1", name: "Sơn Tùng", nameKey: "sơn tùng" })
        );
        const { assertArtistStageNameAvailable } = await loadNameService();

        await expect(assertArtistStageNameAvailable("sơn tùng")).rejects.toMatchObject({
            statusCode: 409,
            message: "Nghệ danh này đã được sử dụng. Vui lòng chọn nghệ danh khác.",
            details: expect.objectContaining({ code: "ARTIST_STAGE_NAME_EXISTS" }),
        });
    });

    test("rejects whitespace/case variants against a pending request", async () => {
        mockArtistRequestModel.findOne.mockReturnValue(
            queryResult({ _id: "request-1", stageName: "Sơn Tùng", stageNameKey: "sơn tùng" })
        );
        const { assertArtistStageNameAvailable } = await loadNameService();

        await expect(assertArtistStageNameAvailable("  SƠN   TÙNG  ")).rejects.toMatchObject({
            statusCode: 409,
            details: expect.objectContaining({ code: "ARTIST_STAGE_NAME_EXISTS" }),
        });
    });

    test("allows the accentless spelling to coexist", async () => {
        const { assertArtistStageNameAvailable } = await loadNameService();

        await expect(assertArtistStageNameAvailable("Son Tung")).resolves.toBe("son tung");
    });

    test("excludes the current artist during a rename check", async () => {
        const { assertArtistStageNameAvailable } = await loadNameService();
        const artistId = new mongoose.Types.ObjectId();

        await assertArtistStageNameAvailable("Nghệ danh mới", {
            excludeArtistId: artistId,
        });

        expect(mockArtistModel.findOne).toHaveBeenCalledWith(
            expect.objectContaining({
                _id: { $ne: artistId },
                nameKey: "nghệ danh mới",
                isDeleted: { $ne: true },
            })
        );
    });
});

describe("artist registration request key", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        resetNameQueries();
        mockArtistRequestModel.create.mockResolvedValue({
            toObject: () => ({ id: "request-1" }),
        });
    });

    test("writes stageNameKey before creating the pending request", async () => {
        jest.resetModules();
        jest.unstable_mockModule("../../src/models/Artist.js", () => ({
            default: mockArtistModel,
        }));
        jest.unstable_mockModule("../../src/models/ArtistRequest.js", () => ({
            default: mockArtistRequestModel,
        }));
        jest.unstable_mockModule("../../src/services/cloudinaryService.js", () => ({
            uploadImageBuffer: jest.fn(),
        }));

        const { default: service } = await import(
            "../../src/services/artist/artist.registration.service.js"
        );
        const userId = new mongoose.Types.ObjectId().toString();

        await service.createArtistRegistrationRequestByUserId(
            userId,
            {
                stageName: "  Sơn   Tùng ",
                fullName: "Nguyễn Văn A",
                idNumber: "123456789",
                dateOfBirth: "2000-01-01",
                acceptedTerms: true,
                copyrightCommitment: true,
                truthfulInformationCommitment: true,
            },
            {}
        );

        expect(mockArtistRequestModel.create).toHaveBeenCalledWith(
            expect.objectContaining({
                stageName: "Sơn   Tùng",
                stageNameKey: "sơn tùng",
                status: "pending",
            })
        );
    });
});
