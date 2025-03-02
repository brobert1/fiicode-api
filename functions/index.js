// Aliases for functions that are used in multiple places
export { default as coffee } from 'express-goodies/functions/coffee';
export { default as error } from 'express-goodies/functions/error';
export { default as falsy } from 'express-goodies/functions/falsy';
export { default as safeNumber } from 'express-goodies/functions/safe-number';
export { default as safeString } from 'express-goodies/functions/safe-string';

// Export the functions
export { default as cleanupFiles } from './cleanup-files';
export { default as notifyClient } from './notify-client';
export { default as randomHash } from './random-hash';
export { default as removeRefreshTokenCookie } from './remove-refresh-token-cookie';
export { default as uploadDocument } from './upload-document';
export { default as uploadFiles } from './upload-files';
