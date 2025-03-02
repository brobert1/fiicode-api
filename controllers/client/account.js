import { error } from '@functions';
import { Identity } from '@models';

export default async (req, res) => {
  const { me } = req.user;
  if (!me) {
    throw error(404, 'Missing required params');
  }

  const document = await Identity.findOne({ _id: me });

  if (!document) {
    throw error(404, 'Account not found');
  }

  return res.status(200).json(document);
};
