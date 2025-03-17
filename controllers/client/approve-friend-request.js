import { error } from '@functions';
import { Client, FriendRequest } from '@models';

export default async (req, res) => {
  const { me } = req.user;
  const { id } = req.params;

  if (!me || !id) {
    throw error(404, 'Missing required params');
  }

  const identity = await Client.findById(me);
  if (!identity) {
    throw error(404, 'Identity not found');
  }

  const friendRequest = await FriendRequest.findById(id);
  if (!friendRequest) {
    throw error(404, 'Friend request not found');
  }

  friendRequest.status = 'approved';
  await friendRequest.save();

  const targetClient = await Client.findById(friendRequest.from);
  if (targetClient) {
    targetClient.friends.push(me);
    await targetClient.save();
  }

  identity.friends.push(friendRequest.from);
  await identity.save();

  return res.json({ message: 'Friend request approved successfully', friendRequest });
};
