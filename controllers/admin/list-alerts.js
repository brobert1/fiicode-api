import { Alert } from '@models';

export default async (req, res) => {
  const alerts = await Alert.find({}).paginate(req.query);

  const { page, perPage } = alerts.pageParams;
  alerts.pages.forEach((document, index) => {
    document.no = (page - 1) * perPage + index + 1;
  });

  res.status(201).json(alerts);
};
