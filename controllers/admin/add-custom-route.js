import { error } from '@functions';
import { CustomRoute } from '@models';

export default async (req, res) => {
  const { me } = req.user;
  if (!me) {
    throw error(404, 'Missing required params');
  }

  const customRoute = await CustomRoute.create(req.body);

  res.status(201).json({ message: 'Custom route added successfully', customRoute });
};
