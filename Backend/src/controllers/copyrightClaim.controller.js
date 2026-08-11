import copyrightClaimService from "../services/copyright/copyrightClaim.service.js";
import formatResponse from "../utils/formatResponse.js";

const createClaim = async (req, res, next) => {
    try {
        const claim = await copyrightClaimService.createClaim(
            req.user.id,
            req.body,
            req.files?.evidence || []
        );
        return formatResponse.success(res, { claim }, "Copyright claim submitted successfully");
    } catch (error) {
        next(error);
    }
};

const getMyClaims = async (req, res, next) => {
    try {
        const result = await copyrightClaimService.getMyClaims(req.user.id, req.query);
        return formatResponse.success(res, result, "Copyright claims fetched successfully");
    } catch (error) {
        next(error);
    }
};

const getMyClaim = async (req, res, next) => {
    try {
        const claim = await copyrightClaimService.getClaimForParticipant(req.user.id, req.params.id);
        return formatResponse.success(res, { claim }, "Copyright claim fetched successfully");
    } catch (error) {
        next(error);
    }
};

const respondToClaim = async (req, res, next) => {
    try {
        const claim = await copyrightClaimService.respondToClaim(
            req.user.id,
            req.params.id,
            req.body,
            req.files?.evidence || []
        );
        return formatResponse.success(res, { claim }, "Copyright claim response submitted successfully");
    } catch (error) {
        next(error);
    }
};

const appealClaim = async (req, res, next) => {
    try {
        const claim = await copyrightClaimService.appealClaim(
            req.user.id,
            req.params.id,
            req.body,
            req.files?.evidence || []
        );
        return formatResponse.success(res, { claim }, "Copyright claim appeal submitted successfully");
    } catch (error) {
        next(error);
    }
};

export default { createClaim, getMyClaims, getMyClaim, respondToClaim, appealClaim };
