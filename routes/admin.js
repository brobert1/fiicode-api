import { Admin } from '@controllers';
import { Router } from 'express';
import { middleware } from 'express-goodies';

const router = Router();
export default router;

// Protect all client routes
router.all('/admin', middleware.authenticate, middleware.authorize('admin'));
router.all('/admin/*', middleware.authenticate, middleware.authorize('admin'));

// Partners
router.get('/admin/partners', Admin.listPartners);
router.post('/admin/partners', Admin.addPartner);

// Clients
router.get('/admin/clients', Admin.listClients);

// Alerts
router.get('/admin/alerts', Admin.listAlerts);
router.post('/admin/set-alert', Admin.setAlert);
router.delete('/admin/alerts/:id', Admin.deleteAlert);

// Stats
router.get('/admin/stats', Admin.getStats);

// Custom Routes
router.post('/admin/custom-routes', Admin.addCustomRoute);
