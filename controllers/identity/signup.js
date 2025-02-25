import { error } from '@functions';
import { sendConfirmationEmail } from '@functions/notify-client';
import { Client, Identity } from '@models';
import jwt from 'jsonwebtoken';

export default async (req, res) => {
  const { email } = req.body;
  const alreadyExists = await Identity.findOne({ email }).lean();
  if (alreadyExists) {
    throw error(400, 'This account already exists');
  }

  // Create a new account
  const document = await Client.create(req.body);
  if (!document) {
    throw error(400, 'Could not create your new account');
  }

  await sendConfirmationEmail({ client: document });

  // Also send the JWT token to authenticate the user
  const { id, name, __t: role } = document;
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
  res.cookie(process.env.JWT_TOKEN_NAME, refreshToken, {
    domain: process.env.COOKIE_DOMAIN,
    httpOnly: true,
    maxAge: oneDay,
    secure: true,
    signed: true,
    sameSite: 'Lax',
  });

  return res.status(200).json({ token, message: 'Account created successful' });
};
