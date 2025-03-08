import { error } from '@functions';
import { Identity } from '@models';

export default async (req, res) => {
  const { me } = req.user;
  const { fcmToken, device } = req.body;
  if (!me) {
    throw error(404, 'Missing required params');
  }

  // Query the identity that has _id equal to me
  const identity = await Identity.findById(me);
  if (!identity) {
    throw error(404, 'Client not found');
  }

  identity.fcmTokens.push({ token: fcmToken, device });
  await identity.save();

  res.status(201).json({ message: 'Notifications enabled' });
};
