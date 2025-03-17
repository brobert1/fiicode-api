import { error } from '@functions';
import { AlertNotification, FriendRequestNotification } from '@models';

export default async (req, res) => {
  const { me } = req.user;
  if (!me) {
    throw error(404, 'Missing required params');
  }

  const alertNotifications = await AlertNotification.find({}).sort({ createdAt: -1 });

  const friendRequestNotifications = await FriendRequestNotification.find()
    .populate('friendRequest')
    .sort({ createdAt: -1 });

  const filteredFriendRequestNotifications = friendRequestNotifications.filter((notification) =>
    notification.friendRequest?.to?.equals(me)
  );

  const notifications = [
    ...alertNotifications.map((notification) => ({
      ...notification.toObject(),
      __t: 'alertNotification',
    })),
    ...filteredFriendRequestNotifications.map((notification) => ({
      ...notification.toObject(),
      __t: 'friendRequestNotification',
    })),
  ].sort((a, b) => b.createdAt - a.createdAt);

  res.status(201).json(notifications);
};
