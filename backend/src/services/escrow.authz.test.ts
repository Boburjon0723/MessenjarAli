import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../models/postgres/Escrow', () => ({
    EscrowModel: {
        findById: vi.fn(),
    },
}));

vi.mock('../config/database', () => ({
    pool: {
        query: vi.fn(),
    },
}));

import { EscrowModel } from '../models/postgres/Escrow';
import { pool } from '../config/database';
import { EscrowService } from '../services/escrow.service';

describe('EscrowService.assertEscrowActor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('blocks release by non-buyer non-admin', async () => {
        vi.mocked(EscrowModel.findById).mockResolvedValue({
            id: 'e1',
            user_id: 'buyer-1',
            status: 'held',
            amount: 100,
            service_id: 'svc-1',
        } as any);
        vi.mocked(pool.query).mockResolvedValue({ rows: [{ provider_id: 'provider-1' }] } as any);

        await expect(EscrowService.assertEscrowActor('e1', 'stranger-9', 'release', false)).rejects.toThrow(
            /Faqat xaridor/
        );
    });

    it('allows release by buyer', async () => {
        vi.mocked(EscrowModel.findById).mockResolvedValue({
            id: 'e1',
            user_id: 'buyer-1',
            status: 'held',
            amount: 100,
            service_id: 'svc-1',
        } as any);
        vi.mocked(pool.query).mockResolvedValue({ rows: [{ provider_id: 'provider-1' }] } as any);

        const result = await EscrowService.assertEscrowActor('e1', 'buyer-1', 'release', false);
        expect(result.escrow.user_id).toBe('buyer-1');
    });
});
