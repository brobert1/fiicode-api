const jwt = require('jsonwebtoken');
const { error } = require('../../functions');
const { Identity, Client } = require('../../models');

module.exports = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw error(400, 'Missing required params');
  }

  let identity = await Identity.findOne({ email });
  if (!identity) {
    try {
      identity = await Client.create({
        name: 'test',
        email,
        active: true,
        confirmed: true,
      });
    } catch (error) {
      console.error('Error making POST request:', error);
    }
  }

  // the JWT public data payload
  const { name, id, __t: role } = identity;

  const payload = { name, email, role, me: id };

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
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie(process.env.JWT_TOKEN_NAME, refreshToken, {
    domain: process.env.COOKIE_DOMAIN,
    httpOnly: true,
    maxAge: oneDay,
    secure: isProduction,
    signed: true,
    sameSite: 'Lax',
  });

  // Add last login information to the current user
  await identity.updateOne({ lastLoginAt: Date.now() });

  return res.status(200).json({ token, message: 'Authentication successful' });
};
