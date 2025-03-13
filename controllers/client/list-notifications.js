import { error } from '@functions';
import { Notification } from '@models';

export default async (req, res) => {
  const { me } = req.user;
  if (!me) {
    throw error(404, 'Missing required params');
  }

  const notifications = await Notification.find({}).sort({ createdAt: -1 });

  res.status(201).json(notifications);
};
