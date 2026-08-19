import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../config/database', () => ({
    pool: {
        query: vi.fn(),
    },
}));

import { pool } from '../config/database';
import {
    getConsultPanelAccess,
    newInviteToken,
} from './panelInvite.service';

describe('panelInvite.service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('newInviteToken returns UUID format', () => {
        const token = newInviteToken();
        expect(token).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
    });

    it('getConsultPanelAccess returns not_found when chat missing', async () => {
        vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] } as never);
        const result = await getConsultPanelAccess('chat-1', 'user-1');
        expect(result).toEqual({ allowed: false, reason: 'not_found' });
    });

    it('getConsultPanelAccess returns not_participant when user not in chat', async () => {
        vi.mocked(pool.query)
            .mockResolvedValueOnce({ rows: [{ id: 'chat-1', type: 'private' }] } as never)
            .mockResolvedValueOnce({ rowCount: 0, rows: [] } as never);
        const result = await getConsultPanelAccess('chat-1', 'user-1');
        expect(result).toEqual({ allowed: false, reason: 'not_participant' });
    });

    it('getConsultPanelAccess blocks completed sessions', async () => {
        vi.mocked(pool.query)
            .mockResolvedValueOnce({ rows: [{ id: 'chat-1', type: 'private' }] } as never)
            .mockResolvedValueOnce({ rowCount: 1, rows: [{}] } as never)
            .mockResolvedValueOnce({ rows: [{ status: 'completed' }] } as never);
        const result = await getConsultPanelAccess('chat-1', 'user-1');
        expect(result).toEqual({
            allowed: false,
            reason: 'closed',
            sessionStatus: 'completed',
        });
    });

    it('getConsultPanelAccess allows ongoing sessions', async () => {
        vi.mocked(pool.query)
            .mockResolvedValueOnce({ rows: [{ id: 'chat-1', type: 'private' }] } as never)
            .mockResolvedValueOnce({ rowCount: 1, rows: [{}] } as never)
            .mockResolvedValueOnce({ rows: [{ status: 'ongoing' }] } as never);
        const result = await getConsultPanelAccess('chat-1', 'user-1');
        expect(result).toEqual({
            allowed: true,
            sessionStatus: 'ongoing',
        });
    });

    it('getConsultPanelAccess allows active invite when no session', async () => {
        vi.mocked(pool.query)
            .mockResolvedValueOnce({ rows: [{ id: 'chat-1', type: 'private' }] } as never)
            .mockResolvedValueOnce({ rowCount: 1, rows: [{}] } as never)
            .mockResolvedValueOnce({ rows: [] } as never)
            .mockResolvedValueOnce({ rowCount: 1, rows: [{}] } as never);
        const result = await getConsultPanelAccess('chat-1', 'user-1');
        expect(result).toEqual({
            allowed: true,
            sessionStatus: null,
        });
    });

    it('getConsultPanelAccess returns expired when no session or invite', async () => {
        vi.mocked(pool.query)
            .mockResolvedValueOnce({ rows: [{ id: 'chat-1', type: 'private' }] } as never)
            .mockResolvedValueOnce({ rowCount: 1, rows: [{}] } as never)
            .mockResolvedValueOnce({ rows: [] } as never)
            .mockResolvedValueOnce({ rowCount: 0, rows: [] } as never);
        const result = await getConsultPanelAccess('chat-1', 'user-1');
        expect(result).toEqual({
            allowed: false,
            reason: 'expired',
            sessionStatus: null,
        });
    });
});
