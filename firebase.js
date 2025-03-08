var admin = require('firebase-admin');
var serviceAccount = require('./service_key.json');

// Initialize the Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Export the admin instance directly
module.exports = { admin };
