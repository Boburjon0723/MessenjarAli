import { Request, Response } from 'express';
import { AccessToken } from 'livekit-server-sdk';
import dotenv from 'dotenv';
import { pool } from '../../config/database';
import {
    buildParticipantDisplayName,
    canJoinConsultLobby,
    isConsultLobbyRoom,
    resolveLiveKitRole,
} from '../../services/livekit.access';
dotenv.config();

const getLivekitConfig = () => {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;
    if (!apiKey || !apiSecret || !wsUrl) {
        throw new Error('LiveKit environment variables are not fully configured');
    }
    return { apiKey, apiSecret, wsUrl };
};

const createToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const { room } = req.query;
        // @ts-ignore
        const user = req.user; // populated by authenticateToken middleware

        if (!room) {
            res.status(400).json({ error: 'Missing "room" query parameter' });
            return;
        }

        const userId = user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Invalid user session' });
            return;
        }

        const roomId = String(room);
        const isOwnConsultLobby = canJoinConsultLobby(roomId, userId);

        if (isConsultLobbyRoom(roomId) && !isOwnConsultLobby) {
            res.status(403).json({
                error: "Bu konsultatsiya kutish xonasiga kirish mumkin emas.",
            });
            return;
        }

        if (!isOwnConsultLobby) {
            const memberCheck = await pool.query(
                `SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2 LIMIT 1`,
                [roomId, userId]
            );
            if (memberCheck.rows.length === 0) {
                res.status(403).json({
                    error: "Bu suhbat (chat) a'zosi emassiz yoki xona topilmadi. Avval shaxsiy chatni oching.",
                });
                return;
            }
        }

        const { apiKey, apiSecret, wsUrl } = getLivekitConfig();

        const participantName = buildParticipantDisplayName(user);
        const role = resolveLiveKitRole(user);
        const isMentor = role === 'mentor';
        const avatarUrl = user?.avatar_url || user?.avatar || null;
        const metadata = JSON.stringify({
            avatar_url: avatarUrl,
            avatar: avatarUrl,
            displayName: participantName,
            /** LiveKit client: talaba faqat mentor + o‘zini video rejimida ko‘rsatishi uchun */
            lkRole: role,
        });

        const at = new AccessToken(apiKey, apiSecret, {
            identity: String(user.id),
            name: participantName,
            metadata,
        });

        at.addGrant({
            roomJoin: true,
            room: room as string,
            canPublish: true,
            canPublishData: true,
            canSubscribe: true,
        });

        const token = await at.toJwt();
        const io = req.app.get('io');
        if (io && room && isMentor) {
            io.to(room as string).emit('group_session_started', {
                roomId: room,
                mentorId: user.id,
                mentorName: participantName,
                startedAt: new Date().toISOString(),
            });
        }

        res.status(200).json({
            token,
            wsUrl,
            role,
        });
    } catch (error) {
        console.error('Failed to generate LiveKit Token:', error);
        res.status(500).json({ error: 'Failed to generate Video Token' });
    }
};

const endSession = async (req: Request, res: Response): Promise<void> => {
    const { room } = req.query;
    const io = req.app.get('io');
    if (io && room) {
        io.to(room as string).emit('group_session_ended', { roomId: room });
    }
    res.status(200).json({ success: true });
};

export { createToken, endSession };
