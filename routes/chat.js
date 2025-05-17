import { Chat } from '@controllers';
import { Router } from 'express';

const router = Router();

router.post('/client/chat/chat-rag', Chat.chatRag);

export default router;
