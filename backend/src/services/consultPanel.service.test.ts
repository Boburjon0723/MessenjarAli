import { describe, expect, it } from 'vitest';

/** Minimal smoke: service module loads without circular import crashes at test time via dynamic shape check */
describe('consultPanel.service contract', () => {
    it('exports expected function names', async () => {
        const mod = await import('../services/consultPanel.service');
        expect(typeof mod.sendConsultPanelInvite).toBe('function');
        expect(typeof mod.sendLessonStartNotify).toBe('function');
    });
});
