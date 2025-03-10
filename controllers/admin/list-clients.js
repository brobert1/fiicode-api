import { error } from '@functions';
import { Client } from '@models';

export default async (req, res) => {
  const { me } = req.user;
  if (!me) {
    throw error(404, 'Missing required params');
  }

  const clients = await Client.find({}).paginate(req.query);
  if (!clients) {
    throw error(404, 'Resource not found');
  }
  const { page, perPage } = clients.pageParams;
  clients.pages.forEach((document, index) => {
    document.no = (page - 1) * perPage + index + 1;
  });

  return res.status(200).json(clients);
};
