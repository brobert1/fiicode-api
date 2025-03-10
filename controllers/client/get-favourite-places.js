import { error } from '@functions';
import { Client } from '@models';

export default async (req, res) => {
  const { me } = req.user;

  if (!me) {
    throw error(404, 'Missing required params');
  }

  const identity = await Client.findById(me);
  if (!identity) {
    throw error(404, 'Identity not found');
  }

  const favouritePlaces = identity.favouritePlaces;

  return res.json(favouritePlaces);
};
