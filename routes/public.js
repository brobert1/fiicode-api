const { Public } = require('../controllers');
const { Router } = require('express');

const router = Router();
module.exports = router;

router.get('/badges', Public.listBadges);
router.get('/alerts', Public.listAlerts);
router.get('/custom-routes', Public.listCustomRoutes);
