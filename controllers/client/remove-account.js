import { error } from '@functions';
import { Identity, Preference } from '@models';

export default async (req, res) => {
  const { me } = req.user;

  if (!me) {
    throw error(404, 'Missing required params');
  }

  const preference = await Preference.findOne({ identity: me });
  if (preference) {
    await Preference.findByIdAndDelete(preference._id);
  }

  await Identity.findByIdAndDelete(me);

  return res.status(200).json({ message: 'Account deleted successfully' });
};
