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
    reportedBy: me,
    type: 'noise',
    noiseLevel: req.body.noiseLevel,
    location: req.body.location,
  };

  const result = await Alert.create(payload);

  identity.xp += 250;
  await identity.save();

  res.status(201).json({ message: 'You have just earned 250 XP', alert: result });
};
