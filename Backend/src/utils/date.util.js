const DAY_IN_MS = 24 * 60 * 60 * 1000;

const padDatePart = (value) => String(value).padStart(2, "0");

const addDays = (baseDate, days) => {
    const date = baseDate instanceof Date ? baseDate : new Date(baseDate);

    return new Date(date.getTime() + days * DAY_IN_MS);
};

const formatDateOnly = (value) => {
    if (value === undefined || value === null) {
        return null;
    }

    const rawValue =
        typeof value === "string" || value instanceof Date
            ? value
            : String(value);

    if (typeof rawValue === "string") {
        const trimmedValue = rawValue.trim();

        if (!trimmedValue) {
            return null;
        }

        const matchedDate = trimmedValue.match(/^(\d{4}-\d{2}-\d{2})/);

        if (matchedDate) {
            return matchedDate[1];
        }
    }

    const parsedDate = rawValue instanceof Date ? rawValue : new Date(rawValue);

    if (Number.isNaN(parsedDate.getTime())) {
        return null;
    }

    return [
        parsedDate.getUTCFullYear(),
        padDatePart(parsedDate.getUTCMonth() + 1),
        padDatePart(parsedDate.getUTCDate()),
    ].join("-");
};

const parseDateOnlyToUtcDate = (value) => {
    const dateOnly = formatDateOnly(value);

    if (!dateOnly) {
        return null;
    }

    const [year, month, day] = dateOnly.split("-").map(Number);

    if (
        !Number.isInteger(year) ||
        !Number.isInteger(month) ||
        !Number.isInteger(day)
    ) {
        return null;
    }

    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
};

export {
    DAY_IN_MS,
    addDays,
    formatDateOnly,
    parseDateOnlyToUtcDate,
};

