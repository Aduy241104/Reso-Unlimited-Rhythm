import { jest } from "@jest/globals";

const mockGenreModel = jest.fn();
mockGenreModel.countDocuments = jest.fn();
mockGenreModel.find = jest.fn();
mockGenreModel.findById = jest.fn();
mockGenreModel.findByIdAndUpdate = jest.fn();

const mockUploadImageBuffer = jest.fn();

const loadService = async () => {
    jest.resetModules();
    jest.unstable_mockModule("../../src/models/Genre.js", () => ({
        default: mockGenreModel,
    }));
    jest.unstable_mockModule("../../src/services/cloudinaryService.js", () => ({
        uploadImageBuffer: mockUploadImageBuffer,
    }));

    return (await import("../../src/services/genre/admin.genre.service.js")).default;
};

const queryWith = (value) => {
    const query = {};
    query.select = jest.fn().mockReturnValue(query);
    query.skip = jest.fn().mockReturnValue(query);
    query.limit = jest.fn().mockReturnValue(query);
    query.sort = jest.fn().mockReturnValue(query);
    query.lean = jest.fn().mockResolvedValue(value);
    query.then = (resolve, reject) => Promise.resolve(value).then(resolve, reject);
    return query;
};

const genre = (id, name = "Jazz") => ({
    _id: id,
    name,
    description: `${name} description`,
    image: `${name.toLowerCase()}.jpg`,
    isActive: true,
});

beforeEach(() => {
    jest.clearAllMocks();
    mockGenreModel.mockImplementation((data) => ({
        ...data,
        save: jest.fn().mockResolvedValue({ _id: "genre-created", ...data }),
    }));
});

describe("adminGenreService.getGenres", () => {
    test.each([
        ["TC01", { q: "dance", page: undefined, limit: 20 }, 1, 20, [genre("g1", "Dance")]],
        ["TC02", { q: "rock", page: 2, limit: 10, isActive: false }, 2, 10, [genre("g2", "Rock")]],
        ["TC03", { q: "", page: 1, limit: 20 }, 1, 20, []],
        ["TC04", { q: "", page: 0, limit: 0 }, 1, 20, []],
    ])(
        "UT-101 - %s - get genre list returns the genre collection",
        async (_caseId, input, expectedPage, expectedLimit, genres) => {
            const service = await loadService();
            const findQuery = queryWith(genres);
            mockGenreModel.countDocuments.mockResolvedValue(genres.length);
            mockGenreModel.find.mockReturnValue(findQuery);

            const result = await service.getGenres(input);

            expect(result.genres).toEqual(genres);
            expect(result.meta).toEqual({
                page: expectedPage,
                limit: expectedLimit,
                total: genres.length,
                totalPages: Math.ceil(genres.length / expectedLimit),
            });
            expect(mockGenreModel.find).toHaveBeenCalledTimes(1);
            const filter = mockGenreModel.find.mock.calls[0][0];
            expect(findQuery.skip).toHaveBeenCalledWith((expectedPage - 1) * expectedLimit);
            expect(findQuery.limit).toHaveBeenCalledWith(expectedLimit);
            if (input.q?.trim()) {
                expect(filter.$or).toEqual([
                    { name: new RegExp(input.q.trim(), "i") },
                    { description: new RegExp(input.q.trim(), "i") },
                ]);
            }
            if (typeof input.isActive !== "undefined") {
                expect(filter.isActive).toBe(input.isActive);
            }
            expect(findQuery.select).toHaveBeenCalledWith(
                "_id name description image isActive createdAt"
            );
        }
    );
});

describe("adminGenreService.createGenre", () => {
    test.each([
        ["TC01", { name: " Jazz ", description: " description ", image: " jazz.jpg " }, true],
        ["TC02", { name: "Classical", description: "description provided", image: "image.jpg", isActive: false }, false],
        ["TC03", { name: "Hip Hop" }, true],
    ])(
        "UT-102 - %s - creates the genre with the Excel input data",
        async (_caseId, input, expectedIsActive) => {
            const service = await loadService();

            const result = await service.createGenre(input);

            expect(mockGenreModel).toHaveBeenCalledWith({
                name: input.name.trim(),
                description: input.description?.trim() || "",
                image: input.image?.trim() || "",
                isActive: expectedIsActive,
            });
            expect(result).toMatchObject({
                _id: "genre-created",
                name: input.name.trim(),
                description: input.description?.trim() || "",
                image: input.image?.trim() || "",
                isActive: expectedIsActive,
            });
        }
    );
});

describe("adminGenreService.getGenreById", () => {
    test("UT-103 - TC01 - returns the existing genre detail", async () => {
        const service = await loadService();
        const expected = genre("genre-1");
        mockGenreModel.findById.mockReturnValue(queryWith(expected));

        await expect(service.getGenreById("genre-1")).resolves.toEqual(expected);
        expect(mockGenreModel.findById).toHaveBeenCalledWith("genre-1");
    });
});

describe("adminGenreService.updateGenre", () => {
    test.each([
        ["TC01", { name: " Jazz ", description: " description ", image: " jazz.jpg " }],
        ["TC02", { isActive: false }],
    ])(
        "UT-104 - %s - returns the updated genre",
        async (_caseId, input) => {
            const service = await loadService();
            const expected = genre("genre-1");
            const updateQuery = queryWith(expected);
            mockGenreModel.findByIdAndUpdate.mockReturnValue(updateQuery);

            await expect(service.updateGenre("genre-1", input)).resolves.toEqual(expected);
            expect(mockGenreModel.findByIdAndUpdate).toHaveBeenCalledWith(
                "genre-1",
                Object.fromEntries(
                    Object.entries(input).map(([key, value]) => [
                        key,
                        typeof value === "string" ? value.trim() : value,
                    ])
                ),
                { new: true }
            );
        }
    );
});

describe("adminGenreService.uploadGenreImage", () => {
    test("UT-105 - TC01 - returns the Cloudinary secure URL", async () => {
        const service = await loadService();
        const buffer = Buffer.from("valid image buffer");
        mockUploadImageBuffer.mockResolvedValue({ secure_url: "https://cloudinary/genre.jpg" });

        await expect(service.uploadGenreImage(buffer)).resolves.toBe(
            "https://cloudinary/genre.jpg"
        );
        expect(mockUploadImageBuffer).toHaveBeenCalledWith({
            buffer,
            folder: "reso/genres",
        });
    });
});
