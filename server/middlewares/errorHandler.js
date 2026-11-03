export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message;

  // Log 500 errors on the server for debugging
  if (statusCode >= 500) {
    console.error(`[Server Error ${statusCode}] ${req.method} ${req.originalUrl}:`, err);
  }

  // If Mongoose CastError (e.g. invalid ObjectId), return clean 404
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // If Zod validation error, return 400 and user-friendly error string
  if (err.name === 'ZodError' || Array.isArray(err.errors) || Array.isArray(err.issues)) {
    const issues = err.issues || err.errors;
    statusCode = 400;
    message = issues && issues.length > 0
      ? issues.map((e) => e.message || `${e.path?.join('.')}: invalid`).join(', ')
      : err.message || 'Validation error';
  }

  // In production, do not leak internal system/DB/driver details on 500s
  const isProd = process.env.NODE_ENV === 'production';
  if (statusCode === 500 && isProd) {
    message = 'An unexpected error occurred. Please try again later.';
  }

  res.status(statusCode).json({
    message,
    ...(err.code ? { code: err.code } : {}),
    stack: isProd ? null : err.stack,
  });
};
