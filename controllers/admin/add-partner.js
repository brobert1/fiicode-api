import { error } from '@functions';
import { Partner } from '@models';

export default async (req, res) => {
  const { me } = req.user;
  if (!me) {
    throw error(404, 'Missing required params');
  }

  const { name } = req.body;

  const existingPartner = await Partner.findOne({ name });
  if (existingPartner) {
    throw error(400, 'Partner already exists');
  }

  const partner = await Partner.create(req.body);

  res.status(201).json({ message: 'Partner created successfully', partner });
};
