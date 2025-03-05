import { error } from '@functions';
import { Partner } from '@models';

export default async (req, res) => {
  const { me } = req.user;
  if (!me) {
    throw error(404, 'Missing required params');
  }

  const partners = await Partner.find({}).paginate(req.query);

  res.status(201).json(partners);
};
