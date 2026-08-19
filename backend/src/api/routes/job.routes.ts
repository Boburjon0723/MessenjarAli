import { Router } from 'express';
import { JobController } from '../controllers/job.controller';
import { authenticateToken, requireAdmin } from '../../middleware/auth.middleware';
import { cacheMiddleware } from '../../middleware/cache.middleware';

const router = Router();
const jobController = new JobController();

router.get('/', cacheMiddleware(120), jobController.getJobs);
router.get('/mine', authenticateToken, jobController.getMyJobs);
router.patch('/:id/status', authenticateToken, jobController.updateJobStatus);
router.get('/categories', cacheMiddleware(600), jobController.getCategories);
router.post('/', authenticateToken, jobController.createJob);
router.post('/categories', authenticateToken, requireAdmin, jobController.createCategory);

export default router;
