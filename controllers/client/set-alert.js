import { error } from '@functions';
import { Identity, Alert } from '@models';
import { addMinutes } from 'date-fns';

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

  // Check if there's an existing alert with the same address and type
  const existingAlert = await Alert.findOne({
    'location.address': payload.location.address,
    type: payload.type,
  });

  let result;

  if (existingAlert) {
    // If an alert exists, extend its expiration time by 5 minutes
    existingAlert.expiresAt = addMinutes(existingAlert.expiresAt, 5);
    result = await existingAlert.save();

    identity.xp += 100;
    await identity.save();

    res.status(200).json({ message: 'Alert updated successfully', alert: result });
  } else {
    result = await Alert.create(payload);
    identity.xp += 100;
    await identity.save();

    res.status(201).json({ message: 'Alert set successfully', alert: result });
  }
};
