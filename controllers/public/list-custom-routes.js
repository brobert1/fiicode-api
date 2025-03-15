import { CustomRoute } from '@models';

export default async (req, res) => {
  const routes = await CustomRoute.find({});

  res.status(200).json(routes);
};
