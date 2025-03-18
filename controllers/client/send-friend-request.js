import { error } from '@functions';
import { Client, FriendRequest, FriendRequestNotification } from '@models';
import admin from 'firebase-admin';

export default async (req, res) => {
  const { me } = req.user;
  const { to } = req.body;

  if (!me || !to) {
    throw error(404, 'Missing required params');
  }

  const identity = await Client.findById(me);
  if (!identity) {
    throw error(404, 'Identity not found');
  }

  const friendRequest = await FriendRequest.create({
    from: me,
    to,
  });

  const targetClient = await Client.findById(to);
  if (targetClient && targetClient.fcmTokens && targetClient.fcmTokens.length > 0) {
    try {
      const notification = await FriendRequestNotification.create({
        title: 'New Friend Request',
        body: `You have received a new friend request from ${identity.name}`,
        friendRequest: friendRequest._id,
      });
      const messages = targetClient.fcmTokens.map((tokenObj) => ({
        notification: {
          title: notification.title,
          body: notification.body,
        },
        token: tokenObj.token,
      }));

      if (messages.length > 0) {
        await admin.messaging().sendEach(messages);
      }
    } catch (error) {
      console.error('Error sending push notifications:', error);
    }
  }

  return res.json({ message: 'Friend request sent successfully', friendRequest });
};
