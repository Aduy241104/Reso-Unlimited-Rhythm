import crypto from "node:crypto";
import { deleteCloudinaryAssetsByUrls, uploadToCloudinary } from "../utils/uploadCloud.js";
import { inspectPodcastAudio } from "../services/podcast/podcast.audio.service.js";
import podcastService from "../services/podcast/podcast.service.js";
import { listPublicPodcasts, getPublicPodcast } from "../services/podcast/podcast.public.service.js";
import { recordPodcastListen } from "../services/podcast/podcast.listen.service.js";
import { recordPodcastStream } from "../services/podcast/podcast.stream.service.js";
import formatResponse from "../utils/formatResponse.js";
import { AppError } from "../utils/AppError.js";

const createPodcast = async (req, res, next) => {
    try {
        const podcast = await podcastService.createArtistPodcast(req.user.id, req.body);
        return formatResponse.success(res, { podcast }, "Podcast draft created successfully.");
    } catch (error) { next(error); }
};

const listArtistPodcasts = async (req, res, next) => {
    try {
        const result = await podcastService.listArtistPodcasts(req.user.id, req.query);
        return formatResponse.success(res, { podcasts: result.podcasts }, "Artist podcasts fetched successfully.", result.pagination);
    } catch (error) { next(error); }
};

const getArtistPodcast = async (req, res, next) => {
    try {
        const podcast = await podcastService.getArtistPodcast(req.user.id, req.params.id);
        return formatResponse.success(res, { podcast }, "Podcast fetched successfully.");
    } catch (error) { next(error); }
};

const updateArtistPodcast = async (req, res, next) => {
    try {
        const podcast = await podcastService.updateArtistPodcast(req.user.id, req.params.id, req.body);
        return formatResponse.success(res, { podcast }, "Podcast updated successfully.");
    } catch (error) { next(error); }
};

const submitArtistPodcast = async (req, res, next) => {
    try {
        const podcast = await podcastService.submitArtistPodcast(req.user.id, req.params.id);
        return formatResponse.success(res, { podcast }, "Podcast submitted for review.");
    } catch (error) { next(error); }
};

const deleteArtistPodcast = async (req, res, next) => {
    try {
        const podcast = await podcastService.deleteArtistPodcast(req.user.id, req.params.id);
        return formatResponse.success(res, { podcast }, "Podcast deleted successfully.");
    } catch (error) { next(error); }
};

const setPodcastVisibility = async (req, res, next) => {
    try {
        const podcast = await podcastService.setArtistPodcastVisibility(req.user.id, req.params.id, req.body.visibility);
        return formatResponse.success(res, { podcast }, "Podcast visibility updated successfully.");
    } catch (error) { next(error); }
};

const uploadPodcastFiles = async (req, res, next) => {
    const uploadedUrls = [];
    try {
        const files = req.files || {};
        const audioFile = files.audio?.[0];
        const coverFile = files.coverImage?.[0];
        const operationId = String(req.get("x-upload-operation-id") || crypto.randomUUID()).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
        const result = { audioUrl: "", coverImageUrl: "", duration: 0, format: "", size: 0, mimeType: "" };

        if (audioFile) {
            const analysis = await inspectPodcastAudio(audioFile.buffer, audioFile.originalname);
            const uploaded = await uploadToCloudinary(audioFile.buffer, "podcasts/audio", "video", {
                publicId: `${operationId}/audio`,
            });
            result.audioUrl = uploaded.secure_url;
            result.duration = analysis.duration;
            result.format = analysis.format;
            result.size = audioFile.size;
            result.mimeType = audioFile.mimetype;
            uploadedUrls.push(uploaded.secure_url);
        }

        if (coverFile) {
            const uploaded = await uploadToCloudinary(coverFile.buffer, "podcasts/cover", "image", {
                publicId: `${operationId}/cover`,
            });
            result.coverImageUrl = uploaded.secure_url;
            uploadedUrls.push(uploaded.secure_url);
        }

        return formatResponse.success(res, result, "Podcast files uploaded successfully.");
    } catch (error) {
        await deleteCloudinaryAssetsByUrls(uploadedUrls).catch(() => null);
        next(error instanceof AppError ? error : new AppError(`Podcast upload failed: ${error.message}`, 400, { code: "PODCAST_UPLOAD_FAILED" }));
    }
};

const listPodcasts = async (req, res, next) => {
    try {
        const result = await listPublicPodcasts(req.query);
        return formatResponse.success(res, { podcasts: result.podcasts }, "Podcasts fetched successfully.", result.pagination);
    } catch (error) { next(error); }
};

const getPodcast = async (req, res, next) => {
    try {
        const podcast = await getPublicPodcast(req.params.id);
        return formatResponse.success(res, { podcast }, "Podcast fetched successfully.");
    } catch (error) { next(error); }
};

const listen = async (req, res, next) => {
    try {
        const listenedDuration = req.body.listenedDuration ?? req.body.duration ?? 0;
        const result = await recordPodcastListen({
            podcastId: req.params.id,
            listenedDuration,
            userId: req.user?.id,
            sessionId: req.body.sessionId || req.get("x-session-id"),
            ip: req.ip,
        });
        return formatResponse.success(res, result, "Podcast listen event processed.");
    } catch (error) { next(error); }
};

const stream = async (req, res, next) => {
    try {
        const result = await recordPodcastStream({
            podcastId: req.params.id,
            listenedDuration: req.body.listenedDuration,
            userId: req.user?.id,
            guestId: req.user ? undefined : req.body.guestId || req.get("x-guest-id"),
            source: req.body.source,
        });
        return formatResponse.success(res, result, "Podcast stream event processed.");
    } catch (error) { next(error); }
};

export default {
    createPodcast,
    listArtistPodcasts,
    getArtistPodcast,
    updateArtistPodcast,
    submitArtistPodcast,
    deleteArtistPodcast,
    setPodcastVisibility,
    uploadPodcastFiles,
    listPodcasts,
    getPodcast,
    listen,
    stream,
};
