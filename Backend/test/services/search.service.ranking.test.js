import { rankItems } from "../../src/services/search/search.service.js";

const collections = {
    songs: [
        { title: "Anh Nhà Ở Đâu Thế", artist_artistId: { name: "aaa" } },
        { title: "Em muốn anh sống sao", artist_artistId: { name: "aaa" } },
        { title: "Màu Của Nỗi Nhớ", artist_artistId: { name: "An Nhiên" } },
        { title: "Dạo Bước 123", artist_artistId: { name: "Demo Artist" } },
    ],
    podcasts: [{ title: "Chuyện Nghề IT 2", creator: { name: "123" } }],
    albums: [],
    playlists: [],
    artists: [
        { name: "An Nhiên" },
        { name: "Demo Artist" },
        { name: "Demo Artist Three" },
        { name: "Demo Artist Two" },
    ],
};

describe("search service ranking", () => {
    test("keeps title-prefix songs ahead of later title and artist matches", () => {
        const results = rankItems(collections.songs, "a", "song");

        expect(results[0].item.title).toBe("Anh Nhà Ở Đâu Thế");
        expect(results.findIndex(({ item }) => item.title === "Em muốn anh sống sao"))
            .toBeGreaterThan(0);
        expect(results[0].score).toBeGreaterThan(
            results.find(({ item }) => item.title === "Em muốn anh sống sao").score
        );
    });

    test("keeps ordered multi-token title matching and includes Podcast normally", () => {
        const podcastResults = rankItems(collections.podcasts, "chuyen ng", "podcast");
        const wrongOrderResults = rankItems(
            [{ title: "Người Kể Chuyện", creator: { name: "Demo Artist" } }],
            "chuyen ng",
            "podcast"
        );

        expect(podcastResults[0].item.title).toBe("Chuyện Nghề IT 2");
        expect(wrongOrderResults).toHaveLength(0);
    });

    test("uses each entity's own title or name for primary matching", () => {
        expect(
            rankItems(
                [{ title: "Đừng Tắt Ánh Đèn" }, { title: "Ánh Sáng Của Đời Tôi" }],
                "a",
                "podcast"
            ).map(({ item }) => item.title)
        ).toEqual(["Ánh Sáng Của Đời Tôi", "Đừng Tắt Ánh Đèn"]);

        expect(rankItems([{ title: "Mini Revenue Track A" }], "a", "album")[0].score)
            .toBeLessThan(90);
        expect(rankItems([{ title: "Demo Artist" }], "a", "artist")).toHaveLength(0);
    });
});
