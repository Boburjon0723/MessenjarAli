import { pool } from '../../config/database';
import { E2E_LIST_PLACEHOLDER, isE2eEnvelope } from '../../services/e2eEnvelope';

export interface Chat {
    id: string;
    creator_id: string | null;
    type: 'private' | 'group' | 'channel';
    name: string | null;
    description: string | null;
    avatar_url: string | null;
    link: string | null;
    metadata?: Record<string, unknown> | null;
    created_at: Date;
    updated_at: Date;
}

export interface IChatModel {
    findById(id: string): Promise<Chat | null>;
    findPrivateChat(user1: string, user2: string): Promise<Chat | null>;
    createPrivate(user1: string, user2: string, metadata?: Record<string, unknown> | null): Promise<Chat>;
    findSavedMessages(userId: string): Promise<Chat | null>;
    createSavedMessages(userId: string): Promise<Chat>;
    createGroup(creatorId: string, name: string, participantIds: string[], avatar_url?: string | null): Promise<Chat>;
    createChannel(creatorId: string, name: string, description?: string, link?: string): Promise<Chat>;
    findUserChats(userId: string): Promise<any[]>;
    markChatAsRead(chatId: string, userId: string): Promise<void>;
    isParticipant(chatId: string, userId: string): Promise<boolean>;
    updateUserChatPrefs(
        chatId: string,
        userId: string,
        prefs: { pinned?: boolean; muted?: boolean; archived?: boolean; unreadMarked?: boolean }
    ): Promise<{
        pinned: boolean;
        muted: boolean;
        archived: boolean;
        unreadMarked: boolean;
        pinnedAt: Date | null;
    }>;
    deleteChat(chatId: string): Promise<void>;
    addParticipant(chatId: string, userId: string): Promise<void>;
    removeParticipant(chatId: string, userId: string): Promise<void>;
    updateGroupChat(chatId: string, creatorId: string, updates: { name?: string; avatar_url?: string }): Promise<Chat | null>;
}

