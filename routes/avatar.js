import { Avatar } from '@controllers';
import { Router } from 'express';

const router = Router();

router.post('/client/avatar/get-access-token', Avatar.getAccessToken);

export default router;
