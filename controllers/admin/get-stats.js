import { error, getCongestionDescription } from '@functions';
import { Alert } from '@models';

export default async (req, res) => {
  const { me } = req.user;
  if (!me) {
    throw error(404, 'Missing required params');
  }

  const now = new Date();
  const activeAlerts = await Alert.countDocuments({ expiresAt: { $gt: now } });

  const accidentAlerts = await Alert.countDocuments({ type: 'accident' });

  const congestionAlerts = await Alert.countDocuments({ type: 'congestion' });

  const totalAlerts = await Alert.countDocuments();

  const congestionLevel =
    totalAlerts > 0 ? parseFloat((congestionAlerts / totalAlerts) * 100).toFixed(2) : 0;

  const stats = [
    {
      title: 'Active Traffic Alerts',
      value: activeAlerts,
      description: 'Current traffic incidents',
    },
    {
      title: 'Accident Alerts',
      value: accidentAlerts,
      description: 'Alerts indicating accidents',
    },
    {
      title: 'Congestion Level',
      value: `${congestionLevel}%`,
      description: getCongestionDescription(congestionLevel),
    },
  ];

  res.status(201).json(stats);
};
