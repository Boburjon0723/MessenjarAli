import type { ChatMessageMetadata } from '@/types/chat-message';

export type PhoneCallMeta = {
    callerId?: string;
    calleeId?: string;
    callType?: 'audio' | 'video';
    status?: 'completed' | 'missed' | 'cancelled';
    durationSeconds?: number;
};

export function parsePhoneCallMeta(metadata: ChatMessageMetadata | string | undefined): PhoneCallMeta {
    if (metadata == null) return {};
    const raw = typeof metadata === 'string' ? (() => { try { return JSON.parse(metadata); } catch { return {}; } })() : metadata;
    return {
        callerId: raw.callerId != null ? String(raw.callerId) : undefined,
        calleeId: raw.calleeId != null ? String(raw.calleeId) : undefined,
        callType: raw.callType === 'video' ? 'video' : 'audio',
        status:
            raw.status === 'completed' || raw.status === 'missed' || raw.status === 'cancelled'
                ? raw.status
                : undefined,
        durationSeconds:
            typeof raw.durationSeconds === 'number' && raw.durationSeconds >= 0
                ? Math.floor(raw.durationSeconds)
                : 0,
    };
}

function formatDuration(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

type TFn = (key: string) => string;

/** Telegram uslubida: yo'nalish va holat foydalanuvchiga qarab */
export function formatPhoneCallLabel(
    meta: PhoneCallMeta,
    isCaller: boolean,
    t: TFn
): string {
    const isVideo = meta.callType === 'video';
    const status = meta.status ?? 'completed';
    const dur =
        status === 'completed' && meta.durationSeconds && meta.durationSeconds > 0
            ? ` (${formatDuration(meta.durationSeconds)})`
            : '';

    if (status === 'completed') {
        if (isCaller) {
            return (isVideo ? t('call_log_outgoing_video') : t('call_log_outgoing')) + dur;
        }
        return (isVideo ? t('call_log_incoming_video') : t('call_log_incoming')) + dur;
    }

    if (status === 'missed') {
        if (isCaller) {
            return isVideo ? t('call_log_cancelled_video') : t('call_log_cancelled');
        }
        return isVideo ? t('call_log_missed_video') : t('call_log_missed');
    }

    if (isCaller) {
        return isVideo ? t('call_log_cancelled_video') : t('call_log_cancelled');
    }
    return isVideo ? t('call_log_missed_video') : t('call_log_missed');
}
