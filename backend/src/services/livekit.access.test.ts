import { describe, expect, it } from 'vitest';
import {
    buildParticipantDisplayName,
    canJoinConsultLobby,
    consultLobbyOwnerId,
    isConsultLobbyRoom,
    resolveLiveKitRole,
} from '../services/livekit.access';

describe('livekit.access', () => {
    it('detects consult lobby rooms', () => {
        expect(isConsultLobbyRoom('consult-lobby-abc-123')).toBe(true);
        expect(isConsultLobbyRoom('chat-uuid-here')).toBe(false);
    });

    it('extracts lobby owner id', () => {
        expect(consultLobbyOwnerId('consult-lobby-user-42')).toBe('user-42');
        expect(consultLobbyOwnerId('regular-room')).toBeNull();
    });

    it('only lobby owner can join consult lobby', () => {
        const room = 'consult-lobby-Expert-UUID';
        expect(canJoinConsultLobby(room, 'Expert-UUID')).toBe(true);
        expect(canJoinConsultLobby(room, 'expert-uuid')).toBe(true); // case-insensitive
        expect(canJoinConsultLobby(room, 'other-user')).toBe(false);
        expect(canJoinConsultLobby('chat-1', 'anyone')).toBe(false);
    });

    it('resolves mentor vs student role', () => {
        expect(resolveLiveKitRole({ isExpert: true })).toBe('mentor');
        expect(resolveLiveKitRole({ is_expert: true })).toBe('mentor');
        expect(resolveLiveKitRole({ role: 'expert' })).toBe('mentor');
        expect(resolveLiveKitRole({ role: 'student' })).toBe('student');
        expect(resolveLiveKitRole(null)).toBe('student');
    });

    it('builds display name', () => {
        expect(buildParticipantDisplayName({ name: 'Ali', surname: 'Valiyev' })).toBe(
            'Ali Valiyev'
        );
        expect(buildParticipantDisplayName({ username: 'ali' })).toBe('ali');
        expect(buildParticipantDisplayName({ id: 'abcd1234' })).toBe('User-abcd');
    });
});
