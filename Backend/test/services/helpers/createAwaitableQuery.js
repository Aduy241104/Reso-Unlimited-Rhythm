import { jest } from "@jest/globals";

const DEFAULT_METHODS = [
    "populate",
    "select",
    "sort",
    "skip",
    "limit",
    "lean",
];

const createAwaitableQuery = (result, methodNames = DEFAULT_METHODS) => {
    const chain = {};

    methodNames.forEach((methodName) => {
        chain[methodName] = jest.fn().mockReturnValue(chain);
    });

    chain.then = (onFulfilled, onRejected) =>
        Promise.resolve(result).then(onFulfilled, onRejected);
    chain.catch = (onRejected) => Promise.resolve(result).catch(onRejected);
    chain.finally = (onFinally) => Promise.resolve(result).finally(onFinally);

    return chain;
};

export default createAwaitableQuery;
