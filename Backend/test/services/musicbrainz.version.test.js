import {
    lookupMusicBrainz,
    resolveMusicBrainzTargetVersions,
} from "../../src/services/external/musicbrainz.service.js";

describe("MusicBrainz target version resolution", () => {
    test("uses live track versions when there is no pending update", () => {
        expect(resolveMusicBrainzTargetVersions({
            submissionVersion: 2,
            audioVersion: 3,
            pendingUpdate: {
                status: "none",
                data: null,
                submissionVersion: 1,
                audioVersion: 1,
            },
        })).toEqual({
            submissionVersion: 2,
            audioVersion: 3,
            copyrightVersion: 1,
            evidenceVersion: 1,
        });
    });

    test("uses pending-update versions only while that update is pending", () => {
        expect(resolveMusicBrainzTargetVersions({
            submissionVersion: 2,
            audioVersion: 3,
            pendingUpdate: {
                status: "pending",
                data: { title: "Pending title" },
                submissionVersion: 4,
                audioVersion: 5,
            },
        })).toEqual({
            submissionVersion: 4,
            audioVersion: 5,
            copyrightVersion: 1,
            evidenceVersion: 1,
        });
    });
});

describe("MusicBrainz lookup fallback", () => {
    test("finds an existing title even when the uploader artist does not match", async () => {
        const requests = [];
        const request = async (path, params) => {
            requests.push({ path, query: params.query });
            if (path === "recording" && params.query === 'recording:"Lạc Trôi"') {
                return {
                    recordings: [{
                        id: "lac-troi-recording-mbid",
                        title: "Lạc Trôi",
                        length: 233_000,
                        "artist-credit": [{ name: "Son Tung M-TP" }],
                        isrcs: [],
                        relations: [],
                    }],
                };
            }
            return path === "recording" ? { recordings: [] } : { works: [] };
        };

        const result = await lookupMusicBrainz({
            primaryCopyrightType: "original",
            title: "Lạc Trôi",
            artist: "Quách Thái",
            composer: "Quách Thái",
            lyricist: "Quách Thái",
            isrc: "",
            iswc: "",
            durationSeconds: 233,
        }, { request });

        expect(requests.filter(({ path }) => path === "recording").map(({ query }) => query)).toEqual([
            'recording:"Lạc Trôi" AND artist:"Quách Thái"',
            'recording:"Lạc Trôi" AND dur:[231000 TO 235000]',
            'recording:"Lạc Trôi"',
        ]);
        expect(result).toMatchObject({
            status: "possible_match",
            recording: {
                mbid: "lac-troi-recording-mbid",
                title: "Lạc Trôi",
                artists: ["Son Tung M-TP"],
            },
            comparison: {
                titleMatch: 1,
                artistMatch: 0,
                durationMatch: 1,
            },
        });
        expect(result.flags).toEqual(expect.arrayContaining([
            "possible_existing_work",
            "external_metadata_conflict",
        ]));
        expect(result).toMatchObject({
            metadataSimilarity: expect.any(Number),
            riskLevel: "medium",
        });
        expect(result.reasonCodes).toEqual(expect.arrayContaining([
            "MUSICBRAINZ_ARTIST_MISMATCH",
            "MUSICBRAINZ_METADATA_CONFLICT",
        ]));
    });

    test("ranks same-title candidates by duration instead of keeping the first recording", async () => {
        const request = async (path, params) => {
            if (path !== "recording") return { works: [] };
            if (!params.query.includes("dur:")) return { recordings: [] };
            return {
                recordings: [
                    {
                        id: "rockapella-recording",
                        title: "Come My Way",
                        length: 190_440,
                        "artist-credit": [{ name: "Rockapella" }],
                    },
                    {
                        id: "son-tung-recording",
                        title: "Come My Way",
                        length: 192_910,
                        "artist-credit": [{ name: "Sơn Tùng M-TP" }, { name: "Tyga" }],
                    },
                ],
            };
        };

        const result = await lookupMusicBrainz({
            primaryCopyrightType: "original",
            title: "Come My Way",
            artist: "123",
            durationSeconds: 192.91,
        }, { request });

        expect(result.recording).toMatchObject({
            mbid: "son-tung-recording",
            artists: ["Sơn Tùng M-TP", "Tyga"],
            durationMs: 192_910,
        });
    });
});
