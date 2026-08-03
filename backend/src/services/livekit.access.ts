/**
 * LiveKit xona kirish qoidalari (DB siz tekshiriladigan qism).
 * Konsultant kutish xonasi: `consult-lobby-<ekspert_user_id>`
 */
export const CONSULT_LOBBY_PREFIX = 'consult-lobby-';

export function isConsultLobbyRoom(roomId: string): boolean {
    return String(roomId).startsWith(CONSULT_LOBBY_PREFIX);
}

export function consultLobbyOwnerId(roomId: string): string | null {
    if (!isConsultLobbyRoom(roomId)) return null;
    const owner = String(roomId).slice(CONSULT_LOBBY_PREFIX.length).trim();
    return owner || null;
}

/** Faqat lobby egasi (ekspert) o‘z kutish xonasiga token olishi mumkin. */
export function canJoinConsultLobby(roomId: string, userId: string): boolean {
    const ownerId = consultLobbyOwnerId(roomId);
    if (!ownerId) return false;
    return String(userId).toLowerCase() === String(ownerId).toLowerCase();
}

export type LiveKitParticipantRole = 'mentor' | 'student';

export function resolveLiveKitRole(user: {
    isExpert?: boolean;
    is_expert?: boolean;
    role?: string;
} | null | undefined): LiveKitParticipantRole {
    if (!user) return 'student';
    if (user.isExpert || user.is_expert || user.role === 'expert') return 'mentor';
    return 'student';
}

export function buildParticipantDisplayName(user: {
    id?: string;
    name?: string;
    surname?: string;
    username?: string;
} | null | undefined): string {
    if (!user) return 'User';
    const fullName = user.name
        ? `${user.name}${user.surname ? ` ${user.surname}` : ''}`
        : null;
    return fullName || user.username || `User-${String(user.id || '').substring(0, 4)}`;
}
