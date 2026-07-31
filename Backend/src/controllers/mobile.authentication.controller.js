import mobileAuthenticationService from "../services/Authentication/mobile.authentication.service.js";
import formatResponse from "../utils/formatResponse.js";

const forgotPassword = async (req, res, next) => {
    try {
        const result =
            await mobileAuthenticationService.requestMobileForgotPassword(
                req.body
            );

        return formatResponse.success(
            res,
            result,
            "If the email exists, a mobile password reset OTP has been sent."
        );
    } catch (error) {
        next(error);
    }
};

export default {
    forgotPassword,
};
