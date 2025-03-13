import { error } from '@functions';
import { Alert } from '@models';

export default async (req, res) => {
  const { me } = req.user;
  if (!me) {
    throw error(404, 'Missing required params');
  }

  await Alert.findByIdAndDelete(req.params.id);

  res.status(201).json({ message: 'Alert deleted successfully' });
};
