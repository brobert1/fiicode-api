import { Document } from '@controllers';
import { diacriticInsensitive } from '@middleware';
import { Router } from 'express';

const router = Router();

router.get('/admin/documents', diacriticInsensitive(['search']), Document.listDocuments);
router.post('/admin/documents', Document.addDocuments);
router.delete('/admin/documents/:id', Document.deleteDocument);

export default router;
