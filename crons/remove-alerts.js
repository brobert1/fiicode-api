/* eslint-disable no-console */
const { Alert } = require('../models');
const { CronJob } = require('cron');

function removeAlerts() {
  const handleCron = async () => {
    try {
      const now = new Date();

      const result = await Alert.deleteMany({ expiresAt: { $lt: now } });

      if (result.deletedCount) {
        console.log(`Removed ${result.deletedCount} expired alerts.`);
      }
    } catch (err) {
      console.error('Error while removing alerts:', err);
    }
  };

  const job = new CronJob(
    '* * * * *', // runs every minute
    handleCron,
    null,
    true,
    'Europe/Bucharest'
  );

  return job;
}

module.exports = removeAlerts;
