import { jest } from "@jest/globals";

describe("Cloudinary upload idempotency", () => {
    test("reuses an existing content-addressed asset on retry", async () => {
        const uploadStream = jest.fn();
        const resource = jest.fn().mockResolvedValue({
            secure_url: "https://cloudinary.test/tracks/audio/original/op/hash.mp3",
            public_id: "tracks/audio/original/op/hash",
        });

        jest.unstable_mockModule("../../src/config/cloudinaryConfig.js", () => ({
            default: {
                uploader: { upload_stream: uploadStream },
                api: { resource },
            },
        }));

        const { uploadToCloudinary } = await import("../../src/utils/uploadCloud.js");
        uploadStream.mockImplementationOnce((options, callback) => {
            callback({ http_code: 409, message: "already exists" });
            return { end: jest.fn() };
        });

        const result = await uploadToCloudinary(
            Buffer.from("audio"),
            "tracks/audio/original",
            "video",
            { publicId: "op/hash-original-0" }
        );

        expect(result.idempotentReuse).toBe(true);
        expect(resource).toHaveBeenCalledWith(
            "tracks/audio/original/op/hash-original-0",
            { resource_type: "video" }
        );
    });
});
