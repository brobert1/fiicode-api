import { error } from '@functions';
import { FriendRequest } from '@models';

export default async (req, res) => {
  const { me } = req.user;
  if (!me) {
    throw error(404, 'Missing required params');
  }

  const received = await FriendRequest.find({ to: me, status: 'pending' }).sort({ createdAt: -1 }).populate('from');
  const sent = await FriendRequest.find({ from: me, status: 'pending' }).sort({ createdAt: -1 }).populate('to');

  res.status(201).json({ received, sent });
};
