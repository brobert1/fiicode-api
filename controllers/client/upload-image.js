const { error, uploadFiles } = require('@functions');
const { cleanupFiles } = require('@functions/cleanup-files');
const { Identity } = require('@models');
const { getKey } = require('@plugins/aws/src');

module.exports = async (req, res) => {
  const { me } = req.user;
  if (!me) {
    throw error(404, 'Missing required params');
  }

  const identity = await Identity.findById(me).lean();
  if (!identity) {
    throw error(404, 'The account was not found.');
  }
  const keys = [];
  const previousImagePath = identity?.image?.path;
  const updatedImageFromFiles = req.files?.image;

  let updatedImage = null;

  if (updatedImageFromFiles) {
    if (previousImagePath) {
      await cleanupFiles([getKey(previousImagePath)]);
    }
    [updatedImage] = await uploadFiles([updatedImageFromFiles], keys);
  } else if (previousImagePath) {
    await cleanupFiles([getKey(previousImagePath)]);
  }

  await Identity.findByIdAndUpdate(me, { image: updatedImage || null });

  res.status(200).json({ message: 'Image uploaded successfully.' });
};
