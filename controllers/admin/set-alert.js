import { createNotification, error } from '@functions';
import { Identity, Alert, Notification } from '@models';
const { admin } = require('firebase');

export default async (req, res) => {
  const { me } = req.user;
  if (!me) {
    throw error(404, 'Missing required params');
  }

  const { sendNotification } = req.body;

  const identity = await Identity.findById(me);
  if (!identity) {
    throw error(404, 'Identity not found');
  }

  const payload = {
    ...req.body,
    reportedBy: me,
  };

  const result = await Alert.create(payload);

  if (sendNotification) {
    const notification = createNotification(result.location.address, result.type);
    const notificationPayload = {
      ...notification,
      type: result.type,
      alert: result._id,
    };

    await Notification.create(notificationPayload);

    try {
      const identities = await Identity.find({ 'fcmTokens.0': { $exists: true } });

      if (identities.length > 0) {
        let messages = [];

        identities.forEach((identity) => {
          identity.fcmTokens.forEach((tokenObj) => {
            if (tokenObj.token) {
              messages.push({
                notification: {
                  title: notification.title,
                  body: notification.body,
                },
                token: tokenObj.token,
              });
            }
          });
        });

        if (messages.length > 0) {
          await admin.messaging().sendEach(messages);
        }
      }
    } catch (error) {
      console.error('Error sending push notifications:', error);
    }
  }

  res.status(201).json({ message: 'Alert set successfully', alert: result });
};
