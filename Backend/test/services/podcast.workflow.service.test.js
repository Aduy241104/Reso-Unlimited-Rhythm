import mongoose from "mongoose";
import { jest } from "@jest/globals";

const userId = new mongoose.Types.ObjectId();
const artistId = new mongoose.Types.ObjectId();
const adminId = new mongoose.Types.ObjectId();
const podcastId = new mongoose.Types.ObjectId();

const mockArtist = { findOne: jest.fn(), find: jest.fn() };
const mockPodcast = {
    create: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findOneAndUpdate: jest.fn(),
};
const mockPodcastReview = {
    findOne: jest.fn(),
    create: jest.fn(),
};

const artist = { _id: artistId, name: "Artist A", avatar: "" };
const basePodcast = (overrides = {}) => ({
    _id: podcastId,
    creator: artistId,
    title: "Podcast demo",
    description: "A complete description",
    audioUrl: "https://cdn.example.com/audio.mp3",
    coverImageUrl: "",
    duration: 120,
    approvalStatus: "draft",
    visibility: "hidden",
    isBlocked: false,
    isDeleted: false,
    copyrightType: "original",
    copyrightSource: "",
    copyrightProofUrl: "",
    copyrightConfirmed: true,
    stats: { totalListen: 0 },
    toObject() { return { ...this }; },
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
});

