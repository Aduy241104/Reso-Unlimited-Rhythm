import subscriptionService from "../services/subscription.service.js";
import formatResponse from "../utils/formatResponse.js";
import { getClientIp } from "../utils/ip.util.js";

const getActivePlans = async (req, res, next) => {
    try {
        const plans = await subscriptionService.listActivePlans();

        return formatResponse.success(
            res,
            plans,
            "Subscription plans retrieved successfully"
        );
    } catch (error) {
        next(error);
    }
};

const getMySubscription = async (req, res, next) => {
    try {
        const subscription = await subscriptionService.getMySubscriptionStatus(req.user.id);

        return formatResponse.success(
            res,
            subscription,
            "Current subscription retrieved successfully"
        );
    } catch (error) {
        next(error);
    }
};

const createVnpayOrder = async (req, res, next) => {
    try {
        const result = await subscriptionService.createVnpayOrder({
            userId: req.user.id,
            planId: req.body.planId,
            ipAddr: getClientIp(req),
        });

        return formatResponse.success(
            res,
            result,
            "VNPAY payment URL created successfully"
        );
    } catch (error) {
        next(error);
    }
};

const handleVnpayReturn = async (req, res, next) => {
    try {
        const redirectUrl = await subscriptionService.handleVnpayReturn(req.query);

        return res.redirect(redirectUrl);
    } catch (error) {
        next(error);
    }
};

const handleVnpayIpn = async (req, res, next) => {
    try {
        const result = await subscriptionService.processVnpayIpn(req.query);

        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export default {
    getActivePlans,
    getMySubscription,
    createVnpayOrder,
    handleVnpayReturn,
    handleVnpayIpn,
};
