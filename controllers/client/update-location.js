const { error } = require('@functions');
const { Client } = require('@models');

module.exports = async (req, res) => {
  const { me } = req.user;
  if (!me) {
    throw error(404, 'Missing required params');
  }

  const identity = await Client.findById(me).lean();

  if (!identity) {
    throw error(404, 'The account was not found');
  }

  const { lat, lng } = req.body;
  if (!lat || !lng) {
    throw error(400, 'Missing required params');
  }

  await Client.findByIdAndUpdate(me, { lastLocation: { lat, lng } });

  return res.status(200);
};
