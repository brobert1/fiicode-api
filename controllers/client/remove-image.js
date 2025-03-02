const { error } = require('@functions');
const { cleanupFileFromPath } = require('@functions/cleanup-files');
const { Identity } = require('@models');

module.exports = async (req, res) => {
  const { me } = req.user;
  if (!me) {
    throw error(404, 'Missing required params');
  }

  const identity = await Identity.findById(me).lean();
  if (!identity) {
    throw error(404, 'The account was not found.');
  }

  if (identity?.image?.path) {
    await cleanupFileFromPath(identity.image.path);
  }

  await Identity.findByIdAndUpdate(me, { image: null });

  res.status(200).json({ message: 'Image removed successfully.' });
};
