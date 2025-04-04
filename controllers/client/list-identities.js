import { error } from '@functions';
import { identitiesFilters } from '@functions/filters';
import { Client, FriendRequest } from '@models';

export default async (req, res) => {
  const { me } = req.user;
  if (!me) {
    throw error(404, 'Missing required params');
  }

  const identity = await Client.findById(me);
  if (!identity) {
    throw error(404, 'Identity not found');
  }

  // Find all identities with existing friend requests (either sent by me or received by me)
  const friendRequests = await FriendRequest.find({
    $or: [{ from: me }, { to: me }]
  });

  // Extract the IDs of identities with friend requests
  const identitiesWithFriendRequests = friendRequests.map(request =>
    request.from.toString() === me.toString() ? request.to : request.from
  );

  const filter = identitiesFilters(req.query);
  const identities = await Client.find({
    _id: {
      $ne: me,
      $nin: [...(identity.friends || []), ...identitiesWithFriendRequests] // Exclude friends and identities with friend requests
    },
    ...filter
  });

  const identitiesWithFriendRequestStatus = await Promise.all(
    identities.map(async (identity) => {
      const friendRequest = await FriendRequest.findOne({
        from: me,
        to: identity._id,
      });

      return {
        ...identity.toObject(),
        friendRequestStatus: friendRequest ? friendRequest.status : null,
      };
    })
  );

  // Sort identities so that those with a friendRequestStatus come first.
  identitiesWithFriendRequestStatus.sort((a, b) => {
    const aValue = a.friendRequestStatus ? 1 : 0;
    const bValue = b.friendRequestStatus ? 1 : 0;
    return bValue - aValue;
  });

  res.status(201).json(identitiesWithFriendRequestStatus);
};