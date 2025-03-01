const { remove, getKey } = require('../plugins/aws/src');

/**
 * Removes files from AWS storage
 *
 * @param {Array} keys Array of AWS keys for the files to be removed
 */
async function cleanupFiles(keys) {
  for (const key of keys) {
    // Remove each file using its AWS key
    await remove(key);
  }
}
async function cleanupFileFromPath(path) {
  await remove(getKey(path));
}

module.exports = { cleanupFiles, cleanupFileFromPath };
