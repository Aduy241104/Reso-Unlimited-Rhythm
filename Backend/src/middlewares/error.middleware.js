import { AppError } from "../utils/AppError.js";
import formatResponse from "../utils/formatResponse.js";

const notFoundHandler = (req, res, next) => {
    next(new AppError(`Route ${req.method} ${req.originalUrl} not found.`, 404));
};

const globalErrorHandler = (error, req, res, next) => {
    let normalizedError = error;

    if (error?.code === 11000) {
        const duplicatedField = Object.keys(error.keyPattern || {})[0] || "field";
        normalizedError = new AppError("Resource already exists.", 409, {
            field: duplicatedField,
        });
    }

    if (!(normalizedError instanceof AppError)) {
        console.error(normalizedError);
        normalizedError = new AppError("Internal server error.", 500);
    }

    return formatResponse.error(
        res,
        normalizedError.message,
        normalizedError.statusCode,
        normalizedError.details
    );
};

export {
    notFoundHandler,
    globalErrorHandler,
};
