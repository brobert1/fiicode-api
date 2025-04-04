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

// Favourite Places
router.post('/client/add-favourite-place', Client.addFavouritePlace);
router.get('/client/favourite-places', Client.getFavouritePlaces);
router.put('/client/remove-favourite-place', Client.removeFavouritePlace);

// Notifications
router.get('/client/notifications', Client.listNotifications);

// Identities
router.get('/client/identities', Client.listIdentities);

// Friend Requests
router.get('/client/friend-requests', Client.listFriendRequests);
router.post('/client/send-friend-request', Client.sendFriendRequest);
router.put('/client/approve-friend-request/:id', Client.approveFriendRequest);
router.delete('/client/reject-friend-request/:id', Client.rejectFriendRequest);
router.delete('/client/cancel-friend-request/:id', Client.cancelFriendRequest);

// Friends
router.get('/client/friends', Client.listFriends);

// Location
router.put('/client/update-location', Client.updateLocation);

// Chat - Conversations
router.get('/client/conversations', Client.listConversations);
router.post('/client/conversations', Client.createConversation);
router.put('/client/conversations/:conversationId/read', Client.markConversationRead);

// Chat - Messages
router.get('/client/conversations/:conversationId/messages', Client.getMessages);
router.post('/client/messages', Client.sendMessage);
