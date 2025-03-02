const { createKey } = require('@plugins/aws/src');
const uploadDocument = require('./upload-document');

/**
 * Processes and uploads files to AWS
 *
 * @param {Object} fileObjects Object containing file data
 * @param {Array} awsKeys Array to store AWS keys of the uploaded files
 * @returns {Promise<Object>} An object with data about the uploaded files
 */
async function uploadFiles(fileObjects, awsKeys) {
  const uploadedFiles = [];

  for (const field in fileObjects) {
    if (fileObjects[field]) {
      // Create an AWS key for the file and upload it
      const key = createKey(fileObjects[field].name);
      const fileData = {
        name: fileObjects[field].name,
        size: fileObjects[field].size,
        ...(await uploadDocument(fileObjects[field], key)),
      };

      uploadedFiles.push(fileData);
      awsKeys.push(key); // store the AWS key
    }
  }

  return uploadedFiles;
}

module.exports = uploadFiles;