export const ChatModel: IChatModel = {
    async findById(id: string): Promise<Chat | null> {
        const result = await pool.query('SELECT * FROM chats WHERE id = $1', [id]);
        return result.rows[0] || null;
    },

    async findPrivateChat(user1: string, user2: string): Promise<Chat | null> {
        const query = `
            SELECT c.* FROM chats c
            JOIN chat_participants p1 ON c.id = p1.chat_id
            JOIN chat_participants p2 ON c.id = p2.chat_id
            WHERE c.type = 'private' AND p1.user_id = $1 AND p2.user_id = $2
        `;
        const result = await pool.query(query, [user1, user2]);
        return result.rows[0] || null;
    },

    async createPrivate(user1: string, user2: string, metadata?: Record<string, unknown> | null): Promise<Chat> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const metaJson =
                metadata && Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : '{}';
            const chatRes = await client.query(
                `INSERT INTO chats (type, metadata) VALUES ('private', $1::jsonb) RETURNING *`,
                [metaJson]
            );
            const chat = chatRes.rows[0];
            await client.query(
                'INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2), ($1, $3)',
                [chat.id, user1, user2]
            );
            await client.query('COMMIT');
            return chat;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },

    /** Telegram «Saved Messages» — faqat o‘zingiz ishtirokchi */
    async findSavedMessages(userId: string): Promise<Chat | null> {
        const result = await pool.query(
            `SELECT c.* FROM chats c
             JOIN chat_participants cp ON cp.chat_id = c.id
             WHERE cp.user_id = $1
               AND c.type = 'private'
               AND (c.metadata->>'kind') = 'saved_messages'
             LIMIT 1`,
            [userId]
        );
        return result.rows[0] || null;
    },

    async createSavedMessages(userId: string): Promise<Chat> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const chatRes = await client.query(
                `INSERT INTO chats (type, name, metadata)
                 VALUES ('private', 'Saved Messages', $1::jsonb)
                 RETURNING *`,
                [JSON.stringify({ kind: 'saved_messages' })]
            );
            const chat = chatRes.rows[0];
            await client.query('INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2)', [
                chat.id,
                userId,
            ]);
            await client.query('COMMIT');
            return chat;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },

    async createGroup(creatorId: string, name: string, participantIds: string[], avatar_url?: string | null): Promise<Chat> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const chatRes = await client.query(
                "INSERT INTO chats (creator_id, name, type, avatar_url) VALUES ($1, $2, 'group', $3) RETURNING *",
                [creatorId, name, avatar_url || null]
            );
            const chat = chatRes.rows[0];

            const allParticipants = [...new Set([creatorId, ...participantIds])];
            for (const pId of allParticipants) {
                await client.query(
                    'INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2)',
                    [chat.id, pId]
                );
            }

            await client.query('COMMIT');
            return chat;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },

    async createChannel(creatorId: string, name: string, description?: string, link?: string): Promise<Chat> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const chatRes = await client.query(
                `INSERT INTO chats (creator_id, name, description, link, type) VALUES ($1, $2, $3, $4, 'channel') RETURNING *`,
                [creatorId, name || 'Kanal', description || null, link || null]
            );
            const chat = chatRes.rows[0];
            await client.query(
                'INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2)',
                [chat.id, creatorId]
            );
            await client.query('COMMIT');
            return chat;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },

    async findUserChats(userId: string): Promise<any[]> {
        const query = `
            SELECT c.*, 
            (SELECT json_agg(user_id) FROM chat_participants WHERE chat_id = c.id) as participants,
            m.content as "lastMessage",
            m.type as "lastMessageType",
            m.created_at as "lastMessageAt",
            m.metadata as "lastMessageMetaRaw",
            m.sender_id as "lastSenderId",
            m.sender_name as "lastSenderName",
            COALESCE(m.is_read, false) as "lastMessageIsRead",
            COALESCE(cp.is_pinned, false) as pinned,
            cp.pinned_at as "pinnedAt",
            COALESCE(cp.is_muted, false) as muted,
            COALESCE(cp.is_archived, false) as archived,
            COALESCE(cp.unread_marked, false) as "unreadMarked",
            (
                SELECT COUNT(*)::int FROM messages 
                WHERE chat_id = c.id 
                AND created_at > COALESCE(cp.last_read_at, TIMESTAMP '1970-01-01')
                AND sender_id != $1
            ) as unread
            FROM chats c
            JOIN chat_participants cp ON c.id = cp.chat_id
            LEFT JOIN LATERAL (
                SELECT content, type, created_at, metadata, sender_id, is_read,
                       (SELECT name FROM users WHERE id = messages.sender_id LIMIT 1) AS sender_name
                FROM messages 
                WHERE chat_id = c.id 
                ORDER BY created_at DESC 
                LIMIT 1
            ) m ON true
            WHERE cp.user_id = $1
            ORDER BY
                COALESCE(cp.is_pinned, false) DESC,
                cp.pinned_at DESC NULLS LAST,
                COALESCE(m.created_at, c.updated_at) DESC
        `;
        const result = await pool.query(query, [userId]);
        return result.rows.map(row => {
            const { lastMessageMetaRaw, lastSenderName, ...rest } = row as any;
            let snippet = row.lastMessage;
            const e2e = isE2eEnvelope(lastMessageMetaRaw);
            const t = String(row.lastMessageType || 'text').toLowerCase();
            const meta =
                lastMessageMetaRaw && typeof lastMessageMetaRaw === 'object'
                    ? (lastMessageMetaRaw as Record<string, unknown>)
                    : {};
            const mime = String(
                (meta.mimetype as string) ||
                    (meta.mime as string) ||
                    (meta.contentType as string) ||
                    (meta.file_type as string) ||
                    ''
            ).toLowerCase();
            const fileName = String(
                (typeof meta.name === 'string' && meta.name) ||
                    (typeof meta.file_name === 'string' && meta.file_name) ||
                    ''
            );
            const caption = typeof meta.caption === 'string' ? meta.caption.trim() : '';
            const snip = typeof snippet === 'string' ? snippet : '';
            const decodedSnip = (() => {
                try {
                    return decodeURIComponent(snip);
                } catch {
                    return snip;
                }
            })();
            const isStorage =
                /storage\.googleapis\.com|firebasestorage\.googleapis\.com|\.firebasestorage\.app/i.test(
                    snip
                );
            const asAudio =
                /\.(mp3|flac|wav|m4a|aac|wma|opus)(\?|#|$)/i.test(decodedSnip) ||
                /\.(mp3|flac|wav|m4a|aac)$/i.test(fileName) ||
                mime.startsWith('audio/');
            const asVideo =
                /\.(mp4|webm|mov|mkv|m4v)(\?|#|$)/i.test(decodedSnip) ||
                /\.(mp4|webm|mov|mkv|m4v)$/i.test(fileName) ||
                mime.startsWith('video/');
            const asImage =
                /\.(png|jpe?g|gif|webp)(\?|#|$)/i.test(decodedSnip) ||
                mime.startsWith('image/');

            if (e2e) snippet = E2E_LIST_PLACEHOLDER;
            else if (t === 'image' || t === 'photo' || t === 'img') {
                snippet = caption ? `📷 ${caption}` : '📷 Rasm';
            } else if (t === 'video' || (t === 'file' && asVideo)) {
                snippet = caption ? `🎬 ${caption}` : '🎬 Video';
            } else if (t === 'voice') snippet = '🎤 Ovozli xabar';
            else if (t === 'sticker') {
                const emoji = typeof meta.emoji === 'string' && meta.emoji ? meta.emoji : '✨';
                snippet = `${emoji} Stiker`;
            } else if (t === 'audio' || t === 'song' || t === 'music' || (t === 'file' && asAudio)) {
                const title = fileName && !/^https?:\/\//i.test(fileName)
                    ? fileName.replace(/\.[^.]+$/, '')
                    : '';
                snippet = title ? `🎵 ${title}` : '🎵 Musiqa';
            } else if (t === 'file' || t === 'document') {
                const name = fileName && !/^https?:\/\//i.test(fileName) ? fileName : '';
                snippet = name ? `📁 ${name}` : '📁 Fayl';
            } else if (t === 'transaction') snippet = "💰 O'tkazma";
            else if (t === 'phone_call') snippet = '📞 Qo‘ng‘iroq';
            else if (typeof snippet === 'string' && /https?:\/\//i.test(snippet)) {
                if (/notoemoji|telemoji|fonts\.gstatic\.com.*emoji/i.test(snippet)) snippet = '✨ Stiker';
                else if (asAudio) snippet = '🎵 Musiqa';
                else if (asVideo) snippet = '🎬 Video';
                else if (asImage) snippet = '📷 Rasm';
                else if (isStorage) snippet = '📁 Fayl';
                else if (/^https?:\/\//i.test(snippet.trim())) {
                    // Oddiy web link — qisqa qoldirish mumkin; storage emas
                    snippet = snippet;
                }
            }

            return {
                ...rest,
                lastMessage: snippet,
                // FE formatDialogPreview uchun mime/name kerak (E2E da cipher meta)
                lastMessageMeta: lastMessageMetaRaw || undefined,
                lastMessageCipher: e2e ? row.lastMessage : undefined,
                lastSenderId: row.lastSenderId != null ? String(row.lastSenderId) : null,
                lastSenderName: lastSenderName || null,
                lastMessageIsRead: !!row.lastMessageIsRead,
            };
        });
    },

    async markChatAsRead(chatId: string, userId: string): Promise<void> {
        await pool.query(
            `UPDATE chat_participants
             SET last_read_at = NOW(), unread_marked = FALSE
             WHERE chat_id = $1 AND user_id = $2`,
            [chatId, userId]
        );
    },

    async isParticipant(chatId: string, userId: string): Promise<boolean> {
        const result = await pool.query(
            'SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2 LIMIT 1',
            [chatId, userId]
        );
        return (result.rowCount ?? 0) > 0;
    },

    async updateUserChatPrefs(
        chatId: string,
        userId: string,
        prefs: { pinned?: boolean; muted?: boolean; archived?: boolean; unreadMarked?: boolean }
    ): Promise<{
        pinned: boolean;
        muted: boolean;
        archived: boolean;
        unreadMarked: boolean;
        pinnedAt: Date | null;
    }> {
        const sets: string[] = [];

        if (prefs.archived === true) {
            sets.push(`is_archived = TRUE`);
            sets.push(`is_pinned = FALSE`);
            sets.push(`pinned_at = NULL`);
        } else {
            if (prefs.archived === false) {
                sets.push(`is_archived = FALSE`);
            }
            if (prefs.pinned === true) {
                sets.push(`is_pinned = TRUE`);
                sets.push(`pinned_at = COALESCE(pinned_at, NOW())`);
            } else if (prefs.pinned === false) {
                sets.push(`is_pinned = FALSE`);
                sets.push(`pinned_at = NULL`);
            }
        }
        if (prefs.muted === true) sets.push(`is_muted = TRUE`);
        else if (prefs.muted === false) sets.push(`is_muted = FALSE`);
        if (prefs.unreadMarked === true) {
            sets.push(`unread_marked = TRUE`);
        } else if (prefs.unreadMarked === false) {
            sets.push(`unread_marked = FALSE`);
            sets.push(`last_read_at = NOW()`);
        }

        if (sets.length === 0) {
            const cur = await pool.query(
                `SELECT COALESCE(is_pinned, false) AS pinned, pinned_at AS "pinnedAt",
                        COALESCE(is_muted, false) AS muted, COALESCE(is_archived, false) AS archived,
                        COALESCE(unread_marked, false) AS "unreadMarked"
                 FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
                [chatId, userId]
            );
            return cur.rows[0] || { pinned: false, muted: false, archived: false, unreadMarked: false, pinnedAt: null };
        }

        const result = await pool.query(
            `UPDATE chat_participants SET ${sets.join(', ')}
             WHERE chat_id = $1 AND user_id = $2
             RETURNING COALESCE(is_pinned, false) AS pinned, pinned_at AS "pinnedAt",
                       COALESCE(is_muted, false) AS muted, COALESCE(is_archived, false) AS archived,
                       COALESCE(unread_marked, false) AS "unreadMarked"`,
            [chatId, userId]
        );
        return result.rows[0] || { pinned: false, muted: false, archived: false, unreadMarked: false, pinnedAt: null };
    },

    async deleteChat(chatId: string): Promise<void> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM chat_participants WHERE chat_id = $1', [chatId]);
            await client.query('DELETE FROM messages WHERE chat_id = $1', [chatId]);
            await client.query('DELETE FROM chats WHERE id = $1', [chatId]);
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },

    async addParticipant(chatId: string, userId: string): Promise<void> {
        const existing = await pool.query(
            'SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2',
            [chatId, userId]
        );
        if (existing.rowCount === 0) {
            await pool.query(
                'INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2)',
                [chatId, userId]
            );
        }
    },

    async removeParticipant(chatId: string, userId: string): Promise<void> {
        await pool.query(
            'DELETE FROM chat_participants WHERE chat_id = $1 AND user_id = $2',
            [chatId, userId]
        );
    },

    async updateGroupChat(chatId: string, creatorId: string, updates: { name?: string; avatar_url?: string }): Promise<Chat | null> {
        const chat = await this.findById(chatId);
        if (!chat || chat.type !== 'group' || chat.creator_id !== creatorId) return null;
        const set: string[] = [];
        const values: any[] = [];
        let i = 1;
        if (updates.name !== undefined) {
            set.push(`name = $${i++}`);
            values.push(updates.name);
        }
        if (updates.avatar_url !== undefined) {
            set.push(`avatar_url = $${i++}`);
            values.push(updates.avatar_url);
        }
        if (set.length === 0) return chat;
        values.push(chatId);
        const result = await pool.query(
            `UPDATE chats SET ${set.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
            values
        );
        return result.rows[0] || null;
    }
};
