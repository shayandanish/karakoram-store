export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message;

  // If Mongoose not found error, set to 404 and change message
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // If Zod validation error, return 400 and human-readable message
  if (err.name === 'ZodError' || Array.isArray(err.errors) || Array.isArray(err.issues)) {
    const issues = err.issues || err.errors;
    statusCode = 400;
    message = issues && issues.length > 0
      ? issues.map((e) => e.message || `${e.path?.join('.')}: invalid`).join(', ')
      : err.message || 'Validation error';
  }

  res.status(statusCode).json({
    message,
    ...(err.code ? { code: err.code } : {}),
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};
