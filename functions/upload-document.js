const { error } = require('express-goodies/functions');
const { upload } = require('../plugins/aws/src/index');
const { validExtensions } = require('constants/extensions');

/**
 * Validates the file to ensure it meets the requirements
 *
 * @param {File} file The file to validate
 * @throws Will throw an error if the file is invalid
 */
const validateFile = async (file) => {
  const path = require('path');
  const extension = path.extname(file.name).toLowerCase(); // convert to lower case to ensure consistency

  // Check if the file extension is valid
  if (!validExtensions.includes(extension)) {
    throw new Error('Error! The file cannot have this extension.');
  }

  // Check if the file size is valid
  const MAX_LIMIT = 30;
  if (file.size > MAX_LIMIT * 1024 * 1024) {
    throw new Error(`Error! The chosen file can only have up to ${MAX_LIMIT}MB`);
  }
};

/**
 * Uploads a document to AWS
 *
 * @param {File} file The file to upload
 * @param {string} key The key to use for the file
 * @returns {Promise<Object>} An object containing the path of the uploaded file
 * @throws Will throw an error if the file is invalid or if the upload fails
 */
const uploadDocument = async (file, key) => {
  // Validate the file
  await validateFile(file);

  // Upload the file to AWS
  const { response, path } = await upload(key, file.data, { public: true });
  if (response.$metadata.httpStatusCode == 200) {
    return { path };
  } else {
    throw error(400, 'Error! The file could not be uploaded.');
  }
};

module.exports = uploadDocument;
