import { AppError } from "../../utils/AppError.js";

const isNonEmpty = (value) => typeof value === "string" && value.trim().length > 0;
const isHttpUrl = (value) => {
    if (!isNonEmpty(value)) return false;
    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol);
    } catch {
        return false;
    }
};

const addError = (errors, field, code, message) => errors.push({ field, code, message });

const getPodcastSubmitValidationErrors = (podcast) => {
    const errors = [];
    if (!isNonEmpty(podcast?.title)) {
        addError(errors, "title", "PODCAST_TITLE_REQUIRED", "Title is required.");
    }
    if (!isNonEmpty(podcast?.description)) {
        addError(errors, "description", "PODCAST_DESCRIPTION_REQUIRED", "Description is required.");
    }
    if (!isHttpUrl(podcast?.audioUrl)) {
        addError(errors, "audioUrl", "PODCAST_AUDIO_REQUIRED", "A valid audio URL is required.");
    }
    if (!(Number(podcast?.duration) > 0)) {
        addError(errors, "duration", "PODCAST_DURATION_REQUIRED", "Audio duration must be greater than zero.");
    }
    const type = podcast?.copyrightType || "original";
    if (!["original", "licensed", "third_party"].includes(type)) {
        addError(errors, "copyrightType", "PODCAST_COPYRIGHT_TYPE_INVALID", "Copyright type is invalid.");
    }
    if (podcast?.copyrightConfirmed !== true) {
        addError(errors, "copyrightConfirmed", "PODCAST_COPYRIGHT_CONFIRMATION_REQUIRED", "Copyright confirmation is required.");
    }
    if (type === "licensed" && !isNonEmpty(podcast?.copyrightSource)) {
        addError(errors, "copyrightSource", "PODCAST_COPYRIGHT_SOURCE_REQUIRED", "A license source is required.");
    }
    if (type === "licensed" && !isHttpUrl(podcast?.copyrightProofUrl)) {
        addError(errors, "copyrightProofUrl", "PODCAST_COPYRIGHT_PROOF_REQUIRED", "A license proof URL is required.");
    }
    if (type === "third_party" && !isNonEmpty(podcast?.copyrightSource)) {
        addError(errors, "copyrightSource", "PODCAST_COPYRIGHT_SOURCE_REQUIRED", "A third-party source is required.");
    }

    return errors;
};

const validatePodcastForSubmit = (podcast) => {
    const errors = getPodcastSubmitValidationErrors(podcast);
    if (errors.length) {
        throw new AppError("Podcast is not ready for submission.", 400, errors);
    }
    return podcast;
};

export { getPodcastSubmitValidationErrors, validatePodcastForSubmit };
