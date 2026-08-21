import { Request, Response } from 'express';
import { CourseModel } from '../../models/postgres/Course';
import { GroupModel } from '../../models/postgres/Group';
import { SpecialistNoteModel } from '../../models/postgres/SpecialistNote';
import { CaseFolderModel } from '../../models/postgres/CaseFolder';
import { SessionModel } from '../../models/postgres/Session';


import { WhiteboardSnapshotModel } from '../../models/postgres/WhiteboardSnapshot';
import { MessageModel } from '../../models/postgres/Message';
import { ChatModel } from '../../models/postgres/Chat';
import { pool } from '../../config/database';

export const createCourse = async (req: Request, res: Response) => {
    try {
        const teacher_id = (req as any).user.id;
        const course = await CourseModel.create({ ...req.body, teacher_id });
        res.status(201).json(course);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const createGroup = async (req: Request, res: Response) => {
    try {
        const group = await GroupModel.create(req.body);
        res.status(201).json(group);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const saveNote = async (req: Request, res: Response) => {
    try {
        const specialist_id = (req as any).user.id;
        const { client_id, content, shared_with_client, chat_id, session_id, note_type } = req.body;
        const targetChatId = chat_id || session_id;
        const isSessionNote = note_type === 'session' || (!client_id && (chat_id || session_id));

        const note = await SpecialistNoteModel.create({
            specialist_id,
            client_id: isSessionNote ? null : (client_id || specialist_id),
            content,
            shared_with_client: shared_with_client === true,
            is_private: shared_with_client !== true,
            note_type: isSessionNote ? 'session' : 'client'
        });

        let chatMessage: any = null;
        const shareToChat = shared_with_client === true;
        if (targetChatId && shareToChat) {
            chatMessage = await MessageModel.create(
                targetChatId,
                specialist_id,
                `📋 **Mentor xulosasi:**\n\n${content}`,
                'text',
                { is_auto_note: true, title: 'Sessiya qaydi' }
            );
            const io = req.app.get('io');
            if (io && chatMessage) {
                const ures = await pool.query(
                    'SELECT name, avatar_url FROM users WHERE id = $1 LIMIT 1',
                    [specialist_id]
                );
                const row = ures.rows[0];
                io.to(targetChatId).emit('receive_message', {
                    ...chatMessage,
                    roomId: targetChatId,
                    chat_id: targetChatId,
                    sender_name: row?.name || 'Mentor',
                    sender_avatar: row?.avatar_url || null,
                });
            }
        }

        res.status(201).json(note);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const saveWhiteboardSnapshot = async (req: Request, res: Response) => {
    try {
        const specialist_id = (req as any).user.id;
        const { session_id, snapshot_data, chat_id } = req.body;

        if (!session_id || !snapshot_data || typeof snapshot_data !== 'string') {
            return res.status(400).json({ message: 'session_id va snapshot_data kerak' });
        }
        if (!String(snapshot_data).startsWith('data:image/')) {
            return res.status(400).json({ message: 'Noto‘g‘ri snapshot formati' });
        }

        const snapshot = await WhiteboardSnapshotModel.create({ session_id, snapshot_data });

        const targetChatId = chat_id || session_id;
        let chatMessage: any = null;

        if (targetChatId) {
            // Guruhga rasm sifatida tushishi: base64 ni messages ga yozmasdan URL ga yuklash
            const match = String(snapshot_data).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
            if (!match) {
                return res.status(400).json({ message: 'Snapshot base64 o‘qilmadi' });
            }
            const mime = match[1] || 'image/png';
            const ext = mime.includes('jpeg') || mime.includes('jpg') ? '.jpg' : '.png';
            const buffer = Buffer.from(match[2], 'base64');
            if (buffer.length > 12 * 1024 * 1024) {
                return res.status(413).json({ message: 'Doska rasmi juda katta (max 12MB)' });
            }

            let imageUrl = '';
            try {
                const { bucket } = await import('../../config/firebase');
                const crypto = await import('crypto');
                const fileName = `whiteboard-${crypto.randomUUID()}${ext}`;
                const file = bucket.file(fileName);
                await file.save(buffer, {
                    metadata: {
                        contentType: mime,
                        contentDisposition: `inline; filename="${fileName}"`,
                    },
                });
                await file.makePublic();
                imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
            } catch (uploadErr) {
                console.warn('[saveWhiteboardSnapshot] Firebase upload failed, local fallback:', uploadErr);
                const fs = await import('fs');
                const path = await import('path');
                const crypto = await import('crypto');
                const { uploadsRoot } = await import('../../middleware/upload.middleware');
                if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot, { recursive: true });
                const fileName = `whiteboard-${crypto.randomUUID()}${ext}`;
                fs.writeFileSync(path.join(uploadsRoot, fileName), buffer);
                imageUrl = `/uploads/${fileName}`;
            }

            const caption = '🎨 Dars doskasi (Whiteboard) saqlandi.';
            chatMessage = await MessageModel.create(
                String(targetChatId),
                specialist_id,
                imageUrl,
                'image',
                {
                    is_whiteboard: true,
                    snapshot_id: snapshot.id,
                    caption,
                    url: imageUrl,
                    mimetype: mime,
                    name: `whiteboard-${session_id}${ext}`,
                    file_name: `whiteboard-${session_id}${ext}`,
                }
            );

            const io = req.app.get('io');
            if (io && chatMessage) {
                const ures = await pool.query(
                    'SELECT name, avatar_url FROM users WHERE id = $1 LIMIT 1',
                    [specialist_id]
                );
                const row = ures.rows[0];
                const payload = {
                    ...chatMessage,
                    roomId: String(targetChatId),
                    chat_id: String(targetChatId),
                    sender_name: row?.name || 'Mentor',
                    sender_avatar: row?.avatar_url || null,
                };
                const rooms = [String(targetChatId)];
                try {
                    const parts = await pool.query(
                        'SELECT user_id FROM chat_participants WHERE chat_id = $1',
                        [targetChatId]
                    );
                    for (const p of parts.rows) {
                        rooms.push(String(p.user_id));
                    }
                } catch {
                    /* ignore */
                }
                io.to(rooms).emit('receive_message', payload);
            }
        }

        res.status(201).json({ ...snapshot, message: chatMessage });
    } catch (error: any) {
        console.error('saveWhiteboardSnapshot:', error);
        res.status(400).json({ message: error.message || 'Saqlash xatosi' });
    }
};

export const getLatestWhiteboardSnapshot = async (req: Request, res: Response) => {
    try {
        const { session_id } = req.params;
        const snapshot = await WhiteboardSnapshotModel.findLatestBySession(session_id as string);
        res.json(snapshot);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const createCaseFolder = async (req: Request, res: Response) => {
    try {
        const lawyer_id = (req as any).user.id;
        const folder = await CaseFolderModel.create({ ...req.body, lawyer_id });
        res.status(201).json(folder);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};
export const closeSession = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const specialist_id = (req as any).user.id;

        const session = await SessionModel.findById(id);
        if (session) {
            if (session.provider_id !== specialist_id) {
                return res.status(403).json({ message: 'Unauthorized or session not found' });
            }
            const updatedSession = await SessionModel.updateStatus(id, 'completed', new Date());
            return res.json({ success: true, session: updatedSession });
        }

        // Mentor panel: id may be a group/chat id (not in sessions table). Allow close if user owns that group.
        const { pool } = await import('../../config/database');
        const chatRes = await pool.query(
            'SELECT id, type, creator_id FROM chats WHERE id = $1',
            [id]
        );
        const chat = chatRes.rows[0];
        if (chat && chat.type === 'group' && chat.creator_id === specialist_id) {
            return res.json({ success: true, message: 'Guruh sessiyasi yopildi', groupId: id });
        }

        return res.status(403).json({ message: 'Unauthorized or session not found' });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};
