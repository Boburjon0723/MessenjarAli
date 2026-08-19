import React, { useEffect, useRef, useState } from 'react';
import AddGroupMemberModal from './AddGroupMemberModal';
import { X, Search, Copy, Check } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useLanguage } from '@/context/LanguageContext';
import { apiFetch } from '@/lib/api';
import { getUser } from '@/lib/auth-storage';
import { getPublicApiUrl } from '@/lib/public-origin';

interface GroupInfoPanelProps {
    chat: any;
    onClose?: () => void;
    onDeleted?: () => void;
    onLeft?: () => void;
    onGroupUpdated?: () => void;
    onChatNotFound?: () => void;
}

export default function GroupInfoPanel({ chat, onClose, onDeleted, onLeft, onGroupUpdated, onChatNotFound }: GroupInfoPanelProps) {
    const { showSuccess, showError } = useNotification();
    const { confirm } = useConfirm();
    const { t } = useLanguage();
    const [fullChatDetails, setFullChatDetails] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [actionLoading, setActionLoading] = useState<'delete' | 'leave' | null>(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editNameValue, setEditNameValue] = useState('');
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [memberSearch, setMemberSearch] = useState('');
    const [showMemberSearch, setShowMemberSearch] = useState(false);
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [copiedLink, setCopiedLink] = useState(false);
    const [activeMediaTab, setActiveMediaTab] = useState('photos');
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const lastFetchedGroupIdRef = useRef<string | null>(null);

    useEffect(() => {
        const user = getUser() || {};
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
            description: "Guruh butunlay o'chiriladi. Rostan ham davom etasizmi?",
            variant: 'danger',
            confirmLabel: t('delete') || "O'chirish"
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
                showError(data?.message || "Guruhni o'chirib bo'lmadi.");
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
                showError(data?.message || "Guruhdan chiqib bo'lmadi.");
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
            showError('Rasm hajmi 6 MB dan kichik bo\'lsin.');
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

    const handleRemoveMember = (member: any) => {
        showSuccess(t('feature_coming_soon') || 'Bu funksiya tez orada qo\'shiladi');
        setSelectedMemberId(null);
    };

    const handleCopyInviteLink = () => {
        const link = `${window.location.origin}/?invite=${chat.id || chat._id}`;
        navigator.clipboard.writeText(link).then(() => {
            setCopiedLink(true);
            showSuccess('Havola nusxalandi');
            setTimeout(() => setCopiedLink(false), 2000);
        });
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
            <div className="flex-1 min-h-0 h-full overflow-y-auto overscroll-y-contain custom-scrollbar flex flex-col gap-4 p-4 bg-[#212121]">
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
                <div className="text-center text-white/30 text-sm mt-10">
                    Media fayllar tez orada...
                </div>
            </div>
        );
    }

    const participants = fullChatDetails?.participants || [];
    const groupName = fullChatDetails?.name ?? chat?.name ?? 'Guruh';
    const groupAvatar = fullChatDetails?.avatar_url ?? chat?.avatar_url ?? chat?.avatar;
    const groupAvatarSrc = groupAvatar && groupAvatar !== 'null' && groupAvatar !== ''
        ? (groupAvatar.startsWith('http') || groupAvatar.startsWith('data:') ? groupAvatar : `${API_URL}${groupAvatar.startsWith('/') ? '' : '/'}${groupAvatar}`)
        : null;

    const getMemberAvatarSrc = (avatar: string | null | undefined) => {
        if (!avatar || avatar === 'null' || avatar === '') return null;
        return avatar.startsWith('http') || avatar.startsWith('data:') ? avatar : `${API_URL}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
    };

    const filteredParticipants = memberSearch.trim()
        ? participants.filter((m: any) =>
            `${m.name || ''} ${m.surname || ''}`.toLowerCase().includes(memberSearch.toLowerCase())
        )
        : participants;

    const inviteLink = `${window.location.origin}/?invite=${chat.id || chat._id}`;

    const mediaTabs = [
        { key: 'photos', label: 'Rasmlar' },
        { key: 'videos', label: 'Videolar' },
        { key: 'files', label: 'Fayllar' },
        { key: 'links', label: 'Havolalar' },
        { key: 'voice', label: 'Ovozli' },
    ];

    return (
        <div className="lg:h-full lg:min-h-0 lg:flex-1 lg:static fixed inset-0 z-[100] flex flex-col min-h-0 overflow-y-auto overscroll-y-contain custom-scrollbar bg-[#212121] lg:border-l lg:border-white/[0.06] motion-reduce:transition-none">
            {/* Top bar */}
            <div className="sticky top-0 z-20 flex items-center justify-between px-4 h-14 bg-[#212121] border-b border-white/[0.06]">
                <span className="text-white font-medium text-[15px]">Guruh haqida</span>
                <button
                    onClick={onClose}
                    className="p-2 text-white/50 hover:text-white hover:bg-white/[0.04] rounded-full transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Profile section */}
            <div className="flex flex-col items-center pt-6 pb-4 px-4">
                <div className="relative group">
                    <div className={`w-[120px] h-[120px] rounded-full bg-[#766ac8] flex items-center justify-center text-white font-bold text-4xl overflow-hidden flex-shrink-0 ${uploadingAvatar ? 'opacity-70' : ''}`}>
                        {groupAvatarSrc ? (
                            <img src={groupAvatarSrc} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span>{(groupName || '?').charAt(0).toUpperCase()}</span>
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
                            <div
                                onClick={() => avatarInputRef.current?.click()}
                                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </div>
                        </>
                    )}
                </div>

                {isCreator && isEditingName ? (
                    <div className="w-full max-w-[240px] mt-4">
                        <input
                            type="text"
                            value={editNameValue}
                            onChange={(e) => setEditNameValue(e.target.value)}
                            onBlur={handleUpdateName}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateName(); if (e.key === 'Escape') { setIsEditingName(false); setEditNameValue(''); } }}
                            className="w-full bg-transparent border-b-2 border-[#8774e1] px-1 py-2 text-white text-center text-lg font-medium focus:outline-none"
                            autoFocus
                        />
                    </div>
                ) : (
                    <h2
                        className={`text-[20px] font-medium text-white mt-4 text-center break-words max-w-full ${isCreator ? 'cursor-pointer hover:text-[#8774e1] transition-colors' : ''}`}
                        onClick={() => { if (isCreator) { setEditNameValue(groupName); setIsEditingName(true); } }}
                    >
                        {groupName}
                    </h2>
                )}

                <p className="text-[#aaaaaa] text-[14px] mt-1">
                    {loading ? 'Yuklanmoqda...' : `${participants.length} ta a'zo`}
                </p>
            </div>

            <div className="h-2 bg-black/20" />

            {/* Invite link section */}
            <div className="px-4 py-3">
                <div className="text-[#aaaaaa] text-xs uppercase tracking-wider mb-2 px-1">Taklif havolasi</div>
                <div
                    onClick={handleCopyInviteLink}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] cursor-pointer transition-colors group"
                >
                    <div className="text-[#8774e1]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[#8774e1] text-[14px] truncate">{inviteLink}</p>
                    </div>
                    <div className="text-white/40 group-hover:text-white/60 transition-colors">
                        {copiedLink ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </div>
                </div>
            </div>

            <div className="h-2 bg-black/20" />

            {/* Actions */}
            <div className="py-1">
                {isCreator && (
                    <button
                        onClick={() => setShowAddMemberModal(true)}
                        className="w-full flex items-center gap-4 px-5 py-3 hover:bg-white/[0.04] transition-colors text-left"
                    >
                        <div className="text-[#8774e1]">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                        </div>
                        <span className="text-[14px] text-[#8774e1]">A'zo qo'shish</span>
                    </button>
                )}
                <button
                    onClick={handleLeaveGroup}
                    disabled={actionLoading !== null}
                    className="w-full flex items-center gap-4 px-5 py-3 hover:bg-white/[0.04] transition-colors text-left disabled:opacity-50"
                >
                    <div className="text-[#e53935]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    </div>
                    <span className="text-[14px] text-[#e53935]">
                        {actionLoading === 'leave' ? 'Kutilmoqda...' : 'Guruhdan chiqish'}
                    </span>
                </button>
                {isCreator && (
                    <button
                        onClick={handleDeleteGroup}
                        disabled={actionLoading !== null}
                        className="w-full flex items-center gap-4 px-5 py-3 hover:bg-white/[0.04] transition-colors text-left disabled:opacity-50"
                    >
                        <div className="text-[#e53935]">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </div>
                        <span className="text-[14px] text-[#e53935]">
                            {actionLoading === 'delete' ? 'Kutilmoqda...' : (t('delete') || "Guruhni o'chirish")}
                        </span>
                    </button>
                )}
            </div>

            <div className="h-2 bg-black/20" />

            {/* Members section */}
            <div className="flex-1">
                <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[#aaaaaa] text-xs uppercase tracking-wider">
                        {participants.length} ta a'zo
                    </span>
                    <button
                        onClick={() => setShowMemberSearch(!showMemberSearch)}
                        className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/[0.04] rounded-full transition-colors"
                    >
                        <Search className="h-4 w-4" />
                    </button>
                </div>

                {showMemberSearch && (
                    <div className="px-4 pb-2">
                        <input
                            type="text"
                            value={memberSearch}
                            onChange={(e) => setMemberSearch(e.target.value)}
                            placeholder="Qidirish..."
                            className="w-full bg-white/[0.06] border-none rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#8774e1]"
                            autoFocus
                        />
                    </div>
                )}

                <div>
                    {filteredParticipants.map((member: any) => {
                        const avatarSrc = getMemberAvatarSrc(member.avatar);
                        const isCreatorMember =
                            fullChatDetails?.creator_id != null &&
                            String(member.id) === String(fullChatDetails.creator_id);
                        const isMe = member.id === currentUser?.id;
                        const isSelected = selectedMemberId === String(member.id);

                        return (
                            <div key={member.id} className="relative">
                                <div
                                    onClick={() => {
                                        if (isCreator && !isCreatorMember && !isMe) {
                                            setSelectedMemberId(isSelected ? null : String(member.id));
                                        }
                                    }}
                                    className={`flex items-center gap-3 px-4 py-2 hover:bg-white/[0.04] transition-colors ${isCreator && !isCreatorMember && !isMe ? 'cursor-pointer' : ''}`}
                                >
                                    <div className="w-[54px] h-[54px] rounded-full bg-[#766ac8] flex items-center justify-center text-[18px] text-white font-medium flex-shrink-0 overflow-hidden">
                                        {avatarSrc ? (
                                            <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            (member.name || '?').charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[15px] text-white font-medium truncate">
                                                {member.name}{member.surname ? ` ${member.surname}` : ''}
                                            </span>
                                            {isMe && <span className="text-xs text-white/40">(Siz)</span>}
                                        </div>
                                        <div className="text-[13px] mt-0.5">
                                            {isCreatorMember ? (
                                                <span className="text-[#8774e1]">Yaratuvchi</span>
                                            ) : (
                                                <span className="text-[#aaaaaa]">oxirgi marta ko'rilgan</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {isSelected && isCreator && !isCreatorMember && !isMe && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleRemoveMember(member); }}
                                            className="px-3 py-1.5 bg-[#2c2c2c] border border-white/10 rounded-lg text-[#e53935] text-[13px] hover:bg-[#383838] transition-colors shadow-lg"
                                        >
                                            Guruhdan chiqarish
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {filteredParticipants.length === 0 && !loading && (
                        <p className="text-center text-white/30 text-sm py-6">
                            {memberSearch ? 'Topilmadi' : "A'zolar haqida ma'lumot yo'q"}
                        </p>
                    )}
                </div>
            </div>

            <div className="h-2 bg-black/20" />

            {/* Shared media placeholder */}
            <div className="pb-6">
                <div className="flex border-b border-white/[0.06]">
                    {mediaTabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveMediaTab(tab.key)}
                            className={`flex-1 py-3 text-[13px] text-center transition-colors relative ${
                                activeMediaTab === tab.key
                                    ? 'text-[#8774e1]'
                                    : 'text-[#aaaaaa] hover:text-white/70'
                            }`}
                        >
                            {tab.label}
                            {activeMediaTab === tab.key && (
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[2px] bg-[#8774e1] rounded-full" />
                            )}
                        </button>
                    ))}
                </div>
                <div className="flex items-center justify-center py-12 text-white/30 text-sm">
                    Hozircha kontent yo'q
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
