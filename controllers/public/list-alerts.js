import { alertsFilters } from '@functions/filters';
import { Alert } from '@models';

export default async (req, res) => {
  const filters = alertsFilters(req.query);
  const alerts = await Alert.find(filters);

  res.status(201).json(alerts);
};
