/* eslint-disable no-console */
const { Alert, Identity } = require('@models');
const { CronJob } = require('cron');
const { admin } = require('firebase');

function notifyAlert() {
  const handleCron = async () => {
    try {
      // Find all alerts (not just congestion type)
      const alerts = await Alert.find({});

      if (alerts.length > 0) {
        console.log(`Found ${alerts.length} alert(s). Checking for clusters...`);

        // Group alerts by type and location.address
        const alertGroups = {};

        alerts.forEach(alert => {
          // Skip alerts without location.address
          if (!alert.location || !alert.location.address) return;

          const key = `${alert.type}:${alert.location.address}`;
          if (!alertGroups[key]) {
            alertGroups[key] = {
              type: alert.type,
              address: alert.location.address,
              alerts: []
            };
          }
          alertGroups[key].alerts.push(alert);
        });

        // Filter groups with more than 3 alerts
        const significantClusters = Object.values(alertGroups).filter(
          group => group.alerts.length > 3
        );

        if (significantClusters.length > 0) {
          console.log(`Found ${significantClusters.length} significant alert cluster(s). Preparing to send notifications...`);

          // Retrieve all identities with a stored fcmToken
          const identities = await Identity.find({ fcmToken: { $exists: true, $ne: null } });
          const tokens = identities.map((identity) => identity.fcmToken).filter(Boolean);

          if (tokens.length > 0) {
            // Create notification messages for each significant cluster
            let allMessages = [];

            significantClusters.forEach(cluster => {
              const clusterMessages = tokens.map((token) => ({
                notification: {
                  title: `${cluster.type.charAt(0).toUpperCase() + cluster.type.slice(1)} Alert`,
                  body: `Multiple ${cluster.type} alerts reported at ${cluster.address}`,
                },
                token,
              }));

              allMessages = [...allMessages, ...clusterMessages];
            });

            // Send notifications using sendEach
            const response = await admin.messaging().sendEach(allMessages);
            console.log('Notifications sent. FCM response:', response);
          } else {
            console.log('No identities with valid FCM tokens found.');
          }
        } else {
          console.log('No significant alert clusters found (need more than 3 alerts of same type at same location).');
        }
      } else {
        console.log('No alerts found.');
      }
    } catch (error) {
      console.error('Error executing cron job:', error);
    }
  };

  // Create a cron job that runs every minute in the Europe/Bucharest timezone
  const job = new CronJob(
    '* * * * *', // every minute
    handleCron,
    null,
    true,
    'Europe/Bucharest'
  );

  return job;
}

module.exports = notifyAlert;
