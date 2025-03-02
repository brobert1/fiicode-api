import { error } from '@functions';
import { Identity } from '@models';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export default async (req, res) => {
  if (!req.user?.me) {
    throw error(404, 'Missing required params');
  }

  const { changePassword, confirmPassword } = req.body;
  if (!changePassword || !confirmPassword) {
    throw error(400, 'Missing required params');
  }

  if (changePassword !== confirmPassword) {
    throw error(400, 'Passwords do not match');
  }

  const document = await Identity.findById(req.user.me);
  if (!document) {
    throw error(500, 'Account not found');
  }

  await document.updateOne({ password: bcrypt.hashSync(changePassword) });

  // Generate new tokens
  const { _id, email: identityEmail, name: identityName, image, __t: role } = document.toObject();

  const jwtPayload = {
    email: identityEmail,
    me: _id,
    name: identityName,
    image: image?.path,
    role,
  };

  const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
    expiresIn: '15m',
    algorithm: 'HS256',
  });

  const refreshToken = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
    expiresIn: '12h',
    algorithm: 'HS256',
  });

  const oneDay = 24 * 3600 * 1000;
  res.cookie(process.env.JWT_TOKEN_NAME, refreshToken, {
    domain: process.env.COOKIE_DOMAIN,
    httpOnly: true,
    maxAge: oneDay,
    secure: process.env.NODE_ENV === 'production',
    signed: true,
    sameSite: 'lax',
  });

  return res.status(200).json({
    token,
    message: 'Password was changed successfully',
  });
};
