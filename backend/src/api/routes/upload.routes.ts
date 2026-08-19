import { Router } from 'express';
import { uploadMaterial, getSessionMaterials } from '../controllers/upload.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { sessionMaterialUpload } from '../../middleware/upload.middleware';

const router = Router();

router.post('/sessions/:sessionId/materials', authenticateToken, sessionMaterialUpload, uploadMaterial);
router.get('/sessions/:sessionId/materials', authenticateToken, getSessionMaterials);

export default router;
