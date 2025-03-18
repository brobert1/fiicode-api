import { error } from '@functions';
import { Client } from '@models';

export default async (req, res) => {
  const { me } = req.user;
  if (!me) {
    throw error(404, 'Missing required params');
  }

  const identity = await Client.findById(me).populate('friends');
  if (!identity) {
    throw error(404, 'Identity not found');
  }

  res.status(201).json(identity.friends);
};
