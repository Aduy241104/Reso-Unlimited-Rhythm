import { AppError } from "../utils/AppError.js";

const validate = (schema, target = "body") => (req, res, next) => {
    const { error, value } = schema.validate(req[target], {
        abortEarly: false,
        stripUnknown: true,
    });

    if (error) {
        return next(
            new AppError(
                "Invalid request data.",
                400,
                error.details.map((detail) => ({
                    field: detail.path.join("."),
                    message: detail.message,
                }))
            )
        );
    }

    if (target === "query" && req[target] && typeof req[target] === "object") {
        Object.assign(req[target], value);
    } else {
        req[target] = value;
    }
    next();
};

export default validate;
