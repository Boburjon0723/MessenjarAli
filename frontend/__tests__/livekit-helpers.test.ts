import { describe, expect, it } from 'vitest';

/** Frontend LiveKit token so‘rovi URL qurish (Dashboard / RoomAccessGate bilan bir xil shakl). */
function buildLiveKitTokenUrl(apiBase: string, roomId: string): string {
    const base = apiBase.replace(/\/$/, '');
    return `${base}/api/livekit/token?room=${encodeURIComponent(roomId)}`;
}

function isLiveKitWsUrl(url: string): boolean {
    return /^wss:\/\//i.test(url.trim()) || /^ws:\/\//i.test(url.trim());
}

describe('livekit client helpers', () => {
    it('builds authenticated token endpoint URL', () => {
        expect(
            buildLiveKitTokenUrl(
                'https://messenjarali-production.up.railway.app',
                'consult-lobby-user-1'
            )
        ).toBe(
            'https://messenjarali-production.up.railway.app/api/livekit/token?room=consult-lobby-user-1'
        );
    });

    it('encodes special room ids', () => {
        expect(buildLiveKitTokenUrl('https://api.example.com', 'room a/b')).toContain(
            'room=room%20a%2Fb'
        );
    });

    it('accepts only ws/wss LiveKit URLs for browser', () => {
        expect(isLiveKitWsUrl('wss://mali.livekit.cloud')).toBe(true);
        expect(isLiveKitWsUrl('ws://localhost:7880')).toBe(true);
        expect(isLiveKitWsUrl('https://mali.livekit.cloud')).toBe(false);
        expect(isLiveKitWsUrl('')).toBe(false);
    });
});
