const { basename, extname } = require('path');
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');
const settings = require('../settings.json');

const s3Client = new S3Client({
  endpoint: `https://${settings.region}.digitaloceanspaces.com`,
  region: settings.region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_ACCESS_SECRET,
  },
  forcePathStyle: false,
});

// Set the folder for the environment
settings.folder = settings.folder[process.env.NODE_ENV] || settings.folder['development'];

// Upload file to AWS or DigitalOcean
const upload = async (key, data, options = {}) => {
  const params = {
    Bucket: settings.bucket,
    Key: `${settings.folder}/${key}`,
    Body: data,
  };

  // Set params for public files
  if (options?.public) {
    params.ACL = 'public-read';
  }

  const command = new PutObjectCommand(params);
  try {
    return {
      response: await s3Client.send(command),
      path: getPublicUrl(key),
    };
  } catch (err) {
    console.error('Error uploading to DigitalOcean', err);
    throw err;
  }
};

// Remove file from AWS or DigitalOcean
const remove = async (key) => {
  const params = {
    Bucket: settings.bucket,
    Key: `${settings.folder}/${key}`,
  };

  const command = new DeleteObjectCommand(params);
  try {
    return await s3Client.send(command);
  } catch (err) {
    console.error('Error removing from DigitalOcean', err);
    throw err;
  }
};

// Create an unique key for the file
const createKey = (filename) => {
  const extension = extname(filename);
  const timestamp = Date.now();
  const normalized = filename.toLowerCase().replaceAll(' ', '-');
  const file = basename(normalized, extension);

  return `${file}-${timestamp}${extension}`;
};

// Get the key from the full path
const getKey = (path) => {
  return basename(path);
};

// Get the public URL of the file
const getPublicUrl = (filename) => {
  return `https://${settings.bucket}.${settings.region}.digitaloceanspaces.com/${settings.folder}/${filename}`;
};

// Download file from AWS or DigitalOcean
const download = async (filename) => {
  const params = {
    Bucket: settings.bucket,
    Key: `${settings.folder}/${filename}`,
  };

  const command = new GetObjectCommand(params);
  try {
    const response = await s3Client.send(command);
    const data = await new Promise((resolve, reject) => {
      const chunks = [];
      response.Body.on('data', (chunk) => chunks.push(chunk));
      response.Body.on('error', (err) => reject(err));
      response.Body.on('end', () => resolve(Buffer.concat(chunks)));
    });
    return data;
  } catch (err) {
    console.error('Error downloading from DigitalOcean', err);
    throw err;
  }
};

const downloadFile = (path) => {
  return download(getKey(path));
};

const aws = {
  createKey,
  download,
  downloadFile,
  getKey,
  getPublicUrl,
  remove,
  upload,
};

module.exports = aws;
