import artistAlbumService from "../services/artist/artist.album.service.js";
import formatResponse from "../utils/formatResponse.js";

import Interaction from "../models/Interaction.js";
import Notification from "../models/Notification.js";

const getMyAlbums = async (req, res, next) => {
    try {
        const result = await artistAlbumService.getMyAlbums(req.user.id, req.query);

        return formatResponse.success(
            res,
            { albums: result.albums },
            "Artist albums fetched successfully",
            result.pagination
        );
    } catch (error) {
        next(error);
    }
};

const getMyAlbumDetail = async (req, res, next) => {
    try {
        const album = await artistAlbumService.getMyAlbumDetail(req.user.id, req.params.id);

        return formatResponse.success(
            res,
            { album },
            "Artist album detail fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const createAlbum = async (req, res, next) => {
    try {
        const album = await artistAlbumService.createAlbum(req.user.id, req.body, req.file);

        // Nếu album được phát hành ở trạng thái active => tạo thông báo cho follower
        if (album && album.status === "active") {
            (async () => {
                try {
                    const artistId = album.artistId?._id || album.artistId;
                    const artistName = album.artistId?.name || "Nghệ sĩ";

                    const followers = await Interaction.find({ targetType: "Artist", targetId: artistId, action: "follow" }).select("userId").lean();
                    if (!followers || followers.length === 0) return;

                    const notifications = followers.map((f) => ({
                        userId: f.userId,
                        type: "new_release",
                        title: `${artistName} vừa phát hành album mới`,
                        content: `${artistName} vừa phát hành album "${album.title || ''}" — khám phá ngay!`,
                        isRead: false,
                        actorId: req.user.id || null,
                        actorType: "artist",
                        targetId: album._id,
                        targetType: "album",
                        receiverType: "single",
                        isGlobal: false,
                        readBy: [],
                        deletedBy: [],
                        createdBy: req.user.id || null,
                    }));

                    const inserted = await Notification.insertMany(notifications);
                    const io = req.app.get("io");
                    if (io && Array.isArray(inserted) && inserted.length > 0) {
                        inserted.forEach((n) => {
                            try { io.to(String(n.userId)).emit("new_notification", n); } catch (e) {}
                        });
                    }
                } catch (err) {
                    console.error("Error creating album follower notifications:", err);
                }
            })();
        }

        return formatResponse.success(
            res,
            { album },
            "Album created successfully"
        );
    } catch (error) {
        next(error);
    }
};

const updateAlbum = async (req, res, next) => {
    try {
        const album = await artistAlbumService.updateAlbum(req.user.id, req.params.id, req.body, req.file);

        return formatResponse.success(
            res,
            { album },
            "Album updated successfully"
        );
    } catch (error) {
        next(error);
    }
};

const hideAlbum = async (req, res, next) => {
    try {
        const album = await artistAlbumService.hideAlbum(req.user.id, req.params.id);

        return formatResponse.success(
            res,
            { album },
            "Album hidden successfully"
        );
    } catch (error) {
        next(error);
    }
};

const unhideAlbum = async (req, res, next) => {
    try {
        const album = await artistAlbumService.unhideAlbum(req.user.id, req.params.id);

        // Nếu album vừa được unhide => gửi thông báo tới follower
        if (album && album.status === "active") {
            (async () => {
                try {
                    const artistId = album.artistId?._id || album.artistId;
                    const artistName = album.artistId?.name || "Nghệ sĩ";

                    const followers = await Interaction.find({ targetType: "Artist", targetId: artistId, action: "follow" }).select("userId").lean();
                    if (!followers || followers.length === 0) return;

                    const notifications = followers.map((f) => ({
                        userId: f.userId,
                        type: "new_release",
                        title: `${artistName} vừa phát hành album mới`,
                        content: `${artistName} vừa phát hành album "${album.title || ''}" — khám phá ngay!`,
                        isRead: false,
                        actorId: req.user.id || null,
                        actorType: "artist",
                        targetId: album._id,
                        targetType: "album",
                        receiverType: "single",
                        isGlobal: false,
                        readBy: [],
                        deletedBy: [],
                        createdBy: req.user.id || null,
                    }));

                    const inserted = await Notification.insertMany(notifications);
                    const io = req.app.get("io");
                    if (io && Array.isArray(inserted) && inserted.length > 0) {
                        inserted.forEach((n) => {
                            try { io.to(String(n.userId)).emit("new_notification", n); } catch (e) {}
                        });
                    }
                } catch (err) {
                    console.error("Error creating album follower notifications:", err);
                }
            })();
        }

        return formatResponse.success(
            res,
            { album },
            "Album unhidden successfully"
        );
    } catch (error) {
        next(error);
    }
};

const addTrackToAlbum = async (req, res, next) => {
    try {
        const album = await artistAlbumService.addTrackToAlbum(
            req.user.id,
            req.params.id,
            req.body.trackId
        );

        return formatResponse.success(
            res,
            { album },
            "Track added to album successfully"
        );
    } catch (error) {
        next(error);
    }
};

const removeTrackFromAlbum = async (req, res, next) => {
    try {
        const album = await artistAlbumService.removeTrackFromAlbum(
            req.user.id,
            req.params.id,
            req.params.trackId
        );

        return formatResponse.success(
            res,
            { album },
            "Track removed from album successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getMyAlbums,
    getMyAlbumDetail,
    createAlbum,
    updateAlbum,
    hideAlbum,
    unhideAlbum,
    addTrackToAlbum,
    removeTrackFromAlbum,
};
