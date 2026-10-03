/**
 * Custom NoSQL injection sanitizer — Express 5 compatible.
 * Recursively removes keys starting with "$" or containing "."
 * by mutating objects IN PLACE (never reassigns req.query).
 */

const DANGEROUS_KEY = /^\$|\\./;

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return;

  for (const key of Object.keys(obj)) {
    if (DANGEROUS_KEY.test(key)) {
      delete obj[key];
    } else {
      // Recurse into nested objects / arrays
      sanitizeObject(obj[key]);
    }
  }
}

export const sanitize = (req, res, next) => {
  sanitizeObject(req.body);
  sanitizeObject(req.params);

  // Mutate query keys in place — never reassign req.query (Express 5 getter-only)
  sanitizeObject(req.query);

  next();
};
