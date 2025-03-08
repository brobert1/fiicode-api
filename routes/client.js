import { Client } from '@controllers';
import { Router } from 'express';
import { middleware } from 'express-goodies';

const router = Router();
export default router;

// Protect all client routes
router.all('/client', middleware.authenticate, middleware.authorize('client'));
router.all('/client/*', middleware.authenticate, middleware.authorize('client'));

// Preferences
router.post('/client/add-preferences', Client.addPreferences);

// Account
router.get('/client/account', Client.account);
router.put('/client/account/image', Client.uploadImage);
router.delete('/client/account/image', Client.removeImage);
router.put('/client/account', Client.updateAccount);
router.delete('/client/remove', Client.removeAccount);
router.post('/client/change-password', Client.changePassword);

// Partners
router.get('/client/partners', Client.listPartners);

// Alerts
router.post('/client/set-alert', Client.setAlert);
router.get('/client/alerts', Client.listAlerts);

// FCM Token
router.put('/client/set-fcm-token', Client.setFCMToken);
