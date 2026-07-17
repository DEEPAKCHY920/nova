// Wraps an async route/controller so rejected promises are forwarded to Express's error handler.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
