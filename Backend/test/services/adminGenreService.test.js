import { jest } from "@jest/globals";

const mockUploadImageBuffer = jest.fn();

const mockGenreConstructor = jest.fn(function (genreData) {
    Object.assign(this, genreData);
    this.save = jest.fn().mockResolvedValue({ _id: "genre-1", ...genreData });
});

mockGenreConstructor.countDocuments = jest.fn();
mockGenreConstructor.find = jest.fn();
mockGenreConstructor.findById = jest.fn();
mockGenreConstructor.findByIdAndUpdate = jest.fn();

const loadAdminGenreService = async () => {
    jest.resetModules();
    jest.clearAllMocks();

    jest.unstable_mockModule("../../src/models/Genre.js", () => ({
        default: mockGenreConstructor,
    }));

    jest.unstable_mockModule("../../src/services/cloudinaryService.js", () => ({
        uploadImageBuffer: mockUploadImageBuffer,
    }));

    const { default: adminGenreService } = await import("../../src/services/genre/admin.genre.service.js");
    return { adminGenreService };
};

describe("adminGenreService", () => {
    let adminGenreService;

    beforeEach(async () => {
        ({ adminGenreService } = await loadAdminGenreService());
    });

    describe("getGenres", () => {
        test("returns paginated genres with meta info", async () => {
            const mockGenres = [
                {
                    _id: "genre-1",
                    name: "Pop",
                    description: "Popular music",
                    image: "https://example.com/pop.jpg",
                    isActive: true,
                    createdAt: new Date("2026-05-01T00:00:00.000Z"),
                },
            ];

            mockGenreConstructor.countDocuments.mockResolvedValue(1);
            mockGenreConstructor.find.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockGenres),
            });

            const result = await adminGenreService.getGenres({ page: "1", limit: "10" });

            expect(mockGenreConstructor.countDocuments).toHaveBeenCalledWith({});
            expect(mockGenreConstructor.find).toHaveBeenCalledWith({});
            expect(result).toEqual({
                genres: mockGenres,
                meta: {
                    page: 1,
                    limit: 10,
                    total: 1,
                    totalPages: 1,
                },
            });
        });

        test("filters by search query and active status", async () => {
            const mockGenres = [
                {
                    _id: "genre-2",
                    name: "Rock",
                    description: "Rock music",
                    image: "https://example.com/rock.jpg",
                    isActive: false,
                    createdAt: new Date("2026-05-02T00:00:00.000Z"),
                },
            ];

            mockGenreConstructor.countDocuments.mockResolvedValue(1);
            const findChain = {
                select: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockGenres),
            };

            mockGenreConstructor.find.mockReturnValue(findChain);

            const result = await adminGenreService.getGenres({ q: "rock", isActive: "false", page: "2", limit: "5" });

            expect(mockGenreConstructor.countDocuments).toHaveBeenCalledWith({
                $or: [{ name: expect.any(RegExp) }, { description: expect.any(RegExp) }],
                isActive: false,
            });
            expect(mockGenreConstructor.find).toHaveBeenCalledWith({
                $or: [{ name: expect.any(RegExp) }, { description: expect.any(RegExp) }],
                isActive: false,
            });
            expect(result.meta.page).toBe(2);
            expect(result.meta.limit).toBe(5);
            expect(result.meta.total).toBe(1);
        });

        test("defaults invalid pagination values to minimum page and limit", async () => {
            const mockGenres = [];
            mockGenreConstructor.countDocuments.mockResolvedValue(0);
            mockGenreConstructor.find.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockGenres),
            });

            const result = await adminGenreService.getGenres({ page: "0", limit: "0" });

            expect(mockGenreConstructor.countDocuments).toHaveBeenCalledWith({});
            expect(mockGenreConstructor.find).toHaveBeenCalledWith({});
            expect(result.meta.page).toBe(1);
            expect(result.meta.limit).toBe(20);
        });

        test("builds filter only from search query when active status is omitted", async () => {
            const mockGenres = [];
            mockGenreConstructor.countDocuments.mockResolvedValue(0);
            mockGenreConstructor.find.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockGenres),
            });

            await adminGenreService.getGenres({ q: "dance" });

            expect(mockGenreConstructor.countDocuments).toHaveBeenCalledWith({
                $or: [{ name: expect.any(RegExp) }, { description: expect.any(RegExp) }],
            });
            expect(mockGenreConstructor.find).toHaveBeenCalledWith({
                $or: [{ name: expect.any(RegExp) }, { description: expect.any(RegExp) }],
            });
        });
    });

    describe("createGenre", () => {
        test("creates a genre with trimmed data and default isActive true", async () => {
            const payload = {
                name: "  Jazz  ",
                description: "  Smooth jazz music  ",
                image: "  https://example.com/jazz.jpg  ",
            };

            const result = await adminGenreService.createGenre(payload);

            expect(mockGenreConstructor).toHaveBeenCalledWith({
                name: "Jazz",
                description: "Smooth jazz music",
                image: "https://example.com/jazz.jpg",
                isActive: true,
            });
            expect(result).toEqual({
                _id: "genre-1",
                name: "Jazz",
                description: "Smooth jazz music",
                image: "https://example.com/jazz.jpg",
                isActive: true,
            });
        });

        test("preserves explicit isActive value", async () => {
            const payload = {
                name: "Classical",
                description: "Orchestral music",
                image: "https://example.com/classical.jpg",
                isActive: false,
            };

            const result = await adminGenreService.createGenre(payload);

            expect(mockGenreConstructor).toHaveBeenCalledWith({
                name: "Classical",
                description: "Orchestral music",
                image: "https://example.com/classical.jpg",
                isActive: false,
            });
            expect(result.isActive).toBe(false);
        });

        test("defaults missing description and image to empty strings", async () => {
            const payload = {
                name: "Hip Hop",
            };

            const result = await adminGenreService.createGenre(payload);

            expect(mockGenreConstructor).toHaveBeenCalledWith({
                name: "Hip Hop",
                description: "",
                image: "",
                isActive: true,
            });
            expect(result.description).toBe("");
            expect(result.image).toBe("");
        });
    });

    describe("getGenreById", () => {
        test("returns genre details by id", async () => {
            const genre = {
                _id: "genre-3",
                name: "EDM",
                description: "Electronic dance music",
                image: "https://example.com/edm.jpg",
                isActive: true,
            };

            mockGenreConstructor.findById.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(genre),
            });

            const result = await adminGenreService.getGenreById("genre-3");

            expect(mockGenreConstructor.findById).toHaveBeenCalledWith("genre-3");
            expect(result).toEqual(genre);
        });
    });

    describe("updateGenre", () => {
        test("updates only provided fields and trims string values", async () => {
            const updatedGenre = {
                _id: "genre-4",
                name: "Indie",
                description: "Independent music",
                image: "https://example.com/indie.jpg",
                isActive: true,
            };

            mockGenreConstructor.findByIdAndUpdate.mockReturnValue({
                select: jest.fn().mockResolvedValue(updatedGenre),
            });

            const result = await adminGenreService.updateGenre("genre-4", {
                name: "  Indie  ",
                description: "  Independent music  ",
            });

            expect(mockGenreConstructor.findByIdAndUpdate).toHaveBeenCalledWith(
                "genre-4",
                {
                    name: "Indie",
                    description: "Independent music",
                },
                { new: true }
            );
            expect(result).toEqual(updatedGenre);
        });

        test("updates image and isActive when provided", async () => {
            const updatedGenre = {
                _id: "genre-5",
                name: "Soul",
                description: "Soul music",
                image: "https://example.com/soul.jpg",
                isActive: false,
            };

            mockGenreConstructor.findByIdAndUpdate.mockReturnValue({
                select: jest.fn().mockResolvedValue(updatedGenre),
            });

            const result = await adminGenreService.updateGenre("genre-5", {
                image: "  https://example.com/soul.jpg  ",
                isActive: false,
            });

            expect(mockGenreConstructor.findByIdAndUpdate).toHaveBeenCalledWith(
                "genre-5",
                {
                    image: "https://example.com/soul.jpg",
                    isActive: false,
                },
                { new: true }
            );
            expect(result).toEqual(updatedGenre);
        });
    });

    describe("uploadGenreImage", () => {
        test("uploads buffer and returns secure url", async () => {
            mockUploadImageBuffer.mockResolvedValue({ secure_url: "https://example.com/genre-image.jpg" });

            const result = await adminGenreService.uploadGenreImage(Buffer.from("image data"));

            expect(mockUploadImageBuffer).toHaveBeenCalledWith({
                buffer: expect.any(Buffer),
                folder: "reso/genres",
            });
            expect(result).toBe("https://example.com/genre-image.jpg");
        });
    });
});
