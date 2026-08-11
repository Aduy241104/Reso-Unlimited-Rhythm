import express from "express";
import artistTrackController from "../controllers/artist.track.controller.js";
import uploadController from "../controllers/upload.controller.js";
import trackValidation from "../middlewares/track.validation.js";
import createTrackSchema, {
    updateTrackSchema,
} from "../middlewares/TrackMiddlewareValidation/track.validation.js";
import validate from "../middlewares/validate.middleware.js";
import { requireArtist } from "../middlewares/Authentication/authentication.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import { runArtistCopyrightEvidenceUpload } from "../middlewares/artist/artist.copyrightEvidenceUpload.middleware.js";
import appealController from "../controllers/artist.trackReviewAppeal.controller.js";
import appealValidation from "../middlewares/trackReviewAppeal.validation.js";

const router = express.Router();

router.post(
    "/upload",
    requireArtist,
    upload.fields([
        { name: "audioFiles", maxCount: 1 },
        { name: "avatar", maxCount: 1 },
        { name: "coverImages", maxCount: 5 },
        { name: "lyricsSync", maxCount: 1 },
    ]),
    uploadController
);

router.post(
    "/",
    requireArtist,
    validate(createTrackSchema, "body"),
    artistTrackController.createTrack
);

const artistMeRouter = express.Router();
artistMeRouter.use(requireArtist);

artistMeRouter.get("/me", artistTrackController.getMyTracks);

artistMeRouter.get(
    "/me/:id",
    validate(trackValidation.trackIdParamSchema, "params"),
    artistTrackController.getMyTrackDetail
);

artistMeRouter.post(
    "/me/:id/appeals",
    validate(trackValidation.trackIdParamSchema, "params"),
    validate(appealValidation.createTrackReviewAppealSchema, "body"),
    appealController.createAppeal
);

artistMeRouter.post(
    "/me/:id/appeals/evidence",
    validate(trackValidation.trackIdParamSchema, "params"),
    runArtistCopyrightEvidenceUpload,
    appealController.uploadEvidence
);

artistMeRouter.get(
    "/me/:id/appeals",
    validate(trackValidation.trackIdParamSchema, "params"),
    appealController.listAppeals
);

artistMeRouter.get(
    "/me/:id/appeals/latest",
    validate(trackValidation.trackIdParamSchema, "params"),
    appealController.latestAppeal
);

artistMeRouter.patch(
    "/me/:id",
    validate(trackValidation.trackIdParamSchema, "params"),
    validate(updateTrackSchema, "body"),
    artistTrackController.updateMyTrack
);

artistMeRouter.patch(
    "/me/:id/hide",
    validate(trackValidation.trackIdParamSchema, "params"),
    artistTrackController.hideMyTrack
);

artistMeRouter.patch(
    "/me/:id/unhide",
    validate(trackValidation.trackIdParamSchema, "params"),
    artistTrackController.unhideMyTrack
);

artistMeRouter.patch(
    "/me/:id/submit",
    validate(trackValidation.trackIdParamSchema, "params"),
    artistTrackController.submitMyTrack
);

artistMeRouter.post(
    "/me/:id/copyright-evidence",
    validate(trackValidation.trackIdParamSchema, "params"),
    runArtistCopyrightEvidenceUpload,
    artistTrackController.uploadCopyrightEvidence
);

artistMeRouter.delete(
    "/me/:id",
    validate(trackValidation.trackIdParamSchema, "params"),
    artistTrackController.deleteMyTrack
);

router.use("/artist", artistMeRouter);
// Keep the canonical /api/artist/track/me/... form as well. Older clients
// used /api/artist/track/artist/me/...; both must resolve during deployment
// and rolling frontend/backend restarts.
router.use(artistMeRouter);

export default router;
