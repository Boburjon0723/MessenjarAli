import React, { useEffect, useRef, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import AddGroupMemberModal from './AddGroupMemberModal';
import { X } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { useConfirm } from '@/context/ConfirmContext';
import { apiFetch } from '@/lib/api';
import { getPublicApiUrl } from '@/lib/public-origin';

interface GroupInfoPanelProps {
    chat: any;
    onClose?: () => void;
    onDeleted?: () => void;
    onLeft?: () => void;
    onGroupUpdated?: () => void;
    /** 404 (guruh backendda yo‘q) bo‘lganda chaqiriladi – ro‘yxat yangilash uchun */
    onChatNotFound?: () => void;
}

export default function GroupInfoPanel({ chat, onClose, onDeleted, onLeft, onGroupUpdated, onChatNotFound }: GroupInfoPanelProps) {
    const { showSuccess, showError } = useNotification();
    const { confirm } = useConfirm();
    const [fullChatDetails, setFullChatDetails] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [actionLoading, setActionLoading] = useState<'delete' | 'leave' | null>(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editNameValue, setEditNameValue] = useState('');
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    /** Bir xil guruh uchun panel yopib-ochganda API qayta chaqirilmasin */
    const lastFetchedGroupIdRef = useRef<string | null>(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setCurrentUser(user);
    }, []);

    const API_URL = getPublicApiUrl();

    const fetchGroupDetails = async () => {
        if (!chat || chat.type !== 'group') return;
        setLoading(true);
        try {
            const res = await apiFetch(`/api/chats/${chat.id || chat._id}`);
            if (res.ok) {
                const data = await res.json();
                setFullChatDetails(data);
            }
        } catch (err) {
            console.error("Failed to fetch group details:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!chat) {
            setFullChatDetails(null);
            lastFetchedGroupIdRef.current = null;
            return;
        }
        if (chat.type !== 'group') return;
        const id = String(chat.id || chat._id);
        if (lastFetchedGroupIdRef.current === id) return;
        lastFetchedGroupIdRef.current = id;
        setFullChatDetails(null);
        void fetchGroupDetails();
    }, [chat?.id, chat?.type]);

    const handleAddMember = async (user: any) => {
        if (!chat) return;
        const userId = user?.id != null ? String(user.id) : '';
        if (!userId) {
            showError('Foydalanuvchi ID topilmadi.');
            return;
        }
        try {
            const res = await apiFetch(`/api/chats/${chat.id || chat._id}/participants`, {
                method: 'POST',
                body: JSON.stringify({ userId }),
            });

            if (res.ok) {
                await fetchGroupDetails();
                setShowAddMemberModal(false);
                onGroupUpdated?.();
            } else {
                let msg = 'A\'zoni qo\'shib bo\'lmadi.';
                try {
                    const err = await res.json();
                    msg = err?.message || msg;
                } catch { /* not json */ }
                console.error('Failed to add member:', res.status, msg);
                showError(msg);
            }
        } catch (err) {
            console.error('Failed to add member:', err);
            showError('Tarmoq xatosi. Qayta urinib ko\'ring.');
        }
    };

    const isCreator = Boolean(
        fullChatDetails?.creator_id &&
            currentUser?.id &&
            String(fullChatDetails.creator_id) === String(currentUser.id)
    );

    const handleDeleteGroup = async () => {
        if (!chat) return;
        const ok = await confirm({
            title: "Guruhni o'chirish",
            description: "Guruh butunlay o‘chiriladi. Rostan ham davom etasizmi?",
            variant: 'danger',
            confirmLabel: "O'chirish"
        });
        if (!ok) return;
        setActionLoading('delete');
        try {
            const res = await apiFetch(`/api/chats/${chat.id || chat._id}`, {
                method: 'DELETE',
            });
            const data = res.ok ? null : await res.json().catch(() => ({}));
            if (res.ok) {
                onDeleted?.();
                onClose?.();
            } else {
                showError(data?.message || "Guruhni o‘chirib bo‘lmadi.");
            }
        } catch (err) {
            console.error("Delete group error:", err);
            showError("Xatolik yuz berdi.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleLeaveGroup = async () => {
        if (!chat) return;
        const ok = await confirm({
            title: "Guruhdan chiqish",
            description: "Guruhdan chiqasizmi?",
            confirmLabel: "Chiqish"
        });
        if (!ok) return;
        setActionLoading('leave');
        try {
            const res = await apiFetch(`/api/chats/${chat.id || chat._id}/leave`, {
                method: 'POST',
            });
            const data = res.ok ? null : await res.json().catch(() => ({}));
            if (res.ok) {
                onLeft?.();
                onClose?.();
            } else {
                showError(data?.message || "Guruhdan chiqib bo‘lmadi.");
            }
        } catch (err) {
            console.error("Leave group error:", err);
            showError("Xatolik yuz berdi.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleUpdateName = async () => {
        const name = editNameValue.trim();
        if (!chat || !name || name === (fullChatDetails?.name ?? chat?.name)) {
            setIsEditingName(false);
            return;
        }
        try {
            const res = await apiFetch(`/api/chats/${chat.id || chat._id}`, {
                method: 'PATCH',
                body: JSON.stringify({ name }),
            });
            if (res.ok) {
                setFullChatDetails((prev: any) => prev ? { ...prev, name } : null);
                setIsEditingName(false);
                onGroupUpdated?.();
            } else {
                const data = await res.json().catch(() => ({}));
                showError(data?.message || "Nom yangilanmadi.");
            }
        } catch (err) {
            console.error("Update group name:", err);
            showError("Xatolik yuz berdi.");
        }
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!chat || !file || !file.type.startsWith('image/')) {
            e.target.value = '';
            return;
        }
        const maxBytes = 6 * 1024 * 1024;
        if (file.size > maxBytes) {
            showError('Rasm hajmi 6 MB dan kichik bo‘lsin.');
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
            const url = (data && (data.url ?? data.urls?.[0] ?? (data.files && data.files[0]?.url))) || null;
            if (!url || typeof url !== 'string') {
                throw new Error(data?.message || data?.error || 'Rasm URL olinmadi');
            }
            const chatId = fullChatDetails?.id ?? chat.id ?? chat._id;
            if (!chatId) {
                showError('Guruh ID topilmadi. Guruh ma\'lumotlarini yuklashni kuting.');
                return;
            }
            const res = await apiFetch(`/api/chats/${chatId}`, {
                method: 'PATCH',
                body: JSON.stringify({ avatar_url: url }),
            });
            if (res.ok) {
                setFullChatDetails((prev: any) => prev ? { ...prev, avatar_url: url } : null);
                onGroupUpdated?.();
            } else {
                const errData = await res.json().catch(() => ({}));
                if (res.status === 404) {
                    onChatNotFound?.();
                    showError('Guruh backendda topilmadi. Ro\'yxat yangilandi.');
                } else {
                    showError(errData?.message || 'Rasm yangilanmadi.');
                }
            }
        } catch (err: any) {
            console.error('Update group avatar:', err);
            const msg = err?.message || (err?.response?.data?.message) || 'Rasm yuklanmadi.';
            showError(msg);
        } finally {
            setUploadingAvatar(false);
        }
    };

    if (!chat) {
        return (
            <div className="flex-1 min-h-0 h-full flex items-center justify-center text-white/30 text-sm">
                Ma'lumotlarni ko'rish uchun chatni tanlang
            </div>
        );
    }

    if (chat.type !== 'group') {
        const otherUser = chat.otherUser || {};
        return (
            <div className="flex-1 min-h-0 h-full overflow-y-auto overscroll-y-contain custom-scrollbar flex flex-col gap-4 p-4">
                <div className="flex flex-col items-center justify-center p-4">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-3xl mb-3 shadow-lg">
                        {otherUser.avatar ? (
                            <img src={otherUser.avatar} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            (chat.name || '?').charAt(0).toUpperCase()
                        )}
                    </div>
                    <h2 className="text-xl font-bold text-white mb-1">{chat.name}</h2>
                    <p className="text-[var(--text-secondary)] text-sm">{otherUser.phone || 'No phone'}</p>
                </div>
                {/* Shared Media Placeholders (Future) */}
                <div className="text-center text-white/30 text-sm mt-10">
                    Media fayllar tez orada...
                </div>
            </div>
        );
    }

    const participants = fullChatDetails?.participants || [];
    const groupName = chat?.name ?? fullChatDetails?.name ?? 'Guruh';
    const groupAvatar = chat?.avatar_url ?? chat?.avatar ?? fullChatDetails?.avatar_url;
    const groupAvatarSrc = groupAvatar && groupAvatar !== 'null' && groupAvatar !== ''
        ? (groupAvatar.startsWith('http') || groupAvatar.startsWith('data:') ? groupAvatar : `${API_URL}${groupAvatar.startsWith('/') ? '' : '/'}${groupAvatar}`)
        : null;

    const getMemberAvatarSrc = (avatar: string | null | undefined) => {
        if (!avatar || avatar === 'null' || avatar === '') return null;
        return avatar.startsWith('http') || avatar.startsWith('data:') ? avatar : `${API_URL}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
    };

    return (
        <div className="lg:h-full lg:min-h-0 lg:flex-1 lg:static fixed inset-0 z-[100] flex flex-col gap-4 min-h-0 overflow-y-auto overscroll-y-contain custom-scrollbar max-lg:bg-white/[0.07] max-lg:backdrop-blur-2xl max-lg:backdrop-saturate-150 lg:bg-transparent lg:backdrop-blur-none lg:border-l lg:border-white/5 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] lg:pt-0 lg:pb-0 motion-reduce:transition-none">
            <button
                onClick={onClose}
                className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-20 p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-full transition-all lg:top-4"
            >
                <X className="h-5 w-5" />
            </button>
            {/* Group Header: profil rasm, nom — yaratuvchi uchun o'zgartirish */}
            <div className="flex flex-col items-center justify-center p-4">
                <div className="relative group">
                    <div className={`w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-purple-900/30 overflow-hidden flex-shrink-0 ${uploadingAvatar ? 'opacity-70' : ''}`}>
                        {groupAvatarSrc ? (
                            <img src={groupAvatarSrc} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        )}
                        {uploadingAvatar && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            </div>
                        )}
                    </div>
                    {isCreator && !uploadingAvatar && (
                        <>
                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAvatarChange}
                            />
                            <label
                                onClick={(e) => { e.preventDefault(); avatarInputRef.current?.click(); }}
                                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                title="Rasmni o'zgartirish"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </label>
                        </>
                    )}
                </div>

                {isCreator && !uploadingAvatar && (
                    <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="mt-2 text-sm text-blue-300 hover:text-blue-200 underline focus:outline-none"
                    >
                        Guruh profil rasmini yuklash
                    </button>
                )}
                {isCreator && isEditingName ? (
                    <div className="w-full max-w-[240px] mt-3 mb-1">
                        <input
                            type="text"
                            value={editNameValue}
                            onChange={(e) => setEditNameValue(e.target.value)}
                            onBlur={handleUpdateName}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateName(); if (e.key === 'Escape') { setIsEditingName(false); setEditNameValue(''); } }}
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-center font-bold focus:outline-none focus:border-blue-400"
                            autoFocus
                        />
                    </div>
                ) : (
                    <h2
                        className={`text-xl font-bold text-white mb-1 text-center break-words max-w-full mt-3 ${isCreator ? 'cursor-pointer hover:text-blue-300 flex items-center justify-center gap-2' : ''}`}
                        onClick={() => { if (isCreator) { setEditNameValue(groupName); setIsEditingName(true); } }}
                        title={isCreator ? "Nomni o'zgartirish" : undefined}
                    >
                        {groupName}
                        {isCreator && !isEditingName && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white/50 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        )}
                    </h2>
                )}

                <p className="text-[var(--text-secondary)] text-sm">
                    {loading ? 'Yuklanmoqda...' : `${participants.length} ta a'zo`}
                </p>
            </div>

            {/* Quick Actions: A'zo qo'shish faqat yaratuvchi uchun */}
            <div className="grid grid-cols-2 gap-2 px-4">
                {isCreator ? (
                    <button
                        onClick={() => setShowAddMemberModal(true)}
                        className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white flex flex-col items-center gap-2 transition-colors"
                    >
                        <div className="p-2 bg-blue-500/20 text-blue-400 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                        </div>
                        <span className="text-xs">A'zo qo'shish</span>
                    </button>
                ) : (
                    <div className="p-3 rounded-xl bg-white/5 text-white/50 flex flex-col items-center gap-2 cursor-not-allowed" title="Faqat guruh yaratuvchisi taklif qilishi mumkin">
                        <div className="p-2 bg-white/10 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                        </div>
                        <span className="text-xs">Taklif qilish (admin)</span>
                    </div>
                )}
                <button className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white flex flex-col items-center gap-2 transition-colors cursor-default" title="Tez orada">
                    <div className="p-2 bg-purple-500/20 text-purple-400 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                    </div>
                    <span className="text-xs">Ovozni o'chirish</span>
                </button>
            </div>

            {/* Guruhni o'chirish (faqat yaratuvchi) / Guruhdan chiqish (barcha a'zolar) */}
            <div className="px-4 space-y-2">
                {isCreator && (
                    <button
                        onClick={handleDeleteGroup}
                        disabled={actionLoading !== null}
                        className="w-full p-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {actionLoading === 'delete' ? (
                            <span className="text-sm">Kutilmoqda...</span>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                <span className="text-sm font-medium">Guruhni o'chirish</span>
                            </>
                        )}
                    </button>
                )}
                <button
                    onClick={handleLeaveGroup}
                    disabled={actionLoading !== null}
                    className="w-full p-3 rounded-xl bg-white/5 hover:bg-orange-500/20 text-white hover:text-orange-400 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                    {actionLoading === 'leave' ? (
                        <span className="text-sm">Kutilmoqda...</span>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            <span className="text-sm font-medium">Guruhdan chiqish</span>
                        </>
                    )}
                </button>
            </div>


            {/* A'zolar ro'yxati: rasm, ism, yaratuvchi belgisi */}
            <div className="px-3 flex-1">
                <div className="flex justify-between items-center mb-2 px-1 sticky top-0 bg-[#788296]/10 backdrop-blur-md py-2 z-10 border-b border-white/5">
                    <h3 className="text-sm font-semibold text-[var(--text-secondary)]">A'zolar</h3>
                </div>
                <div className="space-y-2 pb-4">
                    {participants.map((member: any) => {
                        const avatarSrc = getMemberAvatarSrc(member.avatar);
                        const isCreatorMember =
                            fullChatDetails?.creator_id != null &&
                            String(member.id) === String(fullChatDetails.creator_id);
                        return (
                            <GlassCard key={member.id} className="!p-2 flex items-center gap-3 bg-transparent border-transparent shadow-none hover:bg-white/5">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-sm text-white font-bold flex-shrink-0 overflow-hidden">
                                    {avatarSrc ? (
                                        <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        (member.name || '?').charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm text-white font-medium truncate flex items-center gap-2 flex-wrap">
                                        <span className="truncate">{member.name} {member.surname}</span>
                                        {member.id === currentUser?.id && <span className="text-xs text-white/50 shrink-0">(Siz)</span>}
                                        {isCreatorMember && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-300 shrink-0">Yaratuvchi</span>}
                                    </h4>
                                    <p className="text-xs text-[var(--text-tertiary)] truncate">{member.phone || '—'}</p>
                                </div>
                            </GlassCard>
                        );
                    })}

                    {participants.length === 0 && !loading && (
                        <p className="text-center text-white/30 text-sm py-4">A'zolar haqida ma'lumot yo'q</p>
                    )}
                </div>
            </div>

            {/* Modals */}
            <AddGroupMemberModal
                open={showAddMemberModal}
                chatId={chat.id || chat._id}
                currentParticipantIds={(fullChatDetails?.participants || []).map((p: any) => p.id)}
                onClose={() => setShowAddMemberModal(false)}
                onAdded={handleAddMember}
            />
        </div>
    );
}


