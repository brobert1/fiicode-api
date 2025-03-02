import { error } from '@functions';
import { Badge } from '@models';

export default async (req, res) => {
  const document = await Badge.find({});

  if (!document) {
    throw error(404, 'Badges not found');
  }

  return res.status(200).json(document);
};
