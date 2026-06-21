import mongoose from "mongoose";
import Artist from "../../models/Artist.js";
import Interaction from "../../models/Interaction.js";
import Notification from "../../models/Notification.js";
import Track from "../../models/Track.js";

const getTrackThumbnail = (track) => {
    if (Array.isArray(track?.coverImage) && track.coverImage.length > 0) {
        return track.coverImage[0] || "";
    }

    return track?.avatar || "";
};

const formatReleaseTime = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
};

const getArtistAndTrack = async ({ artistId, trackId }) => {
    if (!mongoose.Types.ObjectId.isValid(artistId) || !mongoose.Types.ObjectId.isValid(trackId)) {
        return {};
    }

    const [artist, track] = await Promise.all([
        Artist.findById(artistId).select("_id name userId avatar").lean(),
        Track.findById(trackId).select("_id title avatar coverImage artist_artistId releaseDate").lean(),
    ]);

    if (!artist || !track || String(track.artist_artistId) !== String(artist._id)) {
        return {};
    }

    return { artist, track };
};

const getArtistFollowers = async (artistId) => {
    return Interaction.find({
        targetType: "Artist",
        targetId: artistId,
        action: "follow",
    })
        .select("userId")
        .lean();
};

const emitNotificationToFollowers = (io, followers, notification, artistName = "") => {
    if (!io || !Array.isArray(followers) || followers.length === 0) return;

    const notificationPayload = {
        ...(notification.toObject ? notification.toObject() : notification),
        artistName,
    };

    followers.forEach((follower) => {
        if (!follower?.userId) return;

        try {
            io.to(String(follower.userId)).emit("new_notification", notificationPayload);
        } catch (error) {
            void error;
        }
    });
};

const findExistingArtistAutoNotification = ({ type, artistId, trackId }) => {
    return Notification.findOne({
        sourceType: "artist_auto",
        type,
        artistId,
        relatedTrackId: trackId,
    }).lean();
};

const createUpcomingReleaseNotificationForArtistFollowers = async ({
    artistId,
    trackId,
    io,
}) => {
    const { artist, track } = await getArtistAndTrack({ artistId, trackId });
    if (!artist || !track) return null;

    const followers = await getArtistFollowers(artist._id);
    if (followers.length === 0) return null;

    const existingNotification = await findExistingArtistAutoNotification({
        type: "artist_update",
        artistId: artist._id,
        trackId: track._id,
    });

    if (existingNotification) return existingNotification;

    const releaseTimeText = track.releaseDate
        ? ` vào ${formatReleaseTime(track.releaseDate)}`
        : "";

    const notification = await Notification.create({
        title: `${artist.name || "Nghệ sĩ"} sắp phát hành bài hát mới`,
        content: `${track.title || "Bài hát mới"} sẽ phát hành${releaseTimeText}. Vào trang nghệ sĩ để xem Upcoming Release.`,
        type: "artist_update",
        receiverType: "followers",
        artistId: artist._id,
        relatedTrackId: track._id,
        actorId: artist.userId || artist._id,
        actorType: "artist",
        targetType: "artist",
        targetId: artist._id,
        targetName: artist.name || "",
        thumbnail: artist.avatar || getTrackThumbnail(track),
        sourceType: "artist_auto",
        isGlobal: false,
        readBy: [],
        deletedBy: [],
        createdBy: artist.userId || null,
    });

    emitNotificationToFollowers(io, followers, notification, artist.name || "");

    return notification;
};

const createNewReleaseNotificationForArtistFollowers = async ({
    artistId,
    trackId,
    io,
}) => {
    const { artist, track } = await getArtistAndTrack({ artistId, trackId });
    if (!artist || !track) return null;

    const followers = await getArtistFollowers(artist._id);
    if (followers.length === 0) return null;

    const existingNotification = await findExistingArtistAutoNotification({
        type: "new_release",
        artistId: artist._id,
        trackId: track._id,
    });

    if (existingNotification) return existingNotification;

    const notification = await Notification.create({
        title: `${artist.name || "Nghệ sĩ"} vừa phát hành bài hát mới`,
        content: `Nghe ngay ${track.title || "bài hát mới"} trên Reso.`,
        type: "new_release",
        receiverType: "followers",
        artistId: artist._id,
        relatedTrackId: track._id,
        actorId: artist.userId || artist._id,
        actorType: "artist",
        targetType: "track",
        targetId: track._id,
        targetName: track.title || "",
        thumbnail: getTrackThumbnail(track),
        sourceType: "artist_auto",
        isGlobal: false,
        readBy: [],
        deletedBy: [],
        createdBy: artist.userId || null,
    });

    emitNotificationToFollowers(io, followers, notification, artist.name || "");

    return notification;
};

export {
    createNewReleaseNotificationForArtistFollowers,
    createUpcomingReleaseNotificationForArtistFollowers,
};

export default {
    createNewReleaseNotificationForArtistFollowers,
    createUpcomingReleaseNotificationForArtistFollowers,
};
