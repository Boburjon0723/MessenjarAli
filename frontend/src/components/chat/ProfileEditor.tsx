'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check } from 'lucide-react';
import { useSocket } from '@/context/SocketContext';
import { useNotification } from '@/context/NotificationContext';
import { useLanguage } from '@/context/LanguageContext';
import { getUser, setUser } from '@/lib/auth-storage';
import { apiFetch } from '@/lib/api';

interface ProfileEditorProps {
    onClose: () => void;
    onSave: (data: any) => void;
}

/** Telegram WebA uslubidagi «Edit Profile» ekrani */
export default function ProfileEditor({ onClose, onSave }: ProfileEditorProps) {
    const { socket } = useSocket();
    const { showSuccess, showError } = useNotification();
    const { t, language } = useLanguage();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [birthday, setBirthday] = useState('');
    const [avatar, setAvatar] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    useEffect(() => {
        const apply = (user: any) => {
            if (!user) return;
            setFirstName(user.name || '');
            setLastName(user.surname || '');
            setUsername(String(user.username || '').replace(/^@+/, ''));
            setBio(user.bio || '');
            if (user.birthday) {
                try {
                    const date = new Date(user.birthday);
                    if (!Number.isNaN(date.getTime())) {
                        const y = date.getFullYear();
                        const m = String(date.getMonth() + 1).padStart(2, '0');
                        const d = String(date.getDate()).padStart(2, '0');
                        setBirthday(`${y}-${m}-${d}`);
                    }
                } catch {
                    /* ignore */
                }
            }
            const av = user.avatar_url || user.avatar || '';
            if (av) setAvatar(av);
        };

        apply(getUser() || {});
        (async () => {
            try {
                const res = await apiFetch('/api/users/me');
                if (!res.ok) return;
                const data = await res.json();
                apply(data);
                const oldUser = getUser() || {};
                setUser({ ...oldUser, ...data } as Record<string, unknown>);
            } catch (e) {
                console.error('Fetch profile error:', e);
            }
        })();
    }, []);

    const avatarSrc = (() => {
        if (!avatar) return '';
        if (avatar.startsWith('http') || avatar.startsWith('data:')) return avatar;
        const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        return `${API}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
    })();

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) {
            e.target.value = '';
            return;
        }
        if (file.size > 6 * 1024 * 1024) {
            showError(t('server_error') as string);
            e.target.value = '';
            return;
        }
        e.target.value = '';
        setUploadingAvatar(true);
        try {
            const { uploadFileWithProgress } = await import('@/lib/upload');
            const formData = new FormData();
            formData.append('files', file);
            const data = await uploadFileWithProgress('/api/media/upload', formData);
            const url =
                (data && (data.url ?? data.urls?.[0] ?? (data.files && data.files[0]?.url))) || null;
            if (!url || typeof url !== 'string') {
                throw new Error('Rasm URL olinmadi');
            }
            const res = await apiFetch('/api/users/me', {
                method: 'PUT',
                body: JSON.stringify({ avatar_url: url }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error((err as any).message || (t('server_error') as string));
            }
            setAvatar(url);
            const oldUser = getUser() || {};
            setUser({ ...oldUser, avatar_url: url, avatar: url } as Record<string, unknown>);
            if (socket) socket.emit('update_profile', { avatar: url });
        } catch (err: any) {
            console.error(err);
            showError(err?.message || (t('server_error') as string));
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleSave = async () => {
        if (!firstName.trim()) {
            showError(t('required_name') as string);
            return;
        }
        const cleanUsername = username.trim().replace(/^@+/, '');
        if (!cleanUsername) {
            showError(t('required_username') as string);
            return;
        }

        setSaving(true);
        try {
            const payload: Record<string, unknown> = {
                name: firstName.trim(),
                surname: lastName.trim(),
                username: cleanUsername,
                bio: bio.trim(),
                birthday: birthday || null,
            };

            const res = await apiFetch('/api/users/me', {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                showError((err as any).message || (t('server_error') as string));
                return;
            }

            const oldUser = getUser() || {};
            const merged = {
                ...oldUser,
                ...payload,
                avatar: avatar || (oldUser as any).avatar,
                avatar_url: avatar || (oldUser as any).avatar_url,
            };
            setUser(merged as Record<string, unknown>);
            if (socket) {
                socket.emit('update_profile', {
                    name: payload.name,
                    surname: payload.surname,
                    username: payload.username,
                    bio: payload.bio,
                    birthday: payload.birthday,
                });
            }
            showSuccess(t('success_update') as string);
            onSave(merged);
        } catch (e: any) {
            showError(e?.message || (t('server_error') as string));
        } finally {
            setSaving(false);
        }
    };

    const fieldCls =
        'w-full bg-transparent px-4 py-3.5 text-[16px] text-white outline-none placeholder:text-[#6d7f8f]';
    const cardCls = 'rounded-xl bg-[#181818] overflow-hidden border border-white/[0.04]';

    return (
        <div className="flex flex-col flex-1 min-h-0 h-full w-full bg-[#0f0f0f] text-white overflow-hidden">
            {/* Telegram: Cancel | Edit Profile | Done */}
            <header className="shrink-0 flex items-center justify-between gap-2 px-3 h-14 bg-[#212121] border-b border-white/[0.06]">
                <button
                    type="button"
                    onClick={onClose}
                    className="min-w-[4.5rem] text-left text-[16px] font-medium text-[#6ab3f3] hover:opacity-80 px-1"
                >
                    {t('cancel')}
                </button>
                <h1 className="text-[17px] font-semibold text-white truncate">{t('edit_profile')}</h1>
                <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSave()}
                    className="min-w-[4.5rem] flex justify-end items-center text-[#6ab3f3] hover:opacity-80 disabled:opacity-40 px-1"
                    aria-label={t('save')}
                >
                    {saving ? (
                        <span className="h-5 w-5 border-2 border-[#6ab3f3]/30 border-t-[#6ab3f3] rounded-full animate-spin" />
                    ) : (
                        <Check className="h-6 w-6" strokeWidth={2.5} />
                    )}
                </button>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                <div className="mx-auto w-full max-w-[420px] pb-10">
                    {/* Avatar */}
                    <div className="flex flex-col items-center bg-[#212121] px-6 pt-6 pb-5">
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="block h-[100px] w-[100px] overflow-hidden rounded-full bg-[#8774e1] focus:outline-none"
                            >
                                {avatarSrc ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={avatarSrc}
                                        alt=""
                                        className={`h-full w-full object-cover ${uploadingAvatar ? 'opacity-50' : ''}`}
                                    />
                                ) : (
                                    <span className="flex h-full w-full items-center justify-center text-3xl font-medium text-white">
                                        {(firstName || '?')[0].toUpperCase()}
                                    </span>
                                )}
                            </button>
                            {uploadingAvatar && (
                                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                </div>
                            )}
                            {!uploadingAvatar && (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#6ab3f3] text-white shadow-lg"
                                    aria-label={t('upload_photo')}
                                >
                                    <Camera className="h-3.5 w-3.5" />
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => void handleAvatarChange(e)}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-3 text-[15px] font-medium text-[#6ab3f3]"
                        >
                            {t('upload_photo')}
                        </button>
                    </div>

                    <div className="h-3 bg-[#0f0f0f]" />

                    {/* Name group — Telegram style */}
                    <div className="px-4 py-3 space-y-3">
                        <div className={cardCls}>
                            <input
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className={fieldCls}
                                placeholder={t('name')}
                                autoComplete="given-name"
                            />
                            <div className="h-px bg-white/[0.06] mx-4" />
                            <input
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className={fieldCls}
                                placeholder={t('surname')}
                                autoComplete="family-name"
                            />
                        </div>
                        <p className="px-1 text-[13px] leading-snug text-[#6d7f8f]">
                            {language === 'uz'
                                ? 'Ismingiz Telegramdagi kabi kontaktlarda ko‘rinadi.'
                                : language === 'ru'
                                  ? 'Ваше имя будет видно в контактах, как в Telegram.'
                                  : 'Your name will appear in contacts, like in Telegram.'}
                        </p>
                    </div>

                    <div className="h-3 bg-[#0f0f0f]" />

                    {/* Bio */}
                    <div className="px-4 py-3 space-y-2">
                        <div className={cardCls}>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value.slice(0, 70))}
                                rows={3}
                                maxLength={70}
                                className={`${fieldCls} resize-none leading-relaxed`}
                                placeholder={t('bio')}
                            />
                        </div>
                        <div className="flex justify-between px-1 text-[13px] text-[#6d7f8f]">
                            <span>
                                {language === 'uz'
                                    ? 'O‘zingiz haqingizda qisqacha'
                                    : language === 'ru'
                                      ? 'Коротко о себе'
                                      : 'A few words about yourself'}
                            </span>
                            <span>{bio.length}/70</span>
                        </div>
                    </div>

                    <div className="h-3 bg-[#0f0f0f]" />

                    {/* Username */}
                    <div className="px-4 py-3 space-y-2">
                        <div className={`${cardCls} flex items-center`}>
                            <span className="pl-4 text-[16px] text-[#6ab3f3]">@</span>
                            <input
                                value={username}
                                onChange={(e) =>
                                    setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))
                                }
                                className={`${fieldCls} pl-1`}
                                placeholder="username"
                                autoComplete="username"
                            />
                        </div>
                        <p className="px-1 text-[13px] leading-snug text-[#6d7f8f]">
                            {t('username_desc')}
                        </p>
                    </div>

                    <div className="h-3 bg-[#0f0f0f]" />

                    {/* Birthday */}
                    <div className="px-4 py-3 space-y-2">
                        <div className={cardCls}>
                            <label className="block px-4 pt-3 text-[13px] text-[#6d7f8f]">
                                {t('birthday')}
                            </label>
                            <input
                                type="date"
                                value={birthday}
                                onChange={(e) => setBirthday(e.target.value)}
                                className={`${fieldCls} pt-1 pb-3.5 [color-scheme:dark]`}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
