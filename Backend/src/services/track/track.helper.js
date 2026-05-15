import Subscription from "../../models/Subscription.js";
import { AppError } from "../../utils/AppError.js";

const PREMIUM_AUDIO_FEATURES = new Set([
    "HIGH_QUALITY_AUDIO",
    "LOSSLESS_AUDIO",
]);

const toId = (value) => {
    if (!value) {
        return null;
    }

    return value.toString();
};

const getValidAudioFiles = (audioFiles = []) =>
    audioFiles
        .filter((audioFile) => audioFile?.url)
        .map((audioFile) => ({
            url: audioFile.url,
            format: String(audioFile.format || "").toLowerCase(),
            bitrate: Number.isFinite(Number(audioFile.bitrate))
                ? Number(audioFile.bitrate)
                : null,
        }));

const pickPremiumDefaultAudio = (audioFiles) => {
    if (!audioFiles.length) {
        return null;
    }

    return [...audioFiles].sort((firstAudio, secondAudio) => {
        const secondBitrate = secondAudio.bitrate ?? -1;
        const firstBitrate = firstAudio.bitrate ?? -1;

        return secondBitrate - firstBitrate;
    })[0];
};

const pickBasicAudio = (audioFiles) =>
    audioFiles.find(
        (audioFile) => audioFile.format === "mp4" && audioFile.bitrate === 128
    ) || null;

const getPremiumAccessState = async (user) => {
    if (!user?.id) {
        return {
            isPremium: false,
            plan: null,
        };
    }

    const now = new Date();
    const premiumEndDate = user.subscription?.premiumEndDate
        ? new Date(user.subscription.premiumEndDate)
        : null;
    const hasPremiumFlag = Boolean(user.subscription?.isPremium) &&
        (!premiumEndDate || premiumEndDate > now);

    const activeSubscription = await Subscription.findOne({
        userId: user.id,
        status: "active",
        $and: [
            {
                $or: [
                    { startDate: null },
                    { startDate: { $lte: now } },
                ],
            },
            {
                $or: [
                    { endDate: null },
                    { endDate: { $gt: now } },
                ],
            },
        ],
    })
        .populate({
            path: "planId",
            select: "name price features status",
        })
        .lean();

    const plan = activeSubscription?.planId || null;
    const hasPaidPlan = Boolean(plan) && plan.status !== "inactive" && (
        Number(plan.price || 0) > 0 ||
        (plan.features || []).some((feature) => PREMIUM_AUDIO_FEATURES.has(feature))
    );

    return {
        isPremium: hasPremiumFlag || hasPaidPlan,
        plan: plan
            ? {
                id: toId(plan._id),
                name: plan.name,
            }
            : null,
    };
};

const formatTrackArtist = (artist) =>
    artist
        ? {
            id: toId(artist._id),
            name: artist.name,
            avatar: artist.avatar,
            coverImage: artist.coverImage,
        }
        : null;

const formatTrackAlbum = (album) =>
    album
        ? {
            id: toId(album._id),
            title: album.title,
            coverImage: album.coverImage,
        }
        : null;

const formatTrackGenres = (genres = []) =>
    genres.map((genre) => ({
        id: toId(genre._id),
        name: genre.name,
        image: genre.image,
    }));

const formatTrackDetail = (track) => ({
    id: toId(track._id),
    title: track.title,
    duration: track.duration,
    avatar: track.avatar,
    coverImage: track.coverImage,
    releaseDate: track.releaseDate,
    stats: track.stats,
    artist: formatTrackArtist(track.artist_artistId),
    album: formatTrackAlbum(track.album_albumId),
    genres: formatTrackGenres(track.genreIds),
    lyrics: {
        static: track.lyricsStatic,
        syncUrl: track.lyricsSyncUrl,
    },
});

const formatTrackPlayback = (track, audioFiles, accessState) => {
    const isPremium = accessState.isPremium;
    const basicAudio = pickBasicAudio(audioFiles);
    const exposedAudioFiles = isPremium ? audioFiles : (basicAudio ? [basicAudio] : []);
    const defaultAudio = isPremium
        ? pickPremiumDefaultAudio(exposedAudioFiles)
        : exposedAudioFiles[0] || null;

    if (!defaultAudio) {
        throw new AppError(
            isPremium
                ? "Track does not have any playable audio file."
                : "Track does not provide an mp4 128kbps stream for basic users.",
            isPremium ? 404 : 403,
            isPremium
                ? null
                : {
                    upgradeRequired: true,
                    requiredFormat: "mp4",
                    requiredBitrate: 128,
                }
        );
    }

    return {
        id: toId(track._id),
        title: track.title,
        duration: track.duration,
        avatar: track.avatar,
        coverImage: track.coverImage,
        releaseDate: track.releaseDate,
        stats: track.stats,
        artist: formatTrackArtist(track.artist_artistId),
        album: formatTrackAlbum(track.album_albumId),
        lyrics: {
            static: track.lyricsStatic,
            syncUrl: track.lyricsSyncUrl,
        },
        playback: {
            accessLevel: isPremium ? "premium" : "basic",
            plan: accessState.plan,
            defaultAudio,
            audioFiles: exposedAudioFiles,
        },
    };
};

export {
    formatTrackDetail,
    formatTrackPlayback,
    getPremiumAccessState,
    getValidAudioFiles,
};
