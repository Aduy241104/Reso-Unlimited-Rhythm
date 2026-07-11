const DAY_IN_MS = 24 * 60 * 60 * 1000;

const addDays = (baseDate, days) => {
    const date = baseDate instanceof Date ? baseDate : new Date(baseDate);

    return new Date(date.getTime() + days * DAY_IN_MS);
};

export {
    DAY_IN_MS,
    addDays,
};

