import React, { useEffect, useState } from 'react';
import { AnimatedModal } from '../ui/AnimatedModal';
import {
    X, Camera, ChevronRight, Users, Shield,
    Link as LinkIcon, Heart, MessageSquare,
    Type, Globe2, Bell, Ban, History, Star, Trash2, Lock
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useNotification } from '@/context/NotificationContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useLanguage } from '@/context/LanguageContext';

interface EditChannelModalProps {
    open: boolean;
    chat: any;
    onClose: () => void;
    onSave?: (data: any) => void;
    onDelete?: () => void;
}

export default function EditChannelModal({ open, chat, onClose, onSave, onDelete }: EditChannelModalProps) {
    const { t } = useLanguage();
    const { showSuccess, showError } = useNotification();
    const { confirm } = useConfirm();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (open && chat) {
            setName(chat.name || '');
            setDescription(chat.description || '');
        }
    }, [open, chat?.id]);

    const handleSave = async () => {
        if (!chat) return;
        const trimmedName = name.trim();
        if (!trimmedName) {
            showError(t('channel_name_required') || 'Kanal nomi kiritilishi shart');
            return;
        }
        setIsSaving(true);
        try {
            const res = await apiFetch(`/api/chats/${chat.id || chat._id}`, {
                method: 'PATCH',
                body: JSON.stringify({ name: trimmedName, description: description.trim() }),
            });
            if (res.ok) {
                showSuccess(t('saved') || 'Saqlandi');
                onSave?.({ name: trimmedName, description: description.trim() });
                onClose();
            } else {
                const data = await res.json().catch(() => ({}));
                showError(data?.message || 'Xatolik');
            }
        } catch {
            showError('Xatolik');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!chat) return;
        const ok = await confirm({
            title: t('delete_channel') || "Kanalni o'chirish",
            description: t('delete_channel_confirm') || "Kanal butunlay o'chiriladi. Davom etasizmi?",
            variant: 'danger',
            confirmLabel: t('delete') || "O'chirish",
        });
        if (!ok) return;
        try {
            const res = await apiFetch(`/api/chats/${chat.id || chat._id}`, { method: 'DELETE' });
            if (res.ok) {
                onDelete?.();
                onClose();
            } else {
                const data = await res.json().catch(() => ({}));
                showError(data?.message || 'Xatolik');
            }
        } catch {
            showError('Xatolik');
        }
    };

    const subscriberCount = chat?.participantsCount ?? chat?.participants?.length ?? 0;

    return (
        <AnimatedModal open={open} zClass="z-[60]" onBackdropClick={onClose} className="bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-[440px] bg-[#212121] border border-white/[0.06] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden rounded-[20px]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                    <h2 className="text-[17px] font-bold text-white">{t('edit_channel') || 'Kanalni tahrirlash'}</h2>
                    <button onClick={onClose} className="p-1 text-white/40 hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-6 space-y-6">
                        <div className="flex gap-6 items-start">
                            <div className="relative group cursor-pointer">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold text-3xl shadow-lg overflow-hidden">
                                    {chat?.avatar ? (
                                        <img src={chat.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                                    ) : (
                                        <Camera className="h-8 w-8 text-white/80" />
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[13px] text-[#8774e1] font-medium">{t('channel_name') || 'Kanal nomi'}</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-transparent border-b-2 border-[#8774e1] outline-none text-white text-[15px] py-1.5 placeholder-white/20"
                                        placeholder={t('channel_name') as string || 'Kanal nomi'}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <input
                                        type="text"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full bg-transparent border-b border-white/10 outline-none text-white text-[15px] py-1.5 placeholder-white/20 focus:border-[#8774e1] transition-colors"
                                        placeholder={t('description') || "Tavsif (ixtiyoriy)"}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-0.5 border-t border-white/[0.06] py-2">
                        <SettingsItem
                            leftIcon={<MessageSquare className="h-5 w-5" />}
                            label={t('discussion') || 'Muhokama'}
                            value={t('add_group') || "Guruh qo'shish"}
                            onClick={() => showSuccess(t('feature_coming_soon'))}
                        />
                        <SettingsItem
                            leftIcon={<Bell className="h-5 w-5" />}
                            label={t('channel_messages') || 'Kanal xabarlari'}
                            value={t('off') || "O'chiq"}
                            onClick={() => showSuccess(t('feature_coming_soon'))}
                        />
                        <SettingsToggle
                            label={t('translate_messages') || "Xabarlarni tarjima qilish"}
                            leftIcon={<Globe2 className="h-5 w-5" />}
                            locked
                        />
                        <SettingsToggle
                            label={t('sign_messages') || "Xabarlarni imzolash"}
                            leftIcon={<Type className="h-5 w-5" />}
                        />
                    </div>

                    <div className="space-y-0.5 border-t border-white/[0.06] py-2 mt-2">
                        <SettingsItem
                            leftIcon={<Heart className="h-5 w-5" />}
                            label={t('reactions') || 'Reaksiyalar'}
                            value={t('all') || 'Barchasi'}
                            onClick={() => showSuccess(t('feature_coming_soon'))}
                        />
                        <SettingsItem
                            leftIcon={<LinkIcon className="h-5 w-5" />}
                            label={t('invite_links') || 'Taklifnoma havolalari'}
                            value="1"
                            onClick={() => showSuccess(t('feature_coming_soon'))}
                        />
                        <SettingsItem
                            leftIcon={<Shield className="h-5 w-5" />}
                            label={t('administrators') || 'Administratorlar'}
                            value="1"
                            onClick={() => showSuccess(t('feature_coming_soon'))}
                        />
                        <SettingsItem
                            leftIcon={<Users className="h-5 w-5" />}
                            label={t('subscribers') || 'Obunachi'}
                            value={String(subscriberCount)}
                            onClick={() => showSuccess(t('feature_coming_soon'))}
                        />
                        <SettingsItem
                            leftIcon={<Ban className="h-5 w-5" />}
                            label={t('blacklist') || "Qora ro'yxat"}
                            onClick={() => showSuccess(t('feature_coming_soon'))}
                        />
                        <SettingsItem
                            leftIcon={<History className="h-5 w-5" />}
                            label={t('recent_actions') || "So'nggi harakatlar"}
                            onClick={() => showSuccess(t('feature_coming_soon'))}
                        />
                    </div>

                    <div className="border-t border-white/[0.06] py-2 mt-2">
                        <button
                            onClick={handleDelete}
                            className="w-full flex items-center gap-4 px-6 py-3 text-red-500 hover:bg-red-500/5 transition-colors"
                        >
                            <Trash2 className="h-5 w-5" />
                            <span className="text-[15px]">{t('delete_channel') || "Kanalni o'chirish"}</span>
                        </button>
                    </div>
                    <div className="h-4" />
                </div>

                <div className="flex justify-end gap-2 px-6 py-4 border-t border-white/[0.06]">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-white/50 font-bold text-[14px] uppercase hover:bg-white/5 rounded transition-colors"
                    >
                        {t('cancel') || 'Bekor'}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-5 py-2 text-[#8774e1] font-bold text-[14px] uppercase hover:bg-white/5 rounded transition-colors disabled:opacity-50"
                    >
                        {isSaving ? '...' : (t('save') || 'Saqlash')}
                    </button>
                </div>
            </div>
        </AnimatedModal>
    );
}

function SettingsItem({ label, value, leftIcon, onClick }: { label: string; value?: string; leftIcon: React.ReactNode; onClick?: () => void }) {
    return (
        <button onClick={onClick} className="w-full flex items-center justify-between px-6 py-3 hover:bg-white/[0.04] transition-colors group">
            <div className="flex items-center gap-6">
                <div className="text-white/40 group-hover:text-white/60 transition-colors">{leftIcon}</div>
                <span className="text-[15px] text-white font-medium">{label}</span>
            </div>
            <div className="flex items-center gap-1">
                {value && <span className="text-[14px] text-[#8774e1]">{value}</span>}
                <ChevronRight className="h-5 w-5 text-white/10 group-hover:text-white/30 transition-colors" />
            </div>
        </button>
    );
}

function SettingsToggle({ label, leftIcon, locked, defaultOn = false }: { label: string; leftIcon: React.ReactNode; locked?: boolean; defaultOn?: boolean }) {
    const [on, setOn] = useState(defaultOn);
    return (
        <label className="w-full flex items-center justify-between px-6 py-3 hover:bg-white/[0.04] transition-colors group cursor-pointer">
            <div className="flex items-center gap-6">
                <div className="text-white/40 group-hover:text-white/60 transition-colors">{leftIcon}</div>
                <span className="text-[15px] text-white font-medium">{label}</span>
            </div>
            {locked ? (
                <div className="w-9 h-4 bg-white/20 rounded-full flex items-center px-1">
                    <Lock className="h-3 w-3 text-white/40" />
                </div>
            ) : (
                <div
                    onClick={() => setOn(!on)}
                    className={`w-9 h-4 rounded-full relative transition-colors ${on ? 'bg-[#8774e1]' : 'bg-white/20'}`}
                >
                    <div className={`absolute -top-0.5 left-0 w-5 h-5 bg-[#212121] border-2 rounded-full transition-transform ${on ? 'translate-x-5 border-[#8774e1]' : 'translate-x-0 border-white/20'}`} />
                </div>
            )}
        </label>
    );
}
