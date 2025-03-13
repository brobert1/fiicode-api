import admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert('./service_key.json'),
});

export default admin;
