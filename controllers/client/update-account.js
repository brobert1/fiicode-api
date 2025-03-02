const { error } = require('@functions');
const { Identity } = require('@models');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  const { me } = req.user;
  if (!me) {
    throw error(404, 'Missing required params');
  }

  const identity = await Identity.findById(me).lean();
  if (!identity) {
    throw error(404, 'The account was not found');
  }
  const { __t: role, image } = identity;

  const { email, name } = req.body;
  if (!email || !name) {
    throw error(400, 'Name and email are required');
  }

  await Identity.findByIdAndUpdate(me, { email, name });
  // The JWT public data payload
  const payload = { name, email, role, me, image: { path: image?.path } };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '15m',
    algorithm: 'HS256',
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '12h',
    algorithm: 'HS256',
  });

  // Set refresh token as cookie
  const oneDay = 24 * 3600 * 1000;
  res.cookie(process.env.JWT_TOKEN_NAME, refreshToken, {
    domain: process.env.COOKIE_DOMAIN,
    httpOnly: true,
    maxAge: oneDay,
    secure: process.env.NODE_ENV === 'production',
    signed: true,
    sameSite: 'lax',
  });

  return res.status(200).json({ token, message: 'Profile was updated successfully' });
};
