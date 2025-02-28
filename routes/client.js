import { Client } from '@controllers';
import { Router } from 'express';
import { middleware } from 'express-goodies';

const router = Router();
export default router;

// Protect all client routes
router.all('/client', middleware.authenticate, middleware.authorize('client'));
router.all('/client/*', middleware.authenticate, middleware.authorize('client'));

router.post('/client/add-preferences', Client.addPreferences);
