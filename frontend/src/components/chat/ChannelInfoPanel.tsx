import React, { useEffect, useRef, useState } from 'react';
import {
    Volume2, Sliders, Users, Shield, LogOut, Trash2,
    Image as ImageIcon, Film, FileText, Link2, AlertCircle,
    Plus, X, BellOff, ChevronLeft
} from 'lucide-react';
import EditChannelModal from './EditChannelModal';
import { apiFetch } from '@/lib/api';
import { getUser } from '@/lib/auth-storage';
import { useLanguage } from '@/context/LanguageContext';
import { useNotification } from '@/context/NotificationContext';
import { useConfirm } from '@/context/ConfirmContext';

interface ChannelInfoPanelProps {
    chat: any;
    onClose?: () => void;
    onLeft?: () => void;
    onDeleted?: () => void;
    onGroupUpdated?: () => void;
}

export default function ChannelInfoPanel({ chat, onClose, onLeft, onDeleted, onGroupUpdated }: ChannelInfoPanelProps) {
    const { t } = useLanguage();
    const { showSuccess, showError } = useNotification();
    const { confirm } = useConfirm();

    const [currentUser, setCurrentUser] = useState<any>(null);
    const [fullChatDetails, setFullChatDetails] = useState<any>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const [activeMediaTab, setActiveMediaTab] = useState<'photos' | 'videos' | 'files' | 'links'>('photos');
    const [leaving, setLeaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const lastFetchedChannelIdRef = useRef<string | null>(null);

    useEffect(() => {
        const user = getUser() || {};
        setCurrentUser(user);
    }, []);

    useEffect(() => {
        if (!chat) {
            setFullChatDetails(null);
            lastFetchedChannelIdRef.current = null;
            return;
        }
        if (chat.type !== 'channel') return;
        const id = String(chat.id || chat._id);
        if (lastFetchedChannelIdRef.current === id) return;
        lastFetchedChannelIdRef.current = id;
        fetchChatDetails();
    }, [chat?.id, chat?.type]);

    const fetchChatDetails = async () => {
        if (!chat) return;
        try {
            const res = await apiFetch(`/api/chats/${chat.id || chat._id}`);
            if (res.ok) {
                const data = await res.json();
                setFullChatDetails(data);
            }
        } catch (err) {
            console.error("Failed to fetch chat details:", err);
        }
    };

    const handleLeave = async () => {
        if (leaving) return;
        setLeaving(true);
        try {
            const res = await apiFetch(`/api/chats/${chat.id || chat._id}/leave`, { method: 'POST' });
            if (res.ok) {
                onLeft?.();
                onClose?.();
            } else {
                showError(t('error_occurred' as any) || 'Failed to leave channel');
            }
        } catch {
            showError(t('error_occurred' as any) || 'Failed to leave channel');
        } finally {
            setLeaving(false);
        }
    };

    const handleDelete = async () => {
        const confirmed = await confirm({
            title: t('delete_channel' as any) || 'Delete channel',
            description: t('delete_channel_confirm' as any) || 'Are you sure you want to delete this channel? This action cannot be undone.',
            confirmLabel: t('delete' as any) || 'Delete',
            cancelLabel: t('cancel' as any) || 'Cancel',
            variant: 'danger',
        });
        if (!confirmed) return;
        setDeleting(true);
        try {
            const res = await apiFetch(`/api/chats/${chat.id || chat._id}`, { method: 'DELETE' });
            if (res.ok) {
                onDeleted?.();
                onClose?.();
            } else {
                showError(t('error_occurred' as any) || 'Failed to delete channel');
            }
        } catch {
            showError(t('error_occurred' as any) || 'Failed to delete channel');
        } finally {
            setDeleting(false);
        }
    };

    const handleMute = () => {
        showSuccess(t('feature_coming_soon' as any) || 'Feature coming soon');
    };

    const handleReport = () => {
        showSuccess(t('feature_coming_soon' as any) || 'Feature coming soon');
    };

    if (!chat) return null;

    const isOwner = (chat.creator_id ?? chat.creatorId) === currentUser?.id;
    const participants: any[] = fullChatDetails?.participants || [];
    const subscribersCount = participants.length || chat.participantsCount || 0;
    const description = fullChatDetails?.description || chat?.description;

    if (showParticipants) {
        return (
            <div className="lg:h-full lg:min-h-0 lg:flex-1 lg:static fixed inset-0 z-[100] flex flex-col overflow-hidden bg-[#212121] lg:border-l lg:border-white/[0.06]">
                {/* Participants header */}
                <div className="flex items-center h-14 px-2 shrink-0 border-b border-white/[0.06]">
                    <button
                        onClick={() => setShowParticipants(false)}
                        className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <span className="text-[15px] font-medium text-white ml-2">
                        {subscribersCount} {t('subscribers' as any) || 'subscribers'}
                    </span>
                </div>
                {/* Participants list */}
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain custom-scrollbar">
                    {participants.length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-white/30 text-sm">
                            {t('no_participants' as any) || 'No participants'}
                        </div>
                    ) : (
                        participants.map((p: any) => {
                            const user = p.user || p;
                            const isCreator = String(user.id || user._id) === String(chat.creator_id ?? chat.creatorId);
                            return (
                                <div
                                    key={user.id || user._id}
                                    className="flex items-center gap-3 px-4 py-2 hover:bg-white/[0.04] transition-colors cursor-pointer"
                                >
                                    <div className="w-[54px] h-[54px] rounded-full bg-gradient-to-br from-[#8774e1] to-[#6c5ce7] flex items-center justify-center text-white font-semibold text-lg shrink-0">
                                        {user.avatar ? (
                                            <img src={user.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                                        ) : (
                                            (user.name || user.username || '?').charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[14px] font-medium text-white truncate">
                                                {user.name || user.username || 'Unknown'}
                                            </span>
                                            {isCreator && (
                                                <span className="text-[11px] font-medium text-[#8774e1] bg-[#8774e1]/10 px-1.5 py-0.5 rounded">
                                                    Creator
                                                </span>
                                            )}
                                        </div>
                                        {user.username && user.name && (
                                            <span className="text-[13px] text-white/40 truncate block">@{user.username}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    }

    const mediaTabs = [
        { key: 'photos' as const, label: t('photos' as any) || 'Photos', icon: <ImageIcon className="h-4 w-4" /> },
        { key: 'videos' as const, label: t('videos' as any) || 'Videos', icon: <Film className="h-4 w-4" /> },
        { key: 'files' as const, label: t('files' as any) || 'Files', icon: <FileText className="h-4 w-4" /> },
        { key: 'links' as const, label: t('links' as any) || 'Links', icon: <Link2 className="h-4 w-4" /> },
    ];

    return (
        <div className="lg:h-full lg:min-h-0 lg:flex-1 lg:static fixed inset-0 z-[100] flex flex-col overflow-hidden bg-[#212121] lg:border-l lg:border-white/[0.06] pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] lg:pt-0 lg:pb-0">
            <button
                onClick={onClose}
                className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-20 p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-full transition-all lg:top-4"
            >
                <X className="h-6 w-6" />
            </button>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain custom-scrollbar flex flex-col">
                {/* Channel Header */}
                <div className="flex flex-col items-center pt-8 pb-4 px-4 w-full">
                    <div className="relative group">
                        <div className="w-[120px] h-[120px] rounded-full bg-gradient-to-br from-[#8774e1] to-[#6c5ce7] flex items-center justify-center text-white font-bold text-5xl shadow-2xl group-hover:scale-[1.03] transition-transform duration-300">
                            {chat.avatar ? (
                                <img src={chat.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                            ) : (
                                (chat.name || '?').charAt(0).toUpperCase()
                            )}
                        </div>
                    </div>

                    <h2 className="text-xl font-semibold text-white mt-4 text-center leading-tight">{chat.name}</h2>
                    <p className="text-white/40 text-[13px] mt-1">
                        {subscribersCount} {t('subscribers' as any) || 'subscribers'}
                    </p>
                </div>

                {/* Description */}
                {description && (
                    <div className="px-4 pb-3">
                        <div className="px-3 py-2.5 bg-white/[0.03] rounded-xl">
                            <p className="text-[14px] text-white/70 leading-relaxed whitespace-pre-wrap">{description}</p>
                        </div>
                    </div>
                )}

                {/* Action Buttons Row */}
                <div className="flex justify-center gap-6 px-6 py-4">
                    <ActionButton icon={<BellOff className="h-5 w-5" />} label={t('mute' as any) || 'Mute'} onClick={handleMute} />
                    {isOwner && (
                        <ActionButton
                            icon={<Sliders className="h-5 w-5" />}
                            label={t('manage' as any) || 'Manage'}
                            onClick={() => setShowEditModal(true)}
                        />
                    )}
                </div>

                <div className="h-2 bg-black/20" />

                {/* Menu Items */}
                <div className="w-full py-1">
                    <MenuItem
                        icon={<Users className="h-5 w-5 text-white/50" />}
                        label={`${subscribersCount} ${t('subscribers' as any) || 'subscribers'}`}
                        onClick={() => setShowParticipants(true)}
                        rightIcon={isOwner ? <Plus className="h-4 w-4" /> : undefined}
                    />
                    {isOwner && (
                        <MenuItem
                            icon={<Shield className="h-5 w-5 text-white/50" />}
                            label={`1 ${t('administrator' as any) || 'administrator'}`}
                        />
                    )}
                </div>

                <div className="h-2 bg-black/20" />

                {/* Shared Media */}
                <div className="w-full">
                    <div className="flex border-b border-white/[0.06]">
                        {mediaTabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveMediaTab(tab.key)}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[13px] font-medium transition-colors relative ${
                                    activeMediaTab === tab.key
                                        ? 'text-[#8774e1]'
                                        : 'text-white/40 hover:text-white/60'
                                }`}
                            >
                                {tab.label}
                                {activeMediaTab === tab.key && (
                                    <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-[#8774e1] rounded-full" />
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center justify-center h-32 text-white/20 text-sm">
                        {t('no_shared_media' as any) || 'No shared media yet'}
                    </div>
                </div>

                <div className="h-2 bg-black/20" />

                {/* Bottom Actions */}
                <div className="w-full py-1">
                    {!isOwner && (
                        <MenuItem
                            icon={<AlertCircle className="h-5 w-5 text-white/50" />}
                            label={t('report' as any) || 'Report'}
                            onClick={handleReport}
                        />
                    )}
                    <MenuItem
                        icon={<LogOut className="h-5 w-5 text-red-400" />}
                        label={leaving ? '...' : (t('leave_channel' as any) || 'Leave channel')}
                        className="text-red-400"
                        onClick={handleLeave}
                    />
                    {isOwner && (
                        <MenuItem
                            icon={<Trash2 className="h-5 w-5 text-red-500" />}
                            label={deleting ? '...' : (t('delete_channel' as any) || 'Delete channel')}
                            className="text-red-500"
                            onClick={handleDelete}
                        />
                    )}
                </div>

                <div className="h-4" />
            </div>

            <EditChannelModal
                open={showEditModal}
                chat={chat}
                onClose={() => setShowEditModal(false)}
                onSave={() => {
                    setShowEditModal(false);
                    lastFetchedChannelIdRef.current = null;
                    fetchChatDetails();
                    onGroupUpdated?.();
                }}
                onDelete={() => {
                    setShowEditModal(false);
                    onDeleted?.();
                    onClose?.();
                }}
            />
        </div>
    );
}

function ActionButton({ icon, label, variant = 'default', onClick }: { icon: React.ReactNode; label: string; variant?: 'default' | 'danger'; onClick?: () => void }) {
    return (
        <button onClick={onClick} className="flex flex-col items-center gap-1.5 group">
            <div className={`w-[54px] h-[54px] rounded-full flex items-center justify-center transition-all duration-200 ${
                variant === 'danger'
                    ? 'bg-red-500/10 text-red-400 group-hover:bg-red-500/20'
                    : 'bg-white/[0.08] text-[#8774e1] group-hover:bg-white/[0.12]'
            }`}>
                {icon}
            </div>
            <span className={`text-[12px] font-medium transition-colors ${
                variant === 'danger' ? 'text-red-400/70' : 'text-white/50 group-hover:text-white/70'
            }`}>{label}</span>
        </button>
    );
}

function MenuItem({ icon, label, rightIcon, className = "", onClick }: { icon: React.ReactNode; label: string; rightIcon?: React.ReactNode; className?: string; onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.04] transition-colors group ${className}`}
        >
            <div className="flex items-center gap-4">
                <div className="w-6 flex items-center justify-center">{icon}</div>
                <span className="text-[14px] font-medium">{label}</span>
            </div>
            {rightIcon && (
                <div className="text-white/30 group-hover:text-white/50">{rightIcon}</div>
            )}
        </button>
    );
}
