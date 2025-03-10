import { Admin } from '@controllers';
import { Router } from 'express';
import { middleware } from 'express-goodies';

const router = Router();
export default router;

// Protect all client routes
router.all('/admin', middleware.authenticate, middleware.authorize('admin'));
router.all('/admin/*', middleware.authenticate, middleware.authorize('admin'));

router.get('/admin/partners', Admin.listPartners);
router.post('/admin/partners', Admin.addPartner);


router.get('/admin/clients', Admin.listClients);
