import { error } from '@functions';
import { FriendRequest } from '@models';

export default async (req, res) => {
  const { me } = req.user;
  const { id } = req.params;

  if (!me || !id) {
    throw error(404, 'Missing required params');
  }

  const friendRequest = await FriendRequest.findByIdAndDelete(id);

  return res.json({ message: 'Friend request cancelled', friendRequest });
};
