import mongoose from "mongoose";
import Podcast from "../../src/models/Podcast.js";

describe("Podcast V1 model defaults", () => {
    test("accepts a creator-only draft and keeps workflow dimensions independent", async () => {
        const podcast = new Podcast({ creator: new mongoose.Types.ObjectId() });

        await expect(podcast.validate()).resolves.toBeUndefined();
        expect(podcast.approvalStatus).toBe("draft");
        expect(podcast.visibility).toBe("hidden");
        expect(podcast.isBlocked).toBe(false);
        expect(podcast.isDeleted).toBe(false);
        expect(podcast.duration).toBe(0);
        expect(podcast.stats.totalListen).toBe(0);
        expect(podcast.copyrightType).toBe("original");
    });
});
