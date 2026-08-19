import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../config/database', () => ({
    pool: {
        query: vi.fn(),
    },
}));

import { pool } from '../../config/database';
import { JobModel } from './Job';

describe('JobModel.updateStatusForOwner', () => {
    const jobModel = new JobModel();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('updates status when job belongs to owner', async () => {
        vi.mocked(pool.query).mockResolvedValueOnce({
            rows: [{ id: 'job-1', user_id: 'user-1', status: 'closed' }],
        } as never);

        const result = await jobModel.updateStatusForOwner('job-1', 'user-1', 'closed');

        expect(result).toEqual({ id: 'job-1', user_id: 'user-1', status: 'closed' });
        expect(pool.query).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE jobs'),
            ['job-1', 'user-1', 'closed']
        );
    });

    it('returns null when job not found or not owned', async () => {
        vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] } as never);

        const result = await jobModel.updateStatusForOwner('job-1', 'other-user', 'closed');

        expect(result).toBeNull();
    });
});
