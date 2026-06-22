function notFound(req, res, next) {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.status = 404;
  next(err);
}

function errorHandler(err, req, res, next) {
  const statusCode = err.status || 500;
  console.error(`[Error] ${statusCode} — ${err.message}`);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }
  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: statusCode,
    },
  });
}

module.exports = { notFound, errorHandler };
