import { Request, Response } from 'express';
import { pool } from '../../config/database';
import { categoryKeywordPatterns } from '../../utils/job-category-keywords';
import { PushTokenModel } from '../../models/postgres/PushToken';

const normalizePricingModel = (value: unknown): 'hourly' | 'session' | 'monthly' | null => {
    if (value === 'hourly' || value === 'session' || value === 'monthly') return value;
    return null;
};

export const getUsers = async (req: Request, res: Response) => {
    try {
        const currentUser = (req as any).user || {};
        const isAdmin = currentUser?.role === 'admin';
        const selectFields = isAdmin
            ? 'id, name, surname, username, phone, avatar_url'
            : 'id, name, surname, username, avatar_url';
        const result = await pool.query(`SELECT ${selectFields} FROM users LIMIT 50`);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Get Users Error:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
};

export const getUserById = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        // UUID validation (Relaxed)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(userId as string)) {
            console.warn('[getUserById] Invalid UUID format received:', userId);
            return res.status(404).json({ message: 'Invalid user ID format' });
        }

        const result = await pool.query(`
            SELECT u.id, u.name, u.surname, u.age, u.email, u.phone, u.username, u.avatar_url,
                   p.bio, p.birthday, p.is_expert, p.profession, p.specialization, p.experience_years,
                   p.service_price, p.working_hours, p.languages, p.verified_status,
                   p.wiloyat, p.tuman, p.specialization_details, p.has_diploma,
                   p.institution, p.current_workplace, p.diploma_url, p.certificate_url,
                   p.id_url, p.selfie_url, p.resume_url, p.anketa_url, p.pricing_model,
                   p.hourly_rate, p.currency, p.service_languages,
                   p.service_format, p.bio_expert, p.specialty_desc, p.expert_proposal, p.services_json
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            WHERE u.id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            console.warn('[getUserById] User not found for ID:', userId);
            return res.status(404).json({ message: 'User not found' });
        }

        // Check block status
        // @ts-ignore
        const currentUserId = req.user.id;
        const blockCheck = await pool.query(`
            SELECT blocker_id FROM user_blocks 
            WHERE (blocker_id = $1 AND blocked_id = $2) 
               OR (blocker_id = $2 AND blocked_id = $1)
        `, [currentUserId, userId]);

        const isBlocked = blockCheck.rows.length > 0;
        const blockedByMe = blockCheck.rows.some(r => r.blocker_id === currentUserId);

        const row = { ...result.rows[0], isBlocked, blockedByMe };
        const { shouldMaskPhoneBetweenUsers } = await import('../../services/listingPrivacy.service');
        if (await shouldMaskPhoneBetweenUsers(String(currentUserId), String(userId))) {
            delete row.phone;
            row.listing_privacy = true;
        }

        res.json(row);
    } catch (e: any) {
        console.error('[getUserById] DATABASE ERROR:', e);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getProfile = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const result = await pool.query(`
            SELECT u.id, u.name, u.surname, u.age, u.email, u.phone, u.username, u.avatar_url,
                   p.bio, p.birthday, p.is_expert, p.profession, p.specialization, p.experience_years,
                   p.service_price, p.working_hours, p.languages, p.verified_status,
                   p.wiloyat, p.tuman, p.specialization_details, p.has_diploma,
                   p.institution, p.current_workplace, p.diploma_url, p.certificate_url,
                   p.id_url, p.selfie_url, p.resume_url, p.anketa_url, p.pricing_model,
                   p.hourly_rate, p.currency, p.service_languages,
                   p.service_format, p.bio_expert, p.specialty_desc, p.expert_proposal, p.services_json,
                   p.expert_groups
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            WHERE u.id = $1
        `, [userId]);

        if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });

        res.json(result.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateProfile = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const {
            name, surname, username, bio, avatar_url, birthday,
            is_expert, profession, specialization, experience_years,
            service_price, working_hours, languages, wiloyat, tuman,
            specialization_details, has_diploma, institution, current_workplace,
            diploma_url, certificate_url, id_url, selfie_url,
            hourly_rate, currency, service_languages, service_format,
            bio_expert, specialty_desc, expert_proposal, services_json, expert_groups, expert_fee_total,
            resume_url, anketa_url, pricing_model
        } = req.body;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Check Username Uniqueness
            if (username) {
                const check = await client.query('SELECT id FROM users WHERE username = $1 AND id != $2', [username, userId]);
                if (check.rows.length > 0) {
                    throw new Error('Username already taken');
                }
            }

            // Update User Table
            await client.query(
                `UPDATE users SET name = COALESCE($1, name), surname = COALESCE($2, surname), username = COALESCE($3, username), avatar_url = COALESCE($4, avatar_url), updated_at = NOW() WHERE id = $5`,
                [name, surname, username, avatar_url, userId]
            );

            // Update Profile Table
            const profileRes = await client.query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]);
            const existingProfile = profileRes.rows[0];

            if (is_expert === true) {
                // Basic validation for becoming an expert
                if (!profession || !specialization || !experience_years || !hourly_rate) {
                    throw new Error('Expert profiles require profession, specialization, experience, and hourly rate');
                }
            }

            if (!existingProfile) {
                await client.query(
                    `INSERT INTO user_profiles (
                        user_id, bio, birthday, is_expert, profession, specialization,
                        experience_years, service_price, working_hours, languages,
                        wiloyat, tuman, verified_status, specialization_details,
                        has_diploma, institution, current_workplace, diploma_url,
                        certificate_url, id_url, selfie_url, resume_url, anketa_url, pricing_model,
                        hourly_rate, currency,
                        service_languages, service_format, bio_expert, specialty_desc, expert_proposal,
                        services_json, expert_groups
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33)`,
                    [
                        userId, bio || '', birthday || null, is_expert || false, profession || '', specialization || '',
                        experience_years || 0, service_price || 0, working_hours || '', languages || '',
                        wiloyat || '', tuman || '', is_expert ? 'pending' : 'none',
                        specialization_details || '', has_diploma || false, institution || '',
                        current_workplace || '', diploma_url || '', certificate_url || '',
                        id_url || '', selfie_url || '', resume_url || '', anketa_url || '', normalizePricingModel(pricing_model),
                        hourly_rate || 0, currency || 'MALI',
                        service_languages || '', service_format || '', bio_expert || '',
                        specialty_desc || '', expert_proposal || '', services_json || '[]', expert_groups || '[]'
                    ]
                );
            } else {
                // EXPERT RE-VERIFICATION LOGIC
                // If an approved expert changes their core credentials, reset to pending
                let newVerifiedStatus = existingProfile.verified_status;

                const criticalFieldsChanged =
                    (profession && profession !== existingProfile.profession) ||
                    (specialization && specialization !== existingProfile.specialization) ||
                    (specialization_details && specialization_details !== existingProfile.specialization_details) ||
                    (experience_years && parseInt(experience_years) !== parseInt(existingProfile.experience_years));

                if (is_expert === true && (existingProfile.verified_status === 'none' || existingProfile.verified_status === 'rejected' || existingProfile.verified_status === 'unverified' || !existingProfile.verified_status)) {
                    newVerifiedStatus = 'pending';
                } else if (
                    is_expert === true &&
                    existingProfile.verified_status === 'approved' &&
                    criticalFieldsChanged
                ) {
                    newVerifiedStatus = 'pending';
                } else if (is_expert === false) {
                    // Rejim o'chirilganda tasdiq va forma ma'lumotlari saqlanadi
                    newVerifiedStatus = existingProfile.verified_status;
                }

                await client.query(
                    `UPDATE user_profiles SET 
                        bio = COALESCE($1, bio),
                        birthday = COALESCE($2, birthday),
                        is_expert = COALESCE($3, is_expert),
                        profession = COALESCE($4, profession),
                        specialization = COALESCE($5, specialization),
                        experience_years = COALESCE($6, experience_years),
                        service_price = COALESCE($7, service_price),
                        working_hours = COALESCE($8, working_hours),
                        languages = COALESCE($9, languages),
                        wiloyat = COALESCE($10, wiloyat),
                        tuman = COALESCE($11, tuman),
                        verified_status = $12,
                        specialization_details = COALESCE($13, specialization_details),
                        has_diploma = COALESCE($14, has_diploma),
                        institution = COALESCE($15, institution),
                        current_workplace = COALESCE($16, current_workplace),
                        diploma_url = COALESCE($17, diploma_url),
                        certificate_url = COALESCE($18, certificate_url),
                        id_url = COALESCE($19, id_url),
                        selfie_url = COALESCE($20, selfie_url),
                        hourly_rate = COALESCE($21, hourly_rate),
                        currency = COALESCE($22, currency),
                        service_languages = COALESCE($23, service_languages),
                        service_format = COALESCE($24, service_format),
                        bio_expert = COALESCE($25, bio_expert),
                        specialty_desc = COALESCE($26, specialty_desc),
                        expert_proposal = COALESCE($27, expert_proposal),
                        services_json = COALESCE($28, services_json),
                        expert_groups = COALESCE($29, expert_groups),
                        resume_url = COALESCE($30, resume_url),
                        anketa_url = COALESCE($31, anketa_url),
                        pricing_model = COALESCE($32, pricing_model)
                    WHERE user_id = $33`,
                    [
                        bio, birthday || null, is_expert, profession, specialization,
                        experience_years, service_price, working_hours, languages,
                        wiloyat, tuman, newVerifiedStatus, specialization_details,
                        has_diploma, institution, current_workplace, diploma_url,
                        certificate_url, id_url, selfie_url, hourly_rate, currency,
                        service_languages, service_format, bio_expert, specialty_desc,
                        expert_proposal,
                        services_json, expert_groups || null,
                        resume_url, anketa_url,
                        normalizePricingModel(pricing_model),
                        userId
                    ]
                );
            }

            await client.query('COMMIT');

            // Broadcast profile update via Socket.IO
            const io = req.app.get('io');
            if (io) {
                io.emit('profile_updated', {
                    userId: userId,
                    avatar_url: avatar_url,
                    name: name,
                    surname: surname,
                    username: username,
                    bio: bio,
                    birthday: birthday
                });
            }

            res.json({ message: 'Profile updated successfully' });

        } catch (e: any) {
            console.error('[updateProfile] Transaction Error:', e);
            await client.query('ROLLBACK');
            res.status(400).json({ message: e.message || 'Transaction failed' });
        } finally {
            client.release();
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error' });
    }
};

export const listExperts = async (req: Request, res: Response) => {
    try {
        const currentUserId = (req as any).user?.id;
        const { q, category_id, type, limit = '80', offset = '0' } = req.query;

        let query = `
            SELECT u.id, u.name, u.surname, u.username, u.avatar_url,
                   p.is_expert, p.profession, p.specialization, p.specialization_details,
                   p.experience_years, p.service_price, p.hourly_rate, p.pricing_model, p.currency,
                   p.verified_status, p.specialty_desc, p.expert_proposal, p.service_format,
                   p.bio_expert, p.wiloyat, p.rating AS expert_rating
            FROM users u
            INNER JOIN user_profiles p ON u.id = p.user_id
            WHERE p.is_expert = TRUE AND p.verified_status = 'approved'
        `;
        const params: any[] = [];
        let pIndex = 1;

        if (currentUserId) {
            query += ` AND u.id != $${pIndex}`;
            params.push(currentUserId);
            pIndex++;
        }

        if (q && typeof q === 'string' && q.trim()) {
            const qs = `%${q.trim()}%`;
            query += ` AND (
                u.name ILIKE $${pIndex} OR u.surname ILIKE $${pIndex} OR u.username ILIKE $${pIndex}
                OR COALESCE(p.profession,'') ILIKE $${pIndex}
                OR COALESCE(p.specialization,'') ILIKE $${pIndex}
                OR COALESCE(p.specialization_details,'') ILIKE $${pIndex}
                OR COALESCE(p.specialty_desc,'') ILIKE $${pIndex}
            )`;
            params.push(qs);
            pIndex++;
        }

        const catNum = category_id != null ? Number(category_id) : NaN;
        if (Number.isFinite(catNum) && catNum > 0) {
            const patterns = categoryKeywordPatterns(catNum);
            if (patterns?.length) {
                query += ` AND (
                    COALESCE(p.profession,'') ILIKE ANY($${pIndex}::text[])
                    OR COALESCE(p.specialization,'') ILIKE ANY($${pIndex}::text[])
                    OR COALESCE(p.specialization_details,'') ILIKE ANY($${pIndex}::text[])
                    OR COALESCE(p.specialty_desc,'') ILIKE ANY($${pIndex}::text[])
                )`;
                params.push(patterns);
                pIndex++;
            }
        }

        if (type === 'online') {
            query += ` AND (
                COALESCE(p.service_format,'') ILIKE '%online%'
                OR COALESCE(p.service_format,'') ILIKE '%video%'
            )`;
        } else if (type === 'offline') {
            query += ` AND (
                COALESCE(p.service_format,'') ILIKE '%offline%'
                OR COALESCE(p.service_format,'') ILIKE '%joyida%'
                OR COALESCE(p.wiloyat,'') <> ''
            )`;
        }

        const lim = Math.min(Math.max(parseInt(String(limit), 10) || 80, 1), 100);
        const off = Math.max(parseInt(String(offset), 10) || 0, 0);

        query += ` ORDER BY p.rating DESC NULLS LAST, u.name ASC LIMIT $${pIndex} OFFSET $${pIndex + 1}`;
        params.push(lim, off);

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (e) {
        console.error('List Experts Error:', e);
        res.status(500).json({ message: 'Failed to fetch experts' });
    }
};

export const searchUsers = async (req: Request, res: Response) => {
    try {
        const { q, phone, expert, profession, searchBy } = req.query;
        // @ts-ignore
        const currentUserId = String(req.user?.id || '');

        let query = `
            SELECT u.id, u.name, u.surname, u.username, u.avatar_url, u.phone,
                   p.is_expert, p.profession, p.specialization, p.experience_years,
                   p.service_price, p.hourly_rate, p.pricing_model, p.currency, p.languages,
                   p.verified_status, p.specialization_details, p.bio_expert,
                   p.specialty_desc, p.expert_proposal, p.service_languages, p.service_format,
                   p.institution, p.current_workplace, p.expert_groups, p.wiloyat,
                   p.rating AS expert_rating
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            WHERE 1=1
        `;
        const params: any[] = [];
        let pIndex = 1;
        let viewerParamIdx: number | null = null;

        if (currentUserId) {
            params.push(currentUserId);
            viewerParamIdx = pIndex;
            pIndex++;
        }

        const appendListingPeerExclude = () => {
            if (viewerParamIdx == null) return;
            query += `
            AND NOT EXISTS (
                SELECT 1 FROM chats lc
                INNER JOIN chat_participants lcp1 ON lcp1.chat_id = lc.id AND lcp1.user_id = $${viewerParamIdx}::uuid
                INNER JOIN chat_participants lcp2 ON lcp2.chat_id = lc.id AND lcp2.user_id = u.id
                WHERE lc.type = 'private'
                  AND (
                    (lc.metadata->>'source' = 'expert_listing' AND lc.metadata->>'expert_id' IS NOT NULL)
                    OR (lc.metadata->>'source' = 'job_listing' AND lc.metadata->>'intent' = 'apply')
                  )
            )`;
        };

        const isExpertSearch = expert === 'true';
        const usernameOnly = searchBy === 'username';

        // Strict phone search (priority) — faqat searchBy=username bo‘lmaganda
        if (!usernameOnly && phone && typeof phone === 'string') {
            query += ` AND u.phone = $${pIndex}`;
            params.push(phone);
            pIndex++;
            appendListingPeerExclude();
        } else if (q && typeof q === 'string') {
            const queryStr = q.startsWith('@') ? q.substring(1) : q;
            if (queryStr.length < 2) {
                // Too short - return empty unless it's a phone-like string or expert listing
                if (!/^\+?[0-9\s-]{5,}$/.test(queryStr) && !isExpertSearch) {
                    return res.json([]);
                }
            }

            if (usernameOnly) {
                query += ` AND u.username ILIKE $${pIndex}`;
                params.push(`%${queryStr}%`);
                pIndex++;
            } else if (/^\+?[0-9\s-]{5,}$/.test(queryStr)) {
                query += ` AND (u.phone ILIKE $${pIndex} OR u.username ILIKE $${pIndex} OR u.name ILIKE $${pIndex})`;
                params.push(`%${queryStr}%`);
                pIndex++;
                appendListingPeerExclude();
            } else {
                query += ` AND (u.username ILIKE $${pIndex} OR u.name ILIKE $${pIndex} OR u.surname ILIKE $${pIndex})`;
                params.push(`%${queryStr}%`);
                pIndex++;
            }
        } else if (!isExpertSearch) {
            // No search params and not an expert listing - return empty or keep list small (prevents dumping all users)
            return res.json([]);
        }

        if (isExpertSearch) {
            query += ` AND p.is_expert = TRUE AND p.verified_status IN ('approved', 'pending')`;
        }

        if (profession) {
            query += ` AND p.profession ILIKE $${pIndex}`;
            params.push(`%${profession}%`);
            pIndex++;
        }

        query += ` LIMIT 20`;

        const result = await pool.query(query, params);
        const { shouldMaskPhoneBetweenUsers } = await import('../../services/listingPrivacy.service');
        const rows = await Promise.all(
            result.rows.map(async (row: Record<string, unknown>) => {
                if (
                    currentUserId &&
                    (await shouldMaskPhoneBetweenUsers(currentUserId, String(row.id)))
                ) {
                    const next = { ...row };
                    delete next.phone;
                    return { ...next, listing_privacy: true };
                }
                return row;
            })
        );
        res.json(rows);
    } catch (e) {
        console.error('Search Users Error:', e);
        res.status(500).json({ message: 'Search failed' });
    }
};

export const addContact = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { contactUserId, name, surname } = req.body;

        if (!contactUserId) return res.status(400).json({ message: 'Contact user ID is required' });

        // UUID validation (Relaxed)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(contactUserId)) {
            console.warn(`[addContact] Invalid UUID received: ${contactUserId}`);
            return res.status(400).json({ message: 'Noto\'g\'ri foydalanuvchi ID formati' });
        }

        if (String(userId) === String(contactUserId)) {
            return res.status(400).json({ message: 'O\'zingizni kontakt sifatida qo\'sha olmaysiz' });
        }

        // Check if user exists and is active
        const userCheck = await pool.query(
            `SELECT id FROM users WHERE id = $1 AND COALESCE(is_active, true) = true`,
            [contactUserId]
        );
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ message: "Foydalanuvchi topilmadi yoki akkaunt o'chirilgan" });
        }

        /**
         * Ba’zi ishlab chiqarish bazalarida (user_id, contact_user_id) uchun UNIQUE/ON CONFLICT
         * yo‘q bo‘lishi mumkin — ON CONFLICT 500 bermasligi uchun oddiy upsert.
         */
        const existing = await pool.query(
            `SELECT 1 FROM user_contacts WHERE user_id = $1 AND contact_user_id = $2 LIMIT 1`,
            [userId, contactUserId]
        );
        if (existing.rows.length > 0) {
            await pool.query(
                `UPDATE user_contacts SET custom_name = $1, custom_surname = $2
                 WHERE user_id = $3 AND contact_user_id = $4`,
                [name ?? null, surname ?? null, userId, contactUserId]
            );
        } else {
            await pool.query(
                `INSERT INTO user_contacts (user_id, contact_user_id, custom_name, custom_surname)
                 VALUES ($1, $2, $3, $4)`,
                [userId, contactUserId, name ?? null, surname ?? null]
            );
        }

        res.status(200).json({ message: 'Kontakt muvaffaqiyatli saqlandi (Faqat sizga ko\'rinadi)' });
    } catch (err) {
        console.error('Add Contact Error:', err);
        res.status(500).json({ message: 'Kontaktni qo\'shishda xato yuz berdi' });
    }
};

export const getContacts = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;

        const result = await pool.query(`
            SELECT uc.id as contact_id, uc.custom_name, uc.custom_surname,
                   u.id, u.name as original_name, u.surname as original_surname, 
                   u.username, u.avatar_url, u.phone
            FROM user_contacts uc
            JOIN users u ON uc.contact_user_id = u.id
            WHERE uc.user_id = $1
              AND COALESCE(u.is_active, true) = true
            ORDER BY uc.created_at DESC
        `, [userId]);

        // O'chirilgan userga bog'langan eskirgan kontaktlarni tozalash
        void pool
            .query(
                `DELETE FROM user_contacts uc
                 WHERE uc.user_id = $1
                   AND NOT EXISTS (
                     SELECT 1 FROM users u
                     WHERE u.id = uc.contact_user_id AND COALESCE(u.is_active, true) = true
                   )`,
                [userId]
            )
            .catch(() => {});

        // Map to standard user object but prioritize custom name if provided
        const { shouldMaskPhoneBetweenUsers } = await import('../../services/listingPrivacy.service');
        const enriched = await Promise.all(
            result.rows.map(async (row) => {
                const contactId = String(row.id);
                const base = {
                    id: row.id,
                    name: row.custom_name || row.original_name,
                    surname: row.custom_surname || row.original_surname,
                    username: row.username,
                    avatar: row.avatar_url,
                    phone: row.phone as string | undefined,
                    status: 'offline' as const,
                };
                if (await shouldMaskPhoneBetweenUsers(String(userId), contactId)) {
                    delete base.phone;
                    return { ...base, listing_privacy: true };
                }
                return base;
            })
        );

        res.json(enriched);
    } catch (err) {
        console.error('Get Contacts Error:', err);
        res.status(500).json({ message: 'Failed to fetch contacts' });
    }
};

export const removeContact = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { contactId } = req.params;

        if (!contactId) return res.status(400).json({ message: 'Contact user ID is required' });

        // Telegram: faqat o‘zingizning kontakt yozuvingiz o‘chadi — chat/tarix qoladi
        const result = await pool.query(
            `DELETE FROM user_contacts
             WHERE user_id = $1 AND contact_user_id = $2`,
            [userId, contactId]
        );

        if ((result.rowCount ?? 0) === 0) {
            return res.status(404).json({ message: 'Kontakt topilmadi' });
        }

        const io = req.app.get('io');
        if (io) {
            io.to(String(userId)).emit('contact_removed', {
                contactUserId: String(contactId),
            });
        }

        res.status(200).json({ message: 'Kontakt o‘chirildi (suhbat saqlanadi)' });
    } catch (err) {
        console.error('Remove Contact Error:', err);
        res.status(500).json({ message: "Kontaktni o'chirishda xatolik yuz berdi" });
    }
};

export const blockUser = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { targetId } = req.body;
        if (!targetId) return res.status(400).json({ message: 'Target user ID is required' });

        await pool.query(
            'INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [userId, targetId]
        );
        res.json({ message: 'Foydalanuvchi bloklandi' });
    } catch (e) {
        console.error('Block User Error:', e);
        res.status(500).json({ message: 'Bloklashda xatolik' });
    }
};

export const unblockUser = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { targetId } = req.body;
        if (!targetId) return res.status(400).json({ message: 'Target user ID is required' });

        await pool.query(
            'DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2',
            [userId, targetId]
        );
        res.json({ message: 'Blokdan chiqarildi' });
    } catch (e) {
        console.error('Unblock User Error:', e);
        res.status(500).json({ message: 'Blokdan chiqarishda xatolik' });
    }
};

export const updateContact = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { contactUserId, name, surname } = req.body;
        if (!contactUserId) return res.status(400).json({ message: 'Contact user ID is required' });

        await pool.query(`
            UPDATE user_contacts 
            SET custom_name = $1, custom_surname = $2 
            WHERE user_id = $3 AND contact_user_id = $4
        `, [name, surname, userId, contactUserId]);

        res.json({ message: 'Kontakt ma\'lumotlari yangilandi' });
    } catch (e) {
        console.error('Update Contact Error:', e);
        res.status(500).json({ message: 'Kontaktni tahrirlashda xatolik' });
    }
};

export const getChatStats = async (req: Request, res: Response) => {
    try {
        const { chatId } = req.params;
        // @ts-ignore
        const userId = req.user.id;

        // 1. Link count (Search for http/https in content) - Simple regex
        const linksRes = await pool.query(`
            SELECT COUNT(*) FROM messages 
            WHERE chat_id = $1 AND (content ILIKE '%http://%' OR content ILIKE '%https://%')
        `, [chatId]);

        // 2. Voice messages count
        const voiceRes = await pool.query(`
            SELECT COUNT(*) FROM messages 
            WHERE chat_id = $1 AND type = 'voice'
        `, [chatId]);

        // 3. Common groups count
        const otherParticipantRes = await pool.query(`
            SELECT user_id FROM chat_participants 
            WHERE chat_id = $1 AND user_id != $2
        `, [chatId, userId]);

        let commonGroupsCount = 0;
        if (otherParticipantRes.rows.length > 0) {
            const otherUserId = otherParticipantRes.rows[0].user_id;
            const groupsRes = await pool.query(`
                SELECT COUNT(DISTINCT c.id) as count
                FROM chats c
                JOIN chat_participants p1 ON c.id = p1.chat_id
                JOIN chat_participants p2 ON c.id = p2.chat_id
                WHERE c.type = 'group' AND p1.user_id = $1 AND p2.user_id = $2
            `, [userId, otherUserId]);
            commonGroupsCount = parseInt(groupsRes.rows[0].count);
        }

        res.json({
            linksCount: parseInt(linksRes.rows[0].count),
            voiceCount: parseInt(voiceRes.rows[0].count),
            commonGroupsCount: commonGroupsCount
        });
    } catch (e) {
        console.error('Get Chat Stats Error:', e);
        res.status(500).json({ message: 'Statistikani olishda xatolik' });
    }
};

/** Telegram profile: Links / Voice / Common groups ro‘yxatlari */
export const getChatSharedMedia = async (req: Request, res: Response) => {
    try {
        const { chatId } = req.params;
        const kind = String((req.query as { kind?: string }).kind || '').toLowerCase();
        // @ts-ignore
        const userId = req.user.id;
        const cid = String(chatId);

        const part = await pool.query(
            `SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2 LIMIT 1`,
            [cid, userId]
        );
        if ((part.rowCount ?? 0) === 0) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (kind === 'links') {
            const r = await pool.query(
                `SELECT id, content, type, created_at, sender_id
                 FROM messages
                 WHERE chat_id = $1
                   AND (content ILIKE '%http://%' OR content ILIKE '%https://%')
                 ORDER BY created_at DESC
                 LIMIT 100`,
                [cid]
            );
            return res.json(
                r.rows.map((row: any) => ({
                    id: String(row.id),
                    content: row.content,
                    type: row.type,
                    created_at: row.created_at,
                    sender_id: row.sender_id != null ? String(row.sender_id) : null,
                }))
            );
        }

        if (kind === 'voice') {
            const r = await pool.query(
                `SELECT id, content, type, metadata, created_at, sender_id
                 FROM messages
                 WHERE chat_id = $1 AND type = 'voice'
                 ORDER BY created_at DESC
                 LIMIT 100`,
                [cid]
            );
            return res.json(
                r.rows.map((row: any) => ({
                    id: String(row.id),
                    content: row.content,
                    type: row.type,
                    metadata: row.metadata,
                    created_at: row.created_at,
                    sender_id: row.sender_id != null ? String(row.sender_id) : null,
                }))
            );
        }

        if (kind === 'groups') {
            const other = await pool.query(
                `SELECT user_id FROM chat_participants WHERE chat_id = $1 AND user_id != $2 LIMIT 1`,
                [cid, userId]
            );
            if (other.rows.length === 0) return res.json([]);
            const otherUserId = other.rows[0].user_id;
            const r = await pool.query(
                `SELECT c.id, c.name, c.avatar, c.type
                 FROM chats c
                 JOIN chat_participants p1 ON c.id = p1.chat_id AND p1.user_id = $1
                 JOIN chat_participants p2 ON c.id = p2.chat_id AND p2.user_id = $2
                 WHERE c.type = 'group'
                 ORDER BY c.name ASC NULLS LAST
                 LIMIT 100`,
                [userId, otherUserId]
            );
            return res.json(
                r.rows.map((row: any) => ({
                    id: String(row.id),
                    name: row.name || 'Group',
                    avatar: row.avatar || null,
                    type: row.type,
                }))
            );
        }

        return res.status(400).json({ message: 'kind=links|voice|groups kerak' });
    } catch (e) {
        console.error('Get Chat Shared Media Error:', e);
        res.status(500).json({ message: 'Shared media olishda xatolik' });
    }
};

export const registerPushToken = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { token, platform } = req.body;
        if (!token) return res.status(400).json({ message: 'token is required' });
        await PushTokenModel.upsert(userId, token, platform || 'unknown');
        res.status(200).json({ ok: true });
    } catch (e) {
        console.error('Register Push Token Error:', e);
        res.status(500).json({ message: 'Internal server error' });
    }
};
