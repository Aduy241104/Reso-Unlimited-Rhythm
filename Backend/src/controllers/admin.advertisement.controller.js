import advertisementService from "../services/advertisement/advertisement.service.js";
import { deleteCloudinaryAssetByUrl, uploadToCloudinary } from "../utils/uploadCloud.js";
import { AppError } from "../utils/AppError.js";
import formatResponse from "../utils/formatResponse.js";

const list = async (req, res, next) => {
    try {
        const result = await advertisementService.listAdvertisements(req.query);
        return formatResponse.success(res, { advertisements: result.advertisements }, "Advertisements fetched.", result.pagination);
    } catch (error) { next(error); }
};

const get = async (req, res, next) => {
    try { return formatResponse.success(res, { advertisement: await advertisementService.getAdvertisement(req.params.id) }); }
    catch (error) { next(error); }
};

const create = async (req, res, next) => {
    try { return formatResponse.success(res, { advertisement: await advertisementService.createAdvertisement(req.body, req.user) }, "Advertisement created."); }
    catch (error) { next(error); }
};

const update = async (req, res, next) => {
    try { return formatResponse.success(res, { advertisement: await advertisementService.updateAdvertisement(req.params.id, req.body, req.user) }, "Advertisement updated."); }
    catch (error) { next(error); }
};

const archive = async (req, res, next) => {
    try { return formatResponse.success(res, { advertisement: await advertisementService.archiveAdvertisement(req.params.id, req.user) }, "Advertisement archived."); }
    catch (error) { next(error); }
};

const uploadMedia = async (req, res, next) => {
    try {
        const file = req.file;
        const requestedType = String(req.body?.type || "").toLowerCase();
        if (!file || requestedType !== "audio") throw new AppError("A valid audio advertisement file is required.", 400);
        const isAudio = file.mimetype.startsWith("audio/") || /\.(mp3|m4a|aac|wav|flac)$/i.test(file.originalname);
        if (!isAudio) throw new AppError("Uploaded media does not match audio advertisement type.", 400);
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) throw new AppError(`Advertisement ${requestedType} file is too large.`, 400);
        const result = await uploadToCloudinary(file.buffer, "reso/advertisements/audio", "video");
        const maxAudioDuration = Math.max(Number(process.env.AD_MAX_AUDIO_DURATION_SECONDS) || 300, 1);
        if (requestedType === "audio" && (!Number(result.duration) || Number(result.duration) > maxAudioDuration)) {
            await deleteCloudinaryAssetByUrl(result.secure_url).catch(() => null);
            throw new AppError(`Audio advertisement must be readable and no longer than ${maxAudioDuration} seconds.`, 400);
        }
        return formatResponse.success(res, { media: { url: result.secure_url, duration: Number(result.duration) || 0, width: result.width || 0, height: result.height || 0 } }, "Advertisement media uploaded.");
    } catch (error) { next(error); }
};

export default { list, get, create, update, archive, uploadMedia };
