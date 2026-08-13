import {
    normalizeSearchText,
    scoreSearchMatch,
    tokenizeSearchText,
} from "../../src/services/search/search.service.helper.js";

describe("search ranking helper", () => {
    test("normalizes Vietnamese accents, casing, and whitespace", () => {
        expect(normalizeSearchText("  Chuyện   Nghề ")).toBe("chuyen nghe");
        expect(tokenizeSearchText("  Dạo   Bước ")).toEqual(["dao", "buoc"]);
    });

    test("prioritizes ordered token prefixes", () => {
        expect(scoreSearchMatch("Chuyện Nghề IT 2", "chuyen nghe")).toBe(90);
        expect(scoreSearchMatch("Dạo Bước 123", "dao b")).toBe(90);
        expect(scoreSearchMatch("Nghề Chuyện IT", "chuyen nghe")).toBe(-1);
    });

    test("uses the requested title score bands", () => {
        expect(scoreSearchMatch("Dạo Bước", "dạo bước")).toBe(100);
        expect(scoreSearchMatch("Dạo Bước 123", "dao b")).toBe(90);
        expect(scoreSearchMatch("Ở Lại Cùng Anh", "anh")).toBe(80);
        expect(scoreSearchMatch("Dạo Bước 123", "bước 123")).toBe(80);
    });

    test("does not promote unrelated single-character matches", () => {
        expect(scoreSearchMatch("Bài hát khác", "chuyen n")).toBe(-1);
    });

    test("keeps fuzzy matching below ordered matches", () => {
        expect(scoreSearchMatch("Chuyện Nghề", "chuen nghe")).toBeGreaterThan(0);
        expect(scoreSearchMatch("Chuyện Nghề", "chuen nghe")).toBeLessThan(
            scoreSearchMatch("Chuyện Nghề", "chuyen nghe")
        );
    });
});
