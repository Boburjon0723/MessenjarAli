import { Router } from 'express';
import { upload } from '../../middleware/upload.middleware';
import { uploadFile, streamFile } from '../controllers/upload.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

router.post('/upload', authenticateToken, upload.array('files', 10), uploadFile);
router.get('/stream/:filename', authenticateToken, streamFile);

export default router;
