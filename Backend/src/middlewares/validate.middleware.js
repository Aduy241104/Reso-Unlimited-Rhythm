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

    if (target === "query") {
        const currentQuery = req.query || {};

        Object.keys(currentQuery).forEach((key) => {
            delete currentQuery[key];
        });

        Object.assign(currentQuery, value);
    } else {
        req[target] = value;
    }

    next();
};

export default validate;
