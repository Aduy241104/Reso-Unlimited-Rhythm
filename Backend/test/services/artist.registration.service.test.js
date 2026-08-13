import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockArtistModel = {
    findOne: jest.fn(),
};

const mockArtistRequestModel = {
    findOne: jest.fn(),
    create: jest.fn(),
};

const mockUploadImageBuffer = jest.fn();

const createLeanQuery = (result) => ({
    select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(result),
    }),
});

const validUserId = new mongoose.Types.ObjectId().toString();

const createValidPayload = (overrides = {}) => ({
    stageName: "Sky Light",
    fullName: "Nguyen Van A",
    idNumber: "123456789",
    dateOfBirth: "2000-08-09",
    demoTrackUrls: ["https://example.com/demo-track"],
    musicLinks: ["https://example.com/released-track"],
    acceptedTerms: true,
    copyrightCommitment: true,
    truthfulInformationCommitment: true,
    ...overrides,
});

const createValidFiles = () => ({
    frontImage: [{ buffer: Buffer.from("front") }],
    backImage: [{ buffer: Buffer.from("back") }],
});

const loadArtistRegistrationService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Artist.js", () => ({
        default: mockArtistModel,
    }));
    jest.unstable_mockModule("../../src/models/ArtistRequest.js", () => ({
        default: mockArtistRequestModel,
    }));
    jest.unstable_mockModule("../../src/services/cloudinaryService.js", () => ({
        uploadImageBuffer: mockUploadImageBuffer,
    }));

    const [{ default: artistRegistrationService }, { AppError }] = await Promise.all([
        import("../../src/services/artist/artist.registration.service.js"),
        import("../../src/utils/AppError.js"),
    ]);

    return { artistRegistrationService, AppError };
};

describe("artistRegistrationService validation", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUploadImageBuffer.mockResolvedValue({
            secure_url: "https://cdn.example.com/image.jpg",
        });
        mockArtistRequestModel.create.mockImplementation(async (payload) => ({
            toObject: () => ({
                _id: new mongoose.Types.ObjectId().toString(),
                ...payload,
            }),
        }));
    });

    test("rejects a stage name that already belongs to an artist", async () => {
        mockArtistModel.findOne.mockImplementation((query) => {
            if (query.userId) {
                return createLeanQuery(null);
            }

            if (query.name) {
                return createLeanQuery({
                    _id: new mongoose.Types.ObjectId(),
                    name: "Sky Light",
                });
            }

            return createLeanQuery(null);
        });

        mockArtistRequestModel.findOne.mockImplementation((query) => {
            if (query.userId && query.status === "pending") {
                return createLeanQuery(null);
            }

            if (query.stageName || query["identityInfo.idNumber"]) {
                return createLeanQuery(null);
            }

            return createLeanQuery(null);
        });

        const { artistRegistrationService } = await loadArtistRegistrationService();

        await expect(
            artistRegistrationService.createArtistRegistrationRequestByUserId(
                validUserId,
                createValidPayload(),
                createValidFiles()
            )
        ).rejects.toMatchObject({
            statusCode: 409,
            details: expect.arrayContaining([
                expect.objectContaining({ field: "stageName" }),
            ]),
        });

        expect(mockArtistRequestModel.create).not.toHaveBeenCalled();
    });

    test("rejects an identity number already used in another active request", async () => {
        mockArtistModel.findOne.mockImplementation((query) => {
            if (query.userId) {
                return createLeanQuery(null);
            }

            if (query.name) {
                return createLeanQuery(null);
            }

            return createLeanQuery(null);
        });

        mockArtistRequestModel.findOne.mockImplementation((query) => {
            if (query.userId && query.status === "pending") {
                return createLeanQuery(null);
            }

            if (query["identityInfo.idNumber"]) {
                return createLeanQuery({
                    _id: new mongoose.Types.ObjectId(),
                    identityInfo: {
                        idNumber: "123456789",
                    },
                    status: "approved",
                });
            }

            return createLeanQuery(null);
        });

        const { artistRegistrationService } = await loadArtistRegistrationService();

        await expect(
            artistRegistrationService.createArtistRegistrationRequestByUserId(
                validUserId,
                createValidPayload(),
                createValidFiles()
            )
        ).rejects.toMatchObject({
            statusCode: 409,
            details: expect.arrayContaining([
                expect.objectContaining({ field: "idNumber" }),
            ]),
        });

        expect(mockArtistRequestModel.create).not.toHaveBeenCalled();
    });

    test("rejects an underage applicant", async () => {
        const { artistRegistrationService } = await loadArtistRegistrationService();

        await expect(
            artistRegistrationService.createArtistRegistrationRequestByUserId(
                validUserId,
                createValidPayload({
                    dateOfBirth: "2012-08-09",
                }),
                createValidFiles()
            )
        ).rejects.toMatchObject({
            statusCode: 400,
            details: expect.arrayContaining([
                expect.objectContaining({ field: "dateOfBirth" }),
            ]),
        });

        expect(mockArtistRequestModel.create).not.toHaveBeenCalled();
    });

    test("rejects when both demo and released music links are missing", async () => {
        const { artistRegistrationService } = await loadArtistRegistrationService();

        await expect(
            artistRegistrationService.createArtistRegistrationRequestByUserId(
                validUserId,
                createValidPayload({
                    demoTrackUrls: [],
                    musicLinks: [],
                }),
                createValidFiles()
            )
        ).rejects.toMatchObject({
            statusCode: 400,
            details: expect.arrayContaining([
                expect.objectContaining({ field: "demoTrackUrls" }),
                expect.objectContaining({ field: "musicLinks" }),
            ]),
        });

        expect(mockArtistRequestModel.create).not.toHaveBeenCalled();
    });
});
