import { Router } from 'express';
import { chatFilesUpload } from '../../middleware/upload.middleware';
import { uploadFile, streamFile, downloadRemoteFile } from '../controllers/upload.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { mediaUploadLimiter } from '../../middleware/rateLimit.middleware';

const router = Router();

router.post('/upload', authenticateToken, mediaUploadLimiter, chatFilesUpload, uploadFile);
router.get('/stream/:filename', authenticateToken, streamFile);
router.get('/download', authenticateToken, downloadRemoteFile);

export default router;
