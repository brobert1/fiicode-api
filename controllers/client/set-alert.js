import { error } from '@functions';
import { Identity, Alert } from '@models';

export default async (req, res) => {
  const { me } = req.user;
  if (!me) {
    throw error(404, 'Missing required params');
  }

  const identity = await Identity.findById(me);
  if (!identity) {
    throw error(404, 'Identity not found');
  }

  const payload = {
    ...req.body,
    reportedBy: me,
  };

  // Create a new alert regardless of duplicates
  const result = await Alert.create(payload);

  identity.xp += 100;
  await identity.save();

  res.status(201).json({ message: 'Alert set successfully', alert: result });
};
