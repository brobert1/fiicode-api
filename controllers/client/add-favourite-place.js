import { error } from '@functions';
import { Client } from '@models';

export default async (req, res) => {
  const { me } = req.user;
  const { latitude, longitude, address } = req.body;

  if (!me) {
    throw error(404, 'Missing required params');
  }

  const identity = await Client.findById(me);
  if (!identity) {
    throw error(404, 'Identity not found');
  }

  const newFavouritePlace = {
    latitude,
    longitude,
    address,
  };

  await Client.findByIdAndUpdate(
    me,
    {
      $push: {
        favouritePlaces: newFavouritePlace,
      },
    },
    { new: true }
  );

  return res.json({ message: 'Favourite place added successfully' });
};
