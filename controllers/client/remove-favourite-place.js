import { error } from '@functions';
import { Client } from '@models';

export default async (req, res) => {
  const { me } = req.user;
  const { _id } = req.body;

  if (!me) {
    throw error(404, 'Missing required params');
  }

  const identity = await Client.findById(me);
  if (!identity) {
    throw error(404, 'Identity not found');
  }

  await Client.findByIdAndUpdate(
    me,
    {
      $pull: {
        favouritePlaces: { _id },
      },
    },
    { new: true }
  );

  return res.json({ message: 'Favourite place removed successfully' });
};
