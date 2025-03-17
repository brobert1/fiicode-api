import { error } from '@functions';
import { FriendRequest } from '@models';

export default async (req, res) => {
  const { me } = req.user;
  if (!me) {
    throw error(404, 'Missing required params');
  }

  const friendRequests = await FriendRequest.find({ to: me, status: 'pending' }).populate('from');

  res.status(201).json(friendRequests);
};
