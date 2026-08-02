import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockNotificationFindOne = jest.fn();
const mockNotificationUpdateOne = jest.fn();

const query = (result) => ({ lean: jest.fn().mockResolvedValue(result) });

jest.unstable_mockModule("../../src/models/Notification.js", () => ({
    default: {
        findOne: mockNotificationFindOne,
        updateOne: mockNotificationUpdateOne,
    },
}));

const notificationService = (
    await import("../../src/services/notification/artist.notification.service.js")
).default;

const userId = new mongoose.Types.ObjectId();
const notificationId = new mongoose.Types.ObjectId();

describe("UT-98 getMyArtistNotificationDetail", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockNotificationUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    });

    test("UTCID01 - marks a single notification as read", async () => {
        mockNotificationFindOne.mockReturnValue(query({
            _id: notificationId,
            receiverType: "single",
            userId,
            title: "Notification",
            isRead: false,
            readBy: [],
        }));

        const result = await notificationService.getMyArtistNotificationDetail(
            userId,
            "artist",
            notificationId
        );

        expect(result.isRead).toBe(true);
        expect(mockNotificationUpdateOne).toHaveBeenCalledWith(
            { _id: notificationId, isRead: false },
            { $set: { isRead: true } }
        );
    });

    test("UTCID02 - adds the user to readBy for a global notification", async () => {
        mockNotificationFindOne.mockReturnValue(query({
            _id: notificationId,
            receiverType: "all",
            isGlobal: true,
            title: "Global notification",
            readBy: [],
        }));

        const result = await notificationService.getMyArtistNotificationDetail(
            userId,
            "artist",
            notificationId
        );

        expect(result.isRead).toBe(true);
        expect(mockNotificationUpdateOne).toHaveBeenCalledWith(
            { _id: notificationId },
            { $addToSet: { readBy: userId } }
        );
        expect(result).not.toHaveProperty("readBy");
    });

    test("UTCID03 - throws 400 for an invalid notification ID", async () => {
        await expect(
            notificationService.getMyArtistNotificationDetail(
                userId,
                "artist",
                "invalid-id"
            )
        ).rejects.toMatchObject({ message: "Invalid request data.", statusCode: 400 });

        expect(mockNotificationFindOne).not.toHaveBeenCalled();
    });

    test("UTCID04 - throws 404 when notification is inaccessible or missing", async () => {
        mockNotificationFindOne.mockReturnValue(query(null));

        await expect(
            notificationService.getMyArtistNotificationDetail(
                userId,
                "artist",
                notificationId
            )
        ).rejects.toMatchObject({ message: "Notification not found.", statusCode: 404 });
    });
});
