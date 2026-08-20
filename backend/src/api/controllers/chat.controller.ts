import { Request, Response } from 'express';
import { stableIsoWhenCreatedAtNull } from '../../utils/stableMessageCreatedAt';
import { ChatModel } from '../../models/postgres/Chat';
import { MessageModel } from '../../models/postgres/Message';
import { UserModel } from '../../models/postgres/User';
import { TokenService } from '../../services/token.service';
import { safeGetCache, safeSetCache, safeDelCache } from '../../config/redis';
import { pool } from '../../config/database';

function parseChatMetadata(raw: unknown): Record<string, any> {
    if (!raw) return {};
    if (typeof raw === 'object') return raw as Record<string, any>;
    try {
        return JSON.parse(String(raw));
    } catch {
        return {};
    }
}

/** Foydalanuvchi mavjud va faol (o‘chirilmagan / bloklanmagan akkaunt). */
export async function isActiveUserId(userId: string | null | undefined): Promise<boolean> {
    if (!userId) return false;
    const r = await pool.query(
        `SELECT 1 FROM users WHERE id = $1 AND COALESCE(is_active, true) = true LIMIT 1`,
        [String(userId)]
    );
    return (r.rowCount ?? 0) > 0;
}

/** O‘chirilgan sherikli shaxsiy chatdan joriy userni chiqarish / bo‘sh chatni o‘chirish. */
async function cleanupOrphanPrivateChat(chatId: string, userId: string): Promise<void> {
    try {
        await pool.query(`DELETE FROM chat_participants WHERE chat_id = $1 AND user_id = $2`, [
            chatId,
            userId,
        ]);
        const left = await pool.query(
            `SELECT COUNT(*)::int AS n FROM chat_participants WHERE chat_id = $1`,
            [chatId]
        );
        if ((left.rows[0]?.n ?? 0) === 0) {
            await pool.query(`DELETE FROM messages WHERE chat_id = $1`, [chatId]).catch(() => {});
            await pool.query(`DELETE FROM chats WHERE id = $1`, [chatId]).catch(() => {});
        }
        await safeDelCache(`user_chats:${userId}`);
    } catch (e) {
        console.warn('[cleanupOrphanPrivateChat]', chatId, e);
    }
}

/** Tasdiqlangan ekspertning e'londa ko'rsatiladigan maydonlari (serverdan, clientaga ishonmaymiz) */
export async function fetchExpertListingSnapshot(expertId: string): Promise<Record<string, unknown> | null> {
    const res = await pool.query(
        `
        SELECT u.id, u.name, u.surname, u.avatar_url,
               p.profession, p.specialization, p.specialization_details, p.experience_years,
               p.hourly_rate, p.pricing_model, p.currency, p.service_format, p.service_languages,
               p.bio_expert, p.specialty_desc, p.expert_proposal
        FROM users u
        LEFT JOIN user_profiles p ON u.id = p.user_id
        WHERE u.id = $1 AND p.is_expert = true AND p.verified_status = 'approved'
        `,
        [expertId]
    );
    const r = res.rows[0];
    if (!r) return null;
    return {
        name: r.name,
        surname: r.surname,
        avatar_url: r.avatar_url,
        profession: r.profession,
        specialization: r.specialization,
        specialization_details: r.specialization_details,
        experience_years: r.experience_years,
        hourly_rate: r.hourly_rate,
        pricing_model: r.pricing_model,
        currency: r.currency,
        service_format: r.service_format,
        service_languages: r.service_languages,
        bio_expert: r.bio_expert,
        specialty_desc: r.specialty_desc,
        expert_proposal: r.expert_proposal,
    };
}

/** Faol ish e'loni snapshot (serverdan) */
export async function fetchJobListingSnapshot(jobId: string): Promise<Record<string, unknown> | null> {
    const res = await pool.query(
        `
        SELECT j.id, j.user_id, j.sub_type, j.category_id, j.type, j.status,
               j.title, j.position, j.company_name, j.full_name, j.short_text,
               j.location, j.salary_text, j.salary_min, j.work_hours, j.work_type,
               j.experience_years, j.skills_json,
               c.name_uz AS category_name_uz, c.icon AS category_icon,
               u.name AS poster_name, u.surname AS poster_surname
        FROM jobs j
        LEFT JOIN job_categories c ON j.category_id = c.id
        LEFT JOIN users u ON j.user_id = u.id
        WHERE j.id = $1 AND j.status = 'active'
        `,
        [jobId]
    );
    const r = res.rows[0];
    if (!r) return null;
    return {
        id: r.id,
        poster_id: r.user_id,
        sub_type: r.sub_type,
        category_id: r.category_id,
        category_name_uz: r.category_name_uz,
        category_icon: r.category_icon,
        type: r.type,
        title: r.title,
        position: r.position,
        company_name: r.company_name,
        full_name: r.full_name,
        short_text: r.short_text,
        location: r.location,
        salary_text: r.salary_text,
        salary_min: r.salary_min,
        work_hours: r.work_hours,
        work_type: r.work_type,
        experience_years: r.experience_years,
        skills_json: r.skills_json,
        poster_name: r.poster_name,
        poster_surname: r.poster_surname,
    };
}