const queryWith = (value) => {
    const query = {
        select: jest.fn(),
        populate: jest.fn(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(value),
    };
    query.select.mockReturnValue(query);
    query.populate.mockReturnValue(query);
    query.then = (resolve, reject) => Promise.resolve(value).then(resolve, reject);
    return query;
};

jest.unstable_mockModule("../../src/models/Artist.js", () => ({ default: mockArtist }));
jest.unstable_mockModule("../../src/models/Podcast.js", () => ({ default: mockPodcast }));
jest.unstable_mockModule("../../src/models/PodcastModerationReview.js", () => ({ default: mockPodcastReview }));

const artistService = (await import("../../src/services/podcast/podcast.service.js")).default;
const adminService = (await import("../../src/services/podcast/podcast.admin.service.js")).default;
const publicService = await import("../../src/services/podcast/podcast.public.service.js");
const listenModule = await import("../../src/services/podcast/podcast.listen.service.js");

describe("Podcast V1 workflow authorization and moderation", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockArtist.findOne.mockReturnValue(queryWith(artist));
        mockArtist.find.mockReturnValue(queryWith([]));
        mockPodcast.countDocuments.mockResolvedValue(0);
        mockPodcastReview.findOne.mockReset();
        mockPodcastReview.create.mockReset();
    });

    test("creates a draft with creator resolved from authenticated Artist", async () => {
        const created = basePodcast();
        mockPodcast.create.mockResolvedValue(created);
        mockPodcast.findById.mockReturnValue(queryWith({ ...created, creator: artist }));

        const result = await artistService.createArtistPodcast(userId, { title: "Draft" });

        expect(mockPodcast.create).toHaveBeenCalledWith(expect.objectContaining({ creator: artistId, title: "Draft" }));
        expect(result.approvalStatus).toBe("draft");
        expect(result.visibility).toBe("hidden");
    });

    test("does not allow an owner to access another Artist's Podcast", async () => {
        mockPodcast.findOne.mockReturnValue(queryWith(null));
        await expect(artistService.updateArtistPodcast(userId, podcastId, { title: "Nope" }))
            .rejects.toMatchObject({ statusCode: 404, details: { code: "PODCAST_NOT_FOUND" } });
        expect(mockPodcast.findOne.mock.calls[0][0]).toMatchObject({ creator: artistId });
    });

    test("locks pending edits but allows rejected edits", async () => {
        const pending = basePodcast({ approvalStatus: "pending" });
        mockPodcast.findOne.mockReturnValue(queryWith(pending));
        await expect(artistService.updateArtistPodcast(userId, podcastId, { title: "Locked" }))
            .rejects.toMatchObject({ details: { code: "PODCAST_PENDING_LOCKED" } });
        expect(pending.save).not.toHaveBeenCalled();

        const rejected = basePodcast({ approvalStatus: "rejected", rejectReason: "Fix metadata" });
        mockPodcast.findOne.mockReturnValue(queryWith(rejected));
        mockPodcast.findById.mockReturnValue(queryWith({ ...rejected, creator: artist }));
        await artistService.updateArtistPodcast(userId, podcastId, { title: "Fixed title" });
        expect(rejected.title).toBe("Fixed title");
        expect(rejected.save).toHaveBeenCalled();
    });

    test("soft deletes without removing the document", async () => {
        const podcast = basePodcast({ approvalStatus: "pending" });
        mockPodcast.findOne.mockReturnValue(queryWith(podcast));
        const result = await artistService.deleteArtistPodcast(userId, podcastId);
        expect(podcast.isDeleted).toBe(true);
        expect(podcast.visibility).toBe("hidden");
        expect(podcast.save).toHaveBeenCalled();
        expect(result.isDeleted).toBe(true);
    });

    test("approves only a valid pending Podcast and records reviewer", async () => {
        const podcast = basePodcast({ approvalStatus: "pending" });
        const review = {
            _id: new mongoose.Types.ObjectId(),
            podcastId,
            adminId,
            status: "active",
            snapshot: {
                title: podcast.title,
                description: podcast.description,
                audioUrl: podcast.audioUrl,
                coverImageUrl: podcast.coverImageUrl,
                duration: podcast.duration,
                copyrightType: podcast.copyrightType,
                copyrightSource: podcast.copyrightSource,
                copyrightProofUrl: podcast.copyrightProofUrl,
                copyrightConfirmed: podcast.copyrightConfirmed,
            },
            events: [
                { type: "OPEN_PODCAST_DETAIL" },
                { type: "OPEN_METADATA" },
                { type: "OPEN_COPYRIGHT_SECTION" },
                { type: "OPEN_AUDIO" },
                { type: "AUDIO_PLAY_STARTED" },
                { type: "FINAL_CONFIRMATION" },
            ],
            audioListenedSeconds: 15,
            finalConfirmedAt: new Date(),
            save: jest.fn().mockResolvedValue(undefined),
        };
        mockPodcastReview.findOne.mockReturnValue(queryWith(review));
        mockPodcast.findById.mockReturnValue(queryWith(podcast));
        mockPodcast.findById.mockReturnValueOnce(queryWith(podcast)).mockReturnValueOnce(queryWith(podcast));
        const result = await adminService.approvePodcast(podcastId, adminId, review._id);
        expect(podcast.approvalStatus).toBe("approved");
        expect(podcast.reviewedBy).toBe(adminId);
        expect(podcast.reviewedAt).toBeInstanceOf(Date);
        expect(result.approvalStatus).toBe("approved");
    });

    test("reject requires a reason and does not block", async () => {
        const podcast = basePodcast({ approvalStatus: "pending" });
        mockPodcast.findById.mockReturnValue(queryWith(podcast));
        await expect(adminService.rejectPodcast(podcastId, adminId, ""))
            .rejects.toMatchObject({ details: { code: "PODCAST_REJECT_REASON_REQUIRED" } });
        expect(podcast.save).not.toHaveBeenCalled();

        mockPodcast.findById.mockReturnValueOnce(queryWith(podcast)).mockReturnValueOnce(queryWith(podcast));
        await adminService.rejectPodcast(podcastId, adminId, "Thiếu mô tả");
        expect(podcast.approvalStatus).toBe("rejected");
        expect(podcast.rejectReason).toBe("Thiếu mô tả");
        expect(podcast.isBlocked).toBe(false);
    });

    test("block and unblock preserve approvalStatus", async () => {
        const podcast = basePodcast({ approvalStatus: "approved", visibility: "public" });
        mockPodcast.findById.mockReturnValueOnce(queryWith(podcast)).mockReturnValueOnce(queryWith(podcast));
        await adminService.blockPodcast(podcastId, adminId, "Copyright complaint");
        expect(podcast.approvalStatus).toBe("approved");
        expect(podcast.isBlocked).toBe(true);
        expect(podcast.visibility).toBe("hidden");

        mockPodcast.findById.mockReturnValueOnce(queryWith(podcast)).mockReturnValueOnce(queryWith(podcast));
        await adminService.unblockPodcast(podcastId);
        expect(podcast.approvalStatus).toBe("approved");
        expect(podcast.isBlocked).toBe(false);
    });

    test("public filter keeps approval, visibility, block, delete and release dimensions independent", () => {
        const filter = publicService.publicFilter();
        expect(filter).toMatchObject({ approvalStatus: "approved", visibility: "public", isBlocked: false, isDeleted: { $ne: true } });
    });

    test("does not count detail reads or playback below threshold, and de-duplicates completed listens", async () => {
        const publicPodcast = basePodcast({ approvalStatus: "approved", visibility: "public", duration: 100, stats: { totalListen: 0 } });
        mockPodcast.findOne.mockReturnValue(queryWith(publicPodcast));
        await publicService.getPublicPodcast(podcastId);
        expect(mockPodcast.findOneAndUpdate).not.toHaveBeenCalled();

        listenModule.recentListenKeys.clear();
        await expect(listenModule.recordPodcastListen({ podcastId, userId, listenedDuration: 20 }))
            .resolves.toMatchObject({ counted: false, threshold: 25 });
        expect(mockPodcast.findOneAndUpdate).not.toHaveBeenCalled();

        mockPodcast.findOne.mockReturnValue(queryWith(publicPodcast));
        mockPodcast.findOneAndUpdate.mockReturnValue(queryWith({ stats: { totalListen: 1 } }));
        await expect(listenModule.recordPodcastListen({ podcastId, userId, listenedDuration: 25 }))
            .resolves.toMatchObject({ counted: true, totalListen: 1 });
        expect(mockPodcast.findOneAndUpdate).toHaveBeenCalledTimes(1);

        mockPodcast.findOne.mockReturnValue(queryWith(publicPodcast));
        await expect(listenModule.recordPodcastListen({ podcastId, userId, listenedDuration: 30 }))
            .resolves.toMatchObject({ counted: false, duplicate: true });
        expect(mockPodcast.findOneAndUpdate).toHaveBeenCalledTimes(1);
    });
});
