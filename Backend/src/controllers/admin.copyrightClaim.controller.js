import copyrightClaimService from "../services/copyright/copyrightClaim.service.js";
import formatResponse from "../utils/formatResponse.js";

const listClaims = async (req, res, next) => {
    try {
        const result = await copyrightClaimService.listClaimsForAdmin(req.query);
        return formatResponse.success(res, result, "Copyright claims fetched successfully");
    } catch (error) {
        next(error);
    }
};

const decideClaim = async (req, res, next) => {
    try {
        const claim = await copyrightClaimService.decideClaim(
            req.user.id,
            req.params.id,
            req.body
        );
        return formatResponse.success(res, { claim }, "Copyright claim decided successfully");
    } catch (error) {
        next(error);
    }
};

export default { listClaims, decideClaim };
