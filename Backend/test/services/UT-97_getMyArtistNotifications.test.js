import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockNotificationFind = jest.fn();
const mockNotificationCount = jest.fn();
let listQuery;

const createListQuery = (result) => {
    const query = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(result),
    };
    listQuery = query;
    return query;
};

jest.unstable_mockModule("../../src/models/Notification.js", () => ({
    default: { find: mockNotificationFind, countDocuments: mockNotificationCount },
}));

const notificationService = (
    await import("../../src/services/notification/artist.notification.service.js")
).default;

const userId = new mongoose.Types.ObjectId();

describe("UT-97 getMyArtistNotifications", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockNotificationFind.mockImplementation(() => createListQuery([]));
        mockNotificationCount
            .mockResolvedValueOnce(0)
            .mockResolvedValueOnce(0);
    });

    test("UTCID01 - returns notifications with pagination and unread count", async () => {
        const notification = {
            _id: new mongoose.Types.ObjectId(),
            receiverType: "single",
            userId,
            title: "New release",
            isRead: false,
            __v: 0,
            readBy: [],
            deletedBy: [],
            targetRoles: [],
        };
        mockNotificationFind.mockImplementation(() => createListQuery([notification]));
        mockNotificationCount.mockReset();
        mockNotificationCount
            .mockResolvedValueOnce(15)
            .mockResolvedValueOnce(5);

        const result = await notificationService.getMyArtistNotifications(
            userId,
            "artist",
            { page: 1, limit: 10 }
        );

        expect(result.notifications).toHaveLength(1);
        expect(result.notifications[0].isRead).toBe(false);
        expect(result.notifications[0]).not.toHaveProperty("readBy");
        expect(result.notifications[0]).not.toHaveProperty("__v");
        expect(result.meta).toEqual({
            page: 1,
            limit: 10,
            total: 15,
            totalPages: 2,
            unreadCount: 5,
        });
    });

    test("UTCID02 - returns an empty notification list", async () => {
        const result = await notificationService.getMyArtistNotifications(
            userId,
            "artist",
            { page: 1, limit: 10 }
        );

        expect(result.notifications).toEqual([]);
        expect(result.meta.totalPages).toBe(0);
        expect(result.meta.unreadCount).toBe(0);
    });

    test("UTCID03 - propagates database errors", async () => {
        mockNotificationFind.mockImplementation(() => ({
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            lean: jest.fn().mockRejectedValue(new Error("Database connection failed")),
        }));

        await expect(
            notificationService.getMyArtistNotifications(userId, "artist", {})
        ).rejects.toThrow("Database connection failed");
    });

    test("UTCID04 - caps requested limit at 50", async () => {
        const result = await notificationService.getMyArtistNotifications(
            userId,
            "artist",
            { page: 1, limit: 100 }
        );

        expect(result.meta.limit).toBe(50);
        expect(listQuery.limit).toHaveBeenCalledWith(50);
    });
});
