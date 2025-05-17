/**
 * Functions for sanitizing data before sending to LLM context
 */

/**
 * Sanitize an object to remove sensitive fields
 */
export const sanitizeData = (obj) => {
  if (!obj) return obj;

  const sanitized = { ...obj };

  // Remove sensitive fields
  if (sanitized._id) delete sanitized._id;
  if (sanitized.user) delete sanitized.user;

  // Mask PII data
  if (sanitized.email) sanitized.email = sanitized.email.replace(/^(.)(.*)(@.*)$/, '$1***$3');
  if (sanitized.phone) sanitized.phone = sanitized.phone.replace(/^(\d{2})(\d+)(\d{2})$/, '$1****$3');

  return sanitized;
};
