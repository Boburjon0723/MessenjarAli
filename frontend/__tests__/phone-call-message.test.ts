import { describe, expect, it } from 'vitest';
import { formatPhoneCallLabel, parsePhoneCallMeta } from '@/lib/phone-call-message';

const t = (key: string) => key;

describe('phone-call-message', () => {
    it('parses metadata', () => {
        expect(
            parsePhoneCallMeta({
                callerId: 'a',
                status: 'completed',
                callType: 'video',
                durationSeconds: 154,
            })
        ).toMatchObject({ status: 'completed', callType: 'video', durationSeconds: 154 });
    });

    it('formats outgoing completed call with duration', () => {
        const label = formatPhoneCallLabel(
            { status: 'completed', callType: 'audio', durationSeconds: 154 },
            true,
            t
        );
        expect(label).toBe('call_log_outgoing (2:34)');
    });

    it('formats missed call for callee', () => {
        const label = formatPhoneCallLabel({ status: 'missed', callType: 'audio' }, false, t);
        expect(label).toBe('call_log_missed');
    });

    it('formats cancelled call for caller', () => {
        const label = formatPhoneCallLabel({ status: 'missed', callType: 'audio' }, true, t);
        expect(label).toBe('call_log_cancelled');
    });
});