/** Shaxsiy chat qatorini joriy foydalanuvchi uchun boyitish (e'lon maxfiyligi bilan) */
export async function enrichPrivateChatRow(chat: any, currentUserId: string): Promise<any> {
    if (chat.type !== 'private' || !chat.participants) {
        return { ...chat, otherUser: null };
    }
    const otherParticipantId = chat.participants.find((p: string) => String(p) !== String(currentUserId));
    if (!otherParticipantId) return { ...chat, otherUser: null };

    const meta = parseChatMetadata(chat.metadata);
    if (meta.source === 'expert_listing' && meta.expert_id && meta.snapshot) {
        const isExpertSide = String(meta.expert_id) === String(currentUserId);
        if (isExpertSide) {
            const user = await UserModel.findById(otherParticipantId);
            if (user && user.is_active !== false) {
                return {
                    ...chat,
                    otherUser: {
                        id: user.id,
                        name: user.name,
                        surname: user.surname,
                        avatar: user.avatar_url,
                        avatar_url: user.avatar_url,
                        listing_privacy: true,
                    },
                };
            }
        } else if (await isActiveUserId(String(meta.expert_id))) {
            const snap = meta.snapshot;
            return {
                ...chat,
                otherUser: {
                    id: meta.expert_id,
                    listing_privacy: true,
                    ...snap,
                    avatar: snap.avatar_url,
                },
            };
        }
    }

    if (meta.source === 'job_listing' && meta.snapshot) {
        const snap = meta.snapshot as Record<string, unknown>;
        const isPosterSide = String(meta.poster_id) === String(currentUserId);
        if (isPosterSide) {
            const user = await UserModel.findById(otherParticipantId);
            if (user && user.is_active !== false) {
                return {
                    ...chat,
                    otherUser: {
                        id: user.id,
                        name: user.name,
                        surname: user.surname,
                        avatar: user.avatar_url,
                        avatar_url: user.avatar_url,
                        listing_privacy: true,
                    },
                };
            }
        } else if (await isActiveUserId(String(meta.poster_id))) {
            const posterName =
                [snap.poster_name, snap.poster_surname].filter(Boolean).join(' ').trim() ||
                snap.company_name ||
                snap.full_name ||
                "E'lon";
            return {
                ...chat,
                otherUser: {
                    id: meta.poster_id,
                    listing_privacy: true,
                    name: posterName,
                    ...snap,
                },
            };
        }
    }

    try {
        const user = await UserModel.findById(otherParticipantId);
        if (user && user.is_active !== false) {
            return {
                ...chat,
                otherUser: {
                    id: user.id,
                    name: user.name,
                    surname: user.surname,
                    avatar: user.avatar_url,
                    phone: user.phone,
                },
            };
        }
    } catch (e) {
        console.error(`Error fetching user ${otherParticipantId}:`, e);
    }
    return {
        ...chat,
        otherUser: null,
        peerUnavailable: true,
        peerUserId: otherParticipantId,
    };
}

