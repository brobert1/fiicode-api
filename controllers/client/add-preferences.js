import { error } from '@functions';
import { Preference, Identity } from '@models';

export default async (req, res) => {
  const { me } = req.user;
  if (!me) {
    throw error(404, 'Missing required params');
  }

  // Query the identity that has _id equal to me
  const identity = await Identity.findById(me);
  if (!identity) {
    throw error(404, 'Identity not found');
  }

  // Check if preferences already exist for the user
  const existingPreferences = await Preference.findOne({ identity: me });
  if (existingPreferences) {
    throw error(400, 'You have already set your preferences');
  }

  const payload = {
    ...req.body,
    identity: me,
  };

  const result = await Preference.create(payload);
  if (!result) {
    throw error(400, 'Could not save the preferences');
  }

  // Update the identity's hasPreferences property to true
  identity.hasPreferences = true;
  await identity.save();

  res.status(201).json({ message: 'Preferences set successfully', preferences: result });
};