export const createChat = async (req: Request, res: Response) => {
    try {
        const { participantId, type, name, participants, fromExpertListing, fromJobListing, jobId, jobIntent } =
            req.body;
        const currentUserId = (req as any).user.id;

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (type === 'group') {
            if (!name) return res.status(400).json({ message: 'Group name is required' });
            const avatar_url = req.body.avatar_url;
            const trimmedName = String(name).trim();

            // Bir xil nomdagi guruh allaqachon bo'lsa — yangisini yaratmasdan qaytaramiz (dublikat oldini olish)
            const { pool } = await import('../../config/database');
            const existing = await pool.query(
                `SELECT * FROM chats
                 WHERE type = 'group'
                   AND creator_id = $1
                   AND lower(trim(name)) = lower(trim($2))
                 ORDER BY created_at ASC
                 LIMIT 1`,
                [currentUserId, trimmedName]
            );
            if (existing.rows[0]) {
                const existingGroup = existing.rows[0];
                return res.status(200).json({
                    ...existingGroup,
                    id: String(existingGroup.id),
                    reused: true,
                });
            }

            const newGroup = await ChatModel.createGroup(currentUserId, trimmedName, participants || [], avatar_url);
            const groupId = newGroup?.id ? String(newGroup.id) : null;
            await safeDelCache(`user_chats:${currentUserId}`);
            if (participants && Array.isArray(participants)) {
                for (const pId of participants) {
                    await safeDelCache(`user_chats:${pId}`);
                }
            }
            return res.status(201).json({ ...newGroup, id: groupId || newGroup.id });
        }

        if (type === 'channel') {
            if (!name) return res.status(400).json({ message: 'Kanal nomi kerak' });
            const { description, link } = req.body;
            const newChannel = await ChatModel.createChannel(currentUserId, name, description, link);
            await safeDelCache(`user_chats:${currentUserId}`);
            return res.status(201).json(newChannel);
        }

        // Private Chat
        if (!participantId) {
            console.warn('[createChat] Missing participantId');
            return res.status(400).json({ message: 'Participant ID is required' });
        }

        if (!uuidRegex.test(participantId)) {
            console.warn(`[createChat] Invalid participantId format: "${participantId}"`);
            return res.status(400).json({ message: 'Invalid participant ID format' });
        }

        if (!uuidRegex.test(currentUserId)) {
            console.warn(`[createChat] Invalid currentUserId format: "${currentUserId}"`);
            return res.status(401).json({ message: 'Invalid session. Please logout and login again.' });
        }

        if (!(await isActiveUserId(String(participantId)))) {
            return res.status(404).json({
                message: "Foydalanuvchi topilmadi yoki akkaunt o'chirilgan",
            });
        }

        const listingMeta =
            fromExpertListing === true ? await fetchExpertListingSnapshot(participantId) : null;
        if (fromExpertListing === true && !listingMeta) {
            return res.status(400).json({
                message: "Mutaxassis e'loni topilmadi yoki hali tasdiqlanmagan",
            });
        }

        let jobMeta: Record<string, unknown> | null = null;
        if (fromJobListing === true) {
            if (!jobId || typeof jobId !== 'string') {
                return res.status(400).json({ message: "Ish e'loni ID kerak" });
            }
            jobMeta = await fetchJobListingSnapshot(jobId);
            if (!jobMeta) {
                return res.status(400).json({ message: "Ish e'loni topilmadi yoki faol emas" });
            }
            if (String(jobMeta.poster_id) !== String(participantId)) {
                return res.status(400).json({ message: "E'lon egasi bilan chat ochish mumkin emas" });
            }
        }

        const privateMeta =
            listingMeta ?
                {
                    source: 'expert_listing',
                    expert_id: participantId,
                    snapshot: listingMeta,
                    intent: 'consult',
                    application_status: 'pending',
                    listing_chat_kind: 'marketplace',
                }
            : jobMeta ?
                {
                    source: 'job_listing',
                    job_id: jobMeta.id,
                    poster_id: jobMeta.poster_id,
                    snapshot: jobMeta,
                    intent: jobIntent === 'apply' ? 'apply' : 'chat',
                    application_status: jobIntent === 'apply' ? 'pending' : undefined,
                    listing_chat_kind: 'marketplace',
                }
            :   null;

        let chat = await ChatModel.findPrivateChat(currentUserId, participantId);
        if (!chat) {
            chat = await ChatModel.createPrivate(currentUserId, participantId, privateMeta);
        } else if (privateMeta) {
            // E'londan ochilganda shu e'lon egasi — manba haqiqati.
            // Eski chatda teskari expert_id qolgan bo‘lsa, yangilaymiz (Brain e'lon → expert_id=Brain).
            await pool.query(
                `UPDATE chats SET metadata = $1::jsonb, updated_at = NOW() WHERE id = $2`,
                [JSON.stringify(privateMeta), chat.id]
            );
            chat = (await ChatModel.findById(chat.id))!;
        }

        await safeDelCache(`user_chats:${currentUserId}`);
        if (type === 'private' && participantId) {
            await safeDelCache(`user_chats:${participantId}`);
        } else if (participants) {
            for (const p of participants) {
                await safeDelCache(`user_chats:${p}`);
            }
        }

        const partsRes = await pool.query('SELECT user_id FROM chat_participants WHERE chat_id = $1', [chat.id]);
        const row = { ...chat, participants: partsRes.rows.map((r: { user_id: string }) => r.user_id) };
        const enriched = await enrichPrivateChatRow(row, currentUserId);

        if (privateMeta) {
            const io = req.app.get('io');
            const { NotificationService } = await import('../../services/notification.service');
            const pushSvc = await import('../../services/push.service');
            const actor = await UserModel.findById(currentUserId);
            const actorName = actor?.name || 'Foydalanuvchi';
            const chatIdStr = String(chat.id);
            if (privateMeta.source === 'expert_listing' && privateMeta.expert_id) {
                await NotificationService.createNotification(
                    String(privateMeta.expert_id),
                    'new_murojaat',
                    'Yangi murojaat',
                    `${actorName} mutaxassis e'loniga murojaat yubordi`,
                    { chatId: chatIdStr },
                    io
                );
                void pushSvc.pushNewApplication(String(privateMeta.expert_id), actorName, 'Mutaxassis e\'loni', chatIdStr);
            } else if (
                privateMeta.source === 'job_listing' &&
                privateMeta.intent === 'apply' &&
                privateMeta.poster_id
            ) {
                const snap = privateMeta.snapshot as Record<string, any> | undefined;
                const jobTitle = snap?.short_text || snap?.company_name || "E'lon";
                await NotificationService.createNotification(
                    String(privateMeta.poster_id),
                    'new_application',
                    'Yangi ish arizasi',
                    `${actorName} e'loningizga ariza yubordi`,
                    { chatId: chatIdStr, jobId: privateMeta.job_id },
                    io
                );
                void pushSvc.pushNewApplication(String(privateMeta.poster_id), actorName, jobTitle, chatIdStr);
            }
        }

        res.status(201).json(enriched);
    } catch (error: any) {
        console.error('Create Chat Error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};
export const getUserChats = async (req: Request, res: Response) => {
    try {
        const currentUserId = (req as any).user.id;
        const cacheKey = `user_chats:${currentUserId}`;
        const skipCache = req.query.refresh === '1' || req.query.refresh === 'true';

        // Try getting from cache first (skip if refresh requested)
        if (!skipCache) {
            const cachedChats = await safeGetCache(cacheKey);
            if (cachedChats) {
                try {
                    const parsed = JSON.parse(cachedChats);
                    if (Array.isArray(parsed)) {
                        const ok = parsed.filter(
                            (c: any) =>
                                c?.type !== 'private' ||
                                (c?.otherUser && !c?.peerUnavailable)
                        );
                        // Keshda o'chirilgan sheriklar bo'lsa — DB dan qayta yuklash
                        if (ok.length === parsed.length) {
                            return res.status(200).json(ok);
                        }
                    }
                } catch {
                    /* fall through */
                }
            }
        }

        const chats = await ChatModel.findUserChats(currentUserId);

        const enriched = await Promise.all(chats.map((chat) => enrichPrivateChatRow(chat, currentUserId)));

        // O'chirilgan / mavjud bo'lmagan sherikli shaxsiy chatlarni yashirish va tozalash
        const visible: any[] = [];
        for (const chat of enriched) {
            if (chat?.type === 'private' && (chat.peerUnavailable || !chat.otherUser)) {
                const cid = chat.id != null ? String(chat.id) : '';
                if (cid) void cleanupOrphanPrivateChat(cid, currentUserId);
                continue;
            }
            visible.push(chat);
        }

        // Set cache for 5 minutes
        await safeSetCache(cacheKey, JSON.stringify(visible), 300);

        res.status(200).json(visible);
    } catch (error) {
        console.error('Get Chats Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * DB dan kelgan `created_at` ni JSON uchun: allaqachon ISO qator bo‘lsa o‘zgartirmaymiz;
 * `Date` bo‘lsa `toISOString()`. Mavjud qiymatni `new Date(value)` orqali qayta parse qilmaslik kerak —
 * ayrim qiymatlar (masalan, driverdan kelgan maxsus format / soniyada saqlangan vaqt) noto‘g‘ri
 * interpretatsiya qilinishi yoki bir xil `getTime()` ga tushishi mumkin.
 */
function createdAtFromDbForJson(value: unknown): string | null {
    if (value == null || value === '') return null;

    if (typeof value === 'string') {
        const t = value.trim();
        return t || null;
    }

    if (value instanceof Date) {
        const ms = value.getTime();
        return Number.isNaN(ms) ? null : value.toISOString();
    }

    /** Ba'zan serializatsiya / driver son (unix s/ms) qaytarishi mumkin */
    if (typeof value === 'number' && Number.isFinite(value)) {
        const ms = value < 1e12 ? value * 1000 : value;
        const d = new Date(ms);
        return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }

    /** Oxirgi urinish — null qaytarmaslik (frontend stagger 1s noto‘g‘ri vaqt chizig‘i yasaydi) */
    try {
        const d = new Date(value as string | number);
        return Number.isNaN(d.getTime()) ? null : d.toISOString();
    } catch {
        return null;
    }
}

export const getMessages = async (req: Request, res: Response) => {
    try {
        const { chatId } = req.params;
        // UUID validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(chatId as string)) {
            return res.status(200).json([]); // Return empty messages for old mongo IDs
        }
        const messages = await MessageModel.findByChatId(chatId as string);

        const payload = messages.map((msg, index) => {
            let created_at = createdAtFromDbForJson(msg.created_at);
            if (created_at == null && msg.created_at instanceof Date) {
                const ms = msg.created_at.getTime();
                created_at = Number.isNaN(ms) ? null : msg.created_at.toISOString();
            }
            /**
             * DB NULL — avvalgi `Date.now()` har refreshda "hozirgi vaqt" ko‘rsatardi.
             * Barqaror ISO (id + index) — refresh qilinsa ham bir xil; haqiqiy vaqt uchun DB UPDATE.
             */
            if (created_at == null) {
                created_at = stableIsoWhenCreatedAtNull(String(msg.id ?? index), index);
            }
            return { ...msg, created_at };
        });
        res.status(200).json(payload);
    } catch (error) {
        console.error('Get Messages Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/** Mobil / REST: matn xabar (socket bilan bir xil tekshiruvlar) */
export const sendChatMessage = async (req: Request, res: Response) => {
    try {
        const rawId = req.params.chatId;
        const chatId = typeof rawId === 'string' ? rawId : rawId?.[0] ?? '';
        const currentUserId = (req as any).user.id as string;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!chatId || !uuidRegex.test(chatId)) {
            return res.status(400).json({ message: "Noto'g'ri chat ID" });
        }

        const { content, type, metadata } = req.body || {};
        if (!content || typeof content !== 'string' || !String(content).trim()) {
            return res.status(400).json({ message: 'Xabar matni kerak' });
        }

        const memberCheck = await pool.query(
            `SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
            [chatId, currentUserId]
        );
        if (memberCheck.rowCount === 0) {
            return res.status(403).json({ message: "Bu chatga kirmagansiz" });
        }

        const chatRow = (await pool.query(`SELECT type, creator_id FROM chats WHERE id = $1`, [chatId])).rows[0];
        if (!chatRow) {
            return res.status(404).json({ message: 'Chat topilmadi' });
        }

        if (chatRow.type === 'channel' && String(chatRow.creator_id) !== String(currentUserId)) {
            return res.status(403).json({ message: "Faqat kanal yaratuvchisi xabar qo'yishi mumkin" });
        }

        if (chatRow.type === 'private') {
            const participants = await pool.query(`SELECT user_id FROM chat_participants WHERE chat_id = $1`, [chatId]);
            const otherParticipant = participants.rows.find((p: { user_id: string }) => String(p.user_id) !== String(currentUserId));
            if (otherParticipant) {
                if (!(await isActiveUserId(String(otherParticipant.user_id)))) {
                    await cleanupOrphanPrivateChat(chatId, currentUserId);
                    return res.status(410).json({
                        message: "Suhbatdosh akkaunti o'chirilgan. Xabar yuborib bo'lmaydi.",
                        peerUnavailable: true,
                    });
                }
                const isBlocked = await UserModel.isBlocked(currentUserId, otherParticipant.user_id);
                if (isBlocked) {
                    return res.status(403).json({ message: 'Xabar yuborish imkonsiz: bloklangan' });
                }
            } else {
                return res.status(410).json({
                    message: "Suhbatdosh topilmadi. Xabar yuborib bo'lmaydi.",
                    peerUnavailable: true,
                });
            }
            const metaRow = await pool.query(`SELECT metadata FROM chats WHERE id = $1 LIMIT 1`, [chatId]);
            const { parseChatMetadata, isListingMessagingUnlocked } = await import('../../services/chatConsent.service');
            const chatMeta = parseChatMetadata(metaRow.rows[0]?.metadata);
            if (!isListingMessagingUnlocked(chatMeta)) {
                return res.status(403).json({
                    message: "Murojaat qabul qilinguncha xabar yuborib bo'lmaydi",
                });
            }
        }

        const savedMessage = await MessageModel.create(
            chatId,
            currentUserId,
            String(content).trim(),
            (type && typeof type === 'string' ? type : 'text') as string,
            metadata && typeof metadata === 'object' ? metadata : {},
            null
        );

        let created_at = createdAtFromDbForJson(savedMessage.created_at);
        if (created_at == null && savedMessage.created_at instanceof Date) {
            const ms = savedMessage.created_at.getTime();
            created_at = Number.isNaN(ms) ? null : savedMessage.created_at.toISOString();
        }
        if (created_at == null) {
            created_at = stableIsoWhenCreatedAtNull(String(savedMessage.id), 0);
        }

        const io = req.app.get('io');
        if (io) {
            let targetRooms: string[] = [String(chatId)];
            try {
                const participantsRes = await pool.query(
                    'SELECT user_id FROM chat_participants WHERE chat_id = $1',
                    [chatId]
                );
                for (const row of participantsRes.rows) {
                    await safeDelCache(`user_chats:${row.user_id}`);
                    targetRooms.push(String(row.user_id));
                }
            } catch (e) {
                console.error('[sendChatMessage] cache:', e);
            }
            const payload = {
                id: savedMessage.id,
                chat_id: savedMessage.chat_id,
                roomId: chatId,
                sender_id: savedMessage.sender_id,
                content: savedMessage.content,
                type: savedMessage.type,
                metadata: savedMessage.metadata,
                parent_id: savedMessage.parent_id,
                created_at,
                is_read: savedMessage.is_read,
            };
            io.to(targetRooms).emit('receive_message', payload);
        } else {
            try {
                const participantsRes = await pool.query(
                    'SELECT user_id FROM chat_participants WHERE chat_id = $1',
                    [chatId]
                );
                for (const row of participantsRes.rows) {
                    await safeDelCache(`user_chats:${row.user_id}`);
                }
            } catch (e) {
                console.error('[sendChatMessage] cache:', e);
            }
        }

        res.status(201).json({ ...savedMessage, created_at });
    } catch (error) {
        console.error('Send Chat Message Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/** Obuna tekshiruvi uchun: guruh (room) yaratuvchisi — ustoz. A'zolik tekshirilmaydi. */
export const getRoomSubscriptionInfo = async (req: Request, res: Response) => {
    try {
        const chatId = req.params.chatId as string;
        const chat = await ChatModel.findById(chatId);
        if (!chat) return res.status(404).json({ message: 'Chat topilmadi' });
        const creator = chat.creator_id ? await UserModel.findById(chat.creator_id) : null;
        res.status(200).json({
            chatId,
            type: chat.type,
            creator_id: chat.creator_id,
            creator_name: creator?.name || null,
            name: chat.name,
        });
    } catch (error) {
        console.error('getRoomSubscriptionInfo:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getChatDetails = async (req: Request, res: Response) => {
    try {
        const chatId = req.params.chatId as string;
        const currentUserId = (req as any).user.id;

        // UUID validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(chatId)) {
            return res.status(404).json({ message: 'Chat not found (invalid ID)' });
        }

        const chat = await ChatModel.findById(chatId);
        if (!chat) {
            console.warn('[getChatDetails] Chat topilmadi, id=', chatId);
            return res.status(404).json({ message: 'Chat not found' });
        }

        // Get participants
        const chatsWithParticipants = await ChatModel.findUserChats(currentUserId);
        const thisChat = chatsWithParticipants.find(c => String(c.id) === String(chatId));

        if (!thisChat) return res.status(403).json({ message: 'Not authorized' });

        const listMeta = parseChatMetadata((chat as any).metadata);
        const isListing = listMeta.source === 'expert_listing' && listMeta.expert_id && listMeta.snapshot;

        const participantsData = await Promise.all(
            thisChat.participants.map(async (pId: string) => {
                const user = await UserModel.findById(pId);
                if (!user) return null;
                if (isListing) {
                    if (String(pId) === String(listMeta.expert_id)) {
                        const s = listMeta.snapshot;
                        return {
                            id: user.id,
                            name: s.name,
                            surname: s.surname,
                            avatar: s.avatar_url,
                            listing_privacy: true,
                        };
                    }
                    return {
                        id: user.id,
                        name: user.name,
                        surname: user.surname,
                        avatar: user.avatar_url,
                        listing_privacy: true,
                    };
                }
                return {
                    id: user.id,
                    name: user.name,
                    surname: user.surname,
                    avatar: user.avatar_url,
                    phone: user.phone,
                };
            })
        );

        let pinnedMessage = null;
        if ((chat as any).pinned_message_id) {
            const pmRes = await pool.query('SELECT * FROM messages WHERE id = $1', [(chat as any).pinned_message_id]);
            if (pmRes.rows[0]) pinnedMessage = pmRes.rows[0];
        }

        res.status(200).json({
            ...chat,
            participants: participantsData.filter(Boolean),
            pinnedMessage,
        });
    } catch (error) {
        console.error('Get Chat Details Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/** Obunasi bo'lgan talaba o'zini ustoz guruhiga qo'shadi */
export const joinGroupWithSubscription = async (req: Request, res: Response) => {
    try {
        const chatId = Array.isArray(req.params.chatId) ? req.params.chatId[0] : req.params.chatId;
        const currentUserId = (req as any).user.id;

        if (!chatId) return res.status(400).json({ message: 'chatId kerak' });

        const chat = await ChatModel.findById(chatId);
        if (!chat) return res.status(404).json({ message: 'Chat topilmadi' });
        if (chat.type !== 'group') return res.status(400).json({ message: 'Faqat guruhga qo\'shilish mumkin' });

        const mentorId = chat.creator_id;
        if (!mentorId) {
            await ChatModel.addParticipant(chatId, currentUserId);
            await safeDelCache(`user_chats:${currentUserId}`);
            const io = req.app.get('io');
            if (io) io.to(chatId).emit('participant_joined', { chatId, userId: currentUserId });
            return res.status(200).json({ message: 'Guruhga qo\'shildingiz', chat });
        }

        const active = await TokenService.getActiveSubscription(currentUserId, mentorId);
        if (!active) return res.status(403).json({ message: 'Obuna talab qilinadi. Avval ustozga obuna bo\'ling.' });

        await ChatModel.addParticipant(chatId, currentUserId);
        await safeDelCache(`user_chats:${currentUserId}`);

        const io = req.app.get('io');
        if (io) io.to(chatId).emit('participant_joined', { chatId, userId: currentUserId });

        try {
            const { markGroupJoinInvitesPaid } = await import('../../services/panelInvite.service');
            await markGroupJoinInvitesPaid(String(chatId), String(currentUserId), io);
        } catch (e) {
            console.error('markGroupJoinInvitesPaid:', e);
        }

        res.status(200).json({ message: 'Guruhga qo\'shildingiz', chat });
    } catch (error: any) {
        console.error('joinGroupWithSubscription:', error);
        res.status(500).json({ message: 'Server xatosi', error: error?.message });
    }
};

export const addParticipant = async (req: Request, res: Response) => {
    try {
        const { chatId } = req.params;
        const { userId } = req.body;
        const currentUserId = (req as any).user.id;

        if (!chatId || !userId) {
            return res.status(400).json({ message: 'chatId and userId are required' });
        }

        const chat = await ChatModel.findById(chatId as string);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        if (chat.type !== 'group' && chat.type !== 'channel') {
            return res.status(400).json({ message: 'Cannot add participant to a private chat' });
        }

        if (
            chat.type === 'group' &&
            String(chat.creator_id || '') !== String(currentUserId)
        ) {
            return res.status(403).json({ message: 'Faqat guruh yaratuvchisi a\'zo taklif qilishi mumkin' });
        }

        const newUserId = String(userId);
        await ChatModel.addParticipant(chatId as string, newUserId);
        await safeDelCache(`user_chats:${newUserId}`);
        await safeDelCache(`user_chats:${String(currentUserId)}`);

        // Notify via Socket.IO that a new participant joined
        const io = req.app.get('io');
        if (io) {
            io.to(chatId).emit('participant_joined', { chatId, userId: newUserId });
        }

        res.status(200).json({ message: 'Participant added successfully' });
    } catch (error) {
        console.error('Add Participant Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getExpertGroups = async (req: Request, res: Response) => {
    try {
        const { expertId } = req.params;
        if (!expertId) return res.status(400).json({ message: 'expertId is required' });

        const { pool } = await import('../../config/database');
        /** Faqat o'zi yaratgan dars guruhlari — boshqa ustozning guruhiga a'zo bo'lsa ham ro'yxatga tushmasin */
        const result = await pool.query(`
            SELECT c.id, c.name, p.expert_groups
            FROM chats c
            JOIN chat_participants cp ON c.id = cp.chat_id
            JOIN user_profiles p ON p.user_id = $1
            WHERE c.type = 'group'
              AND cp.user_id = $1
              AND c.creator_id = $1
            ORDER BY c.created_at DESC
        `, [expertId]);

        if (result.rows.length === 0) return res.status(200).json([]);

        const profileGroups = typeof result.rows[0].expert_groups === 'string'
            ? JSON.parse(result.rows[0].expert_groups)
            : result.rows[0].expert_groups;

        const groups = result.rows.map((r: any) => {
            const meta = Array.isArray(profileGroups) ? profileGroups.find((pg: any) => (pg.chatId === r.id || pg.id === r.id)) : null;
            return {
                chatId: r.id,
                name: r.name,
                id: r.id,
                time: meta ? meta.time : 'Vaqt belgilanmagan'
            };
        });

        res.status(200).json(groups);
    } catch (error) {
        console.error('Get Expert Groups Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


export const getCommunities = async (req: Request, res: Response) => {
    // Communities can be handled as channels in Postgres
    res.status(200).json([]);
};

export const joinCommunity = async (req: Request, res: Response) => {
    res.status(501).json({ message: 'Not implemented yet' });
};
export const searchMessages = async (req: Request, res: Response) => {
    try {
        const { chatId } = req.params;
        const { q } = req.query;

        if (!q) return res.status(200).json([]);

        const query: string = typeof q === 'string' ? q : (Array.isArray(q) ? String(q[0]) : '');
        const messages = await MessageModel.searchMessages(String(chatId), query as string);
        res.status(200).json(messages);
    } catch (error) {
        console.error('Search Messages Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const clearMessages = async (req: Request, res: Response) => {
    try {
        const { chatId } = req.params;
        const currentUserId = (req as any).user.id;

        const chat = await ChatModel.findById(chatId as string);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        // Verify user is participant
        const userChats = await ChatModel.findUserChats(currentUserId);
        if (!userChats.some(c => c.id === chatId)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await MessageModel.deleteByChatId(chatId as string);
        res.status(200).json({ message: 'History cleared' });
    } catch (error) {
        console.error('Clear Messages Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteChatEndpoint = async (req: Request, res: Response) => {
    try {
        const { chatId } = req.params;
        const currentUserId = (req as any).user.id;

        const chat = await ChatModel.findById(chatId as string);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        const userChats = await ChatModel.findUserChats(currentUserId);
        if (!userChats.some(c => c.id === chatId)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (chat.type === 'group') {
            if (chat.creator_id !== currentUserId) {
                return res.status(403).json({ message: 'Faqat guruh yaratuvchisi guruhni o\'chira oladi' });
            }
        }

        await ChatModel.deleteChat(chatId as string);
        await safeDelCache(`user_chats:${currentUserId}`);
        res.status(200).json({ message: 'Chat deleted' });
    } catch (error) {
        console.error('Delete Chat Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const leaveGroup = async (req: Request, res: Response) => {
    try {
        const { chatId } = req.params;
        const currentUserId = (req as any).user.id;

        const chat = await ChatModel.findById(chatId as string);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        if (chat.type !== 'group' && chat.type !== 'channel') {
            return res.status(400).json({ message: 'Faqat guruh yoki kanalda chiqish mumkin' });
        }

        const userChats = await ChatModel.findUserChats(currentUserId);
        if (!userChats.some(c => c.id === chatId)) {
            return res.status(403).json({ message: 'Siz ushbu guruh a\'zosi emassiz' });
        }

        await ChatModel.removeParticipant(chatId as string, currentUserId);
        await safeDelCache(`user_chats:${currentUserId}`);

        const io = req.app.get('io');
        if (io) {
            io.to(chatId).emit('participant_left', { chatId, userId: currentUserId });
        }

        res.status(200).json({ message: 'Guruhdan chiqdingiz' });
    } catch (error) {
        console.error('Leave Group Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateGroupChat = async (req: Request, res: Response) => {
    try {
        const rawId = req.params.chatId || (req.params as any).id;
        const chatId = typeof rawId === 'string' ? rawId.trim() : '';
        const currentUserId = (req as any).user.id;
        const { name, avatar_url } = req.body || {};

        if (!chatId) return res.status(400).json({ message: 'Chat ID kerak' });

        const chat = await ChatModel.findById(chatId);
        if (!chat) {
            console.warn('[updateGroupChat] Chat topilmadi, id:', chatId);
            await safeDelCache(`user_chats:${currentUserId}`);
            return res.status(404).json({ message: 'Chat topilmadi', chatId });
        }
        if (chat.type !== 'group') return res.status(400).json({ message: 'Faqat guruhni yangilash mumkin' });
        if (chat.creator_id !== currentUserId) {
            return res.status(403).json({ message: 'Faqat guruh yaratuvchisi nom va rasmni o\'zgartira oladi' });
        }

        const updates: { name?: string; avatar_url?: string } = {};
        if (typeof name === 'string' && name.trim()) updates.name = name.trim();
        if (typeof avatar_url === 'string') updates.avatar_url = avatar_url;

        const updated = await ChatModel.updateGroupChat(chatId as string, currentUserId, updates);
        if (!updated) return res.status(500).json({ message: 'Yangilash amalga oshmadi' });

        const userChats = await ChatModel.findUserChats(currentUserId);
        const thisChat = userChats.find(c => String(c.id) === String(chatId));
        if (thisChat?.participants) {
            for (const pId of thisChat.participants) {
                await safeDelCache(`user_chats:${pId}`);
            }
        }

        const io = req.app.get('io');
        if (io) {
            const payload = {
                chatId,
                name: updated.name ?? undefined,
                avatar_url: updated.avatar_url ?? undefined,
            };
            io.to(chatId).emit('chat_updated', payload);
            if (thisChat?.participants) {
                for (const pId of thisChat.participants) {
                    io.to(String(pId)).emit('chat_updated', payload);
                }
            }
        }

        res.status(200).json(updated);
    } catch (error) {
        console.error('Update Group Chat Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteMessagesBulk = async (req: Request, res: Response) => {
    try {
        const { chatId } = req.params;
        const { messageIds } = req.body;
        const currentUserId = (req as any).user.id;

        const chat = await ChatModel.findById(chatId as string);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        const userChats = await ChatModel.findUserChats(currentUserId);
        if (!userChats.some(c => c.id === chatId)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await MessageModel.deleteByIds(chatId as string, messageIds);
        res.status(200).json({ message: 'Messages deleted' });
    } catch (error) {
        console.error('Delete Messages Bulk Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        const { chatId } = req.params;
        const currentUserId = (req as any).user.id;

        await ChatModel.markChatAsRead(chatId as string, currentUserId);
        await safeDelCache(`user_chats:${currentUserId}`);
        res.status(200).json({ message: 'Chat marked as read' });
    } catch (error) {
        console.error('Mark As Read Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateChatPrefs = async (req: Request, res: Response) => {
    try {
        const { chatId } = req.params;
        const currentUserId = (req as any).user.id;
        const body = req.body || {};

        const ok = await ChatModel.isParticipant(chatId as string, currentUserId);
        if (!ok) return res.status(403).json({ message: 'Not authorized' });

        const prefs = {
            pinned: typeof body.pinned === 'boolean' ? body.pinned : undefined,
            muted: typeof body.muted === 'boolean' ? body.muted : undefined,
            archived: typeof body.archived === 'boolean' ? body.archived : undefined,
            unreadMarked: typeof body.unreadMarked === 'boolean' ? body.unreadMarked : undefined,
        };

        const next = await ChatModel.updateUserChatPrefs(chatId as string, currentUserId, prefs);
        await safeDelCache(`user_chats:${currentUserId}`);

        const io = req.app.get('io');
        if (io) {
            io.to(String(currentUserId)).emit('chat_prefs_updated', {
                chatId,
                pinned: !!next.pinned,
                muted: !!next.muted,
                archived: !!next.archived,
                unreadMarked: !!next.unreadMarked,
                pinnedAt: next.pinnedAt ? new Date(next.pinnedAt).getTime() : null,
            });
        }

        res.status(200).json({
            chatId,
            pinned: !!next.pinned,
            muted: !!next.muted,
            archived: !!next.archived,
            unreadMarked: !!next.unreadMarked,
            pinnedAt: next.pinnedAt ? new Date(next.pinnedAt).getTime() : null,
        });
    } catch (error) {
        console.error('Update Chat Prefs Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/** Listing/murojaat: mijoz, mutaxassis yoki ish beruvchi roziligi */
export const postListingConsent = async (req: Request, res: Response) => {
    try {
        const chatId = String(req.params.chatId || '');
        const currentUserId = (req as any).user?.id;
        if (!currentUserId) return res.status(401).json({ message: 'Unauthorized' });

        const action = String((req.body as { action?: string })?.action || '');
        const rejectReason =
            typeof (req.body as { reason?: string })?.reason === 'string'
                ? (req.body as { reason: string }).reason.trim().slice(0, 500)
                : '';
        if (!['client_accept', 'expert_accept', 'employer_accept', 'employer_reject'].includes(action)) {
            return res.status(400).json({ message: 'Noto‘g‘ri action' });
        }

        const ok = await ChatModel.isParticipant(chatId, currentUserId);
        if (!ok) return res.status(403).json({ message: 'Not authorized' });

        const row = await pool.query(`SELECT type, metadata FROM chats WHERE id = $1 LIMIT 1`, [chatId]);
        const chat = row.rows[0];
        if (!chat || chat.type !== 'private') {
            return res.status(400).json({ message: 'Faqat shaxsiy murojaat chat' });
        }

        const meta = parseChatMetadata(chat.metadata);
        const isExpertListing = meta.source === 'expert_listing' && meta.expert_id;
        const isJobApply =
            meta.source === 'job_listing' && meta.intent === 'apply' && meta.poster_id;

        if (!isExpertListing && !isJobApply) {
            return res.status(400).json({ message: 'Bu chat murojaat emas' });
        }

        const now = new Date().toISOString();
        const { computeListingConsentUpdate } = await import('../../services/chatConsent.service');
        const result = computeListingConsentUpdate({
            meta,
            action: action as 'client_accept' | 'expert_accept' | 'employer_accept' | 'employer_reject',
            currentUserId: String(currentUserId),
            now,
            rejectReason,
        });
        if (!result.ok) {
            return res.status(result.status).json({ message: result.message });
        }
        const next = result.next;

        await pool.query(`UPDATE chats SET metadata = $1::jsonb, updated_at = NOW() WHERE id = $2`, [
            JSON.stringify(next),
            chatId,
        ]);

        const participants = await pool.query(
            `SELECT user_id FROM chat_participants WHERE chat_id = $1`,
            [chatId]
        );
        for (const p of participants.rows) {
            await safeDelCache(`user_chats:${p.user_id}`);
        }

        const io = req.app.get('io');
        if (io) {
            io.to(chatId).emit('listing_consent_updated', { chatId, metadata: next });
        }

        const otherParticipantIds = participants.rows
            .map((p: { user_id: string }) => String(p.user_id))
            .filter((id) => id !== String(currentUserId));

        const { NotificationService } = await import('../../services/notification.service');
        const pushSvc = await import('../../services/push.service');
        const actor = await UserModel.findById(currentUserId);
        const actorName = actor?.name || 'Foydalanuvchi';
        const nextSnap = (next as any).snapshot;
        const jobTitle = nextSnap?.short_text || nextSnap?.company_name || "E'lon";

        for (const oid of otherParticipantIds) {
            if (action === 'employer_reject') {
                await NotificationService.createNotification(
                    oid,
                    'application_rejected',
                    'Ariza rad etildi',
                    rejectReason
                        ? `${actorName} arizani rad etdi: ${rejectReason}`
                        : `${actorName} arizani rad etdi`,
                    { chatId },
                    io
                );
                void pushSvc.pushApplicationRejected(oid, jobTitle, rejectReason || undefined);
            } else if (next.application_status === 'accepted') {
                await NotificationService.createNotification(
                    oid,
                    'application_accepted',
                    'Murojaat qabul qilindi',
                    `${actorName} murojaatni qabul qildi`,
                    { chatId },
                    io
                );
                void pushSvc.pushApplicationAccepted(oid, jobTitle, chatId);
            } else if (action === 'client_accept') {
                await NotificationService.createNotification(
                    oid,
                    'listing_consent',
                    'Rozilik berildi',
                    `${actorName} davom etishga rozilik berdi`,
                    { chatId },
                    io
                );
            }
        }

        if (action === 'employer_reject' && io) {
            const content = rejectReason
                ? `❌ **Ariza rad etildi**\n\nSabab: ${rejectReason}`
                : '❌ **Ariza rad etildi**';
            const saved = await MessageModel.create(chatId, currentUserId, content, 'text', {
                kind: 'application_rejected',
            });
            io.to(chatId).emit('receive_message', {
                id: saved.id,
                chat_id: chatId,
                roomId: chatId,
                sender_id: currentUserId,
                sender_name: actorName,
                content,
                type: 'text',
                metadata: { kind: 'application_rejected' },
                created_at: new Date().toISOString(),
            });
            for (const oid of otherParticipantIds) {
                io.to(oid).emit('receive_message', {
                    id: saved.id,
                    chat_id: chatId,
                    roomId: chatId,
                    sender_id: currentUserId,
                    sender_name: actorName,
                    content,
                    type: 'text',
                    metadata: { kind: 'application_rejected' },
                    created_at: new Date().toISOString(),
                });
            }
        }

        res.status(200).json({ chatId, metadata: next });
    } catch (error) {
        console.error('postListingConsent error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/** Konsult/dars paneliga kirish huquqi (eskirgan xona linklarini bloklash) */
export const getConsultPanelAccessEndpoint = async (req: Request, res: Response) => {
    try {
        const chatId = req.params.chatId as string;
        const currentUserId = (req as any).user.id;
        const { getConsultPanelAccess } = await import('../../services/panelInvite.service');
        const result = await getConsultPanelAccess(chatId, String(currentUserId));
        res.status(200).json(result);
    } catch (error) {
        console.error('getConsultPanelAccess error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/** Chat to‘lov holati — service_sessions + listing_deals */
export const getChatPaymentStatusEndpoint = async (req: Request, res: Response) => {
    try {
        const chatId = req.params.chatId as string;
        const currentUserId = (req as any).user.id;
        const { getChatPaymentStatusForUser } = await import('../../services/listingPrivacy.service');
        const result = await getChatPaymentStatusForUser(chatId, String(currentUserId));
        if ('error' in result) {
            return res.status(403).json({ message: result.error });
        }
        res.status(200).json(result);
    } catch (error) {
        console.error('getChatPaymentStatus error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// ── Pin / Unpin message ──
export const pinMessage = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        const { chatId } = req.params;
        const { messageId } = req.body;
        if (!chatId || !userId) return res.status(400).json({ message: 'Missing params' });

        const isMember = await pool.query(
            'SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2',
            [chatId, userId]
        );
        if (!isMember.rows.length) return res.status(403).json({ message: 'Not a member' });

        const mid = messageId ? String(messageId) : null;

        if (mid) {
            const msgExists = await pool.query(
                'SELECT id FROM messages WHERE id = $1 AND chat_id = $2',
                [mid, chatId]
            );
            if (!msgExists.rows.length) return res.status(404).json({ message: 'Message not found' });
        }

        await pool.query(
            'UPDATE chats SET pinned_message_id = $1 WHERE id = $2',
            [mid, chatId]
        );

        const io = (req as any).app?.get?.('io');
        if (io) {
            io.to(String(chatId)).emit('message_pinned', { chatId, messageId: mid });
        }

        res.json({ ok: true, messageId: mid });
    } catch (error) {
        console.error('pinMessage error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Telegram checkChatInvite: guruh/kanal preview (token = chatId) */
export const checkChatInvite = async (req: Request, res: Response) => {
    try {
        const token = String(req.params.token || '').trim();
        const currentUserId = (req as any).user?.id;
        if (!token || !UUID_RE.test(token)) {
            return res.status(404).json({ status: 'invalid', message: 'Havola yaroqsiz' });
        }

        const chat = await ChatModel.findById(token);
        if (!chat || (chat.type !== 'group' && chat.type !== 'channel')) {
            return res.status(404).json({ status: 'not_found', message: 'Guruh topilmadi yoki havola eskirgan' });
        }

        const alreadyMember = currentUserId
            ? await ChatModel.isParticipant(chat.id, currentUserId)
            : false;

        const countRes = await pool.query(
            'SELECT COUNT(*)::int AS c FROM chat_participants WHERE chat_id = $1',
            [chat.id]
        );
        const memberCount = Number(countRes.rows[0]?.c || 0);

        const sampleRes = await pool.query(
            `SELECT u.id::text AS id, u.name, u.surname, u.avatar_url AS avatar
             FROM chat_participants cp
             LEFT JOIN users u ON u.id = cp.user_id
             WHERE cp.chat_id = $1 AND u.id IS NOT NULL
             ORDER BY u.name ASC NULLS LAST
             LIMIT 4`,
            [chat.id]
        );

        const mentorId = chat.creator_id ? String(chat.creator_id) : null;
        const requiresSubscription = chat.type === 'group' && !!mentorId;
        let hasSubscription = false;
        if (requiresSubscription && currentUserId && mentorId) {
            if (String(currentUserId) === mentorId) {
                hasSubscription = true;
            } else {
                const active = await TokenService.getActiveSubscription(currentUserId, mentorId);
                hasSubscription = !!active;
            }
        }

        const canJoin =
            !alreadyMember &&
            (!requiresSubscription || hasSubscription);

        return res.status(200).json({
            status: alreadyMember ? 'already' : 'ok',
            alreadyMember,
            requiresSubscription,
            hasSubscription,
            canJoin,
            memberCount,
            sampleMembers: sampleRes.rows,
            chat: {
                id: chat.id,
                name: chat.name,
                description: chat.description,
                avatar_url: chat.avatar_url,
                type: chat.type,
                creator_id: chat.creator_id,
            },
        });
    } catch (error) {
        console.error('checkChatInvite:', error);
        return res.status(500).json({ status: 'error', message: 'Server xatosi' });
    }
};

/** Telegram importChatInvite: havola orqali qo‘shilish */
export const joinChatInvite = async (req: Request, res: Response) => {
    try {
        const token = String(req.params.token || '').trim();
        const currentUserId = (req as any).user?.id;
        if (!currentUserId) return res.status(401).json({ message: 'Auth required' });
        if (!token || !UUID_RE.test(token)) {
            return res.status(404).json({ status: 'invalid', message: 'Havola yaroqsiz' });
        }

        const chat = await ChatModel.findById(token);
        if (!chat || (chat.type !== 'group' && chat.type !== 'channel')) {
            return res.status(404).json({ status: 'not_found', message: 'Guruh topilmadi yoki havola eskirgan' });
        }

        if (await ChatModel.isParticipant(chat.id, currentUserId)) {
            return res.status(200).json({
                status: 'already',
                message: 'Siz allaqachon a\'zosiz',
                chatId: chat.id,
                chat,
            });
        }

        const mentorId = chat.creator_id ? String(chat.creator_id) : null;
        if (chat.type === 'group' && mentorId && String(currentUserId) !== mentorId) {
            const active = await TokenService.getActiveSubscription(currentUserId, mentorId);
            if (!active) {
                return res.status(403).json({
                    status: 'needs_subscription',
                    message: 'Obuna talab qilinadi. Avval ustozga obuna bo\'ling.',
                    chatId: chat.id,
                    mentorId,
                });
            }
        }

        await ChatModel.addParticipant(chat.id, currentUserId);
        await safeDelCache(`user_chats:${currentUserId}`);

        const io = req.app.get('io');
        if (io) io.to(chat.id).emit('participant_joined', { chatId: chat.id, userId: currentUserId });

        if (chat.type === 'group' && mentorId) {
            try {
                const { markGroupJoinInvitesPaid } = await import('../../services/panelInvite.service');
                await markGroupJoinInvitesPaid(String(chat.id), String(currentUserId), io);
            } catch (e) {
                console.error('markGroupJoinInvitesPaid (invite join):', e);
            }
        }

        return res.status(200).json({
            status: 'joined',
            message: 'Guruhga qo\'shildingiz',
            chatId: chat.id,
            chat,
        });
    } catch (error: any) {
        console.error('joinChatInvite:', error);
        return res.status(500).json({ status: 'error', message: error?.message || 'Server xatosi' });
    }
};
