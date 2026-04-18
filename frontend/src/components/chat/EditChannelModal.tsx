import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { AnimatedModal } from '../ui/AnimatedModal';
import {
    X, Camera, Smile, ChevronRight, Users, Shield,
    Link as LinkIcon, Heart, Globe, Lock, MessageSquare,
    Type, Globe2, Bell, Ban, History, Star, Trash2
} from 'lucide-react';

interface EditChannelModalProps {
    open: boolean;
    chat: any;
    onClose: () => void;
    onSave?: (data: any) => void;
    onDelete?: () => void;
}

export default function EditChannelModal({ open, chat, onClose, onSave, onDelete }: EditChannelModalProps) {
    const [name, setName] = useState(chat.name || "");
    const [description, setDescription] = useState(chat.description || "");
    const [channelType, setChannelType] = useState(chat.channelType || "private");
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        // Simulate save or call API
        setTimeout(() => {
            setIsSaving(false);
            if (onSave) onSave({ name, description, channelType });
            onClose();
        }, 1000);
    };

    return (
        <AnimatedModal open={open} zClass="z-[60]" onBackdropClick={onClose} className="bg-black/60 backdrop-blur-sm p-4">
            <GlassCard className="w-full max-w-[440px] !p-0 !bg-black/20 !backdrop-blur-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden !rounded-[28px]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5 sticky top-0 z-10 backdrop-blur-md">
                    <h2 className="text-[17px] font-bold text-white">Редактировать канал</h2>
                    <button onClick={onClose} className="p-1 text-white/40 hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-transparent">
                    {/* Channel Basic Info Section */}
                    <div className="p-6 space-y-6">
                        <div className="flex gap-6 items-start">
                            <div className="relative group cursor-pointer">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold text-3xl shadow-lg ring-1 ring-white/10 group-hover:brightness-90 transition-all">
                                    {chat.avatar ? (
                                        <img src={chat.avatar} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        <Camera className="h-8 w-8 text-white/80" />
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="h-6 w-6 text-white" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[13px] text-blue-400 font-medium">Название канала</label>
                                    <div className="flex items-center gap-2 border-b-2 border-blue-500 py-1.5 focus-within:border-blue-400 transition-colors">
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="bg-transparent border-none outline-none text-white w-full text-[15px] placeholder-white/20"
                                            placeholder="Название канала"
                                        />
                                        <Smile className="h-5 w-5 text-white/30 hover:text-white/50 cursor-pointer" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="border-b border-white/10 py-1.5 focus-within:border-blue-500 transition-colors">
                                        <input
                                            type="text"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="bg-transparent border-none outline-none text-white w-full text-[15px] placeholder-white/20"
                                            placeholder="Описание (необязательно)"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Settings List Section 1 */}
                    <div className="space-y-0.5 border-t border-white/5 py-2">
                        <SettingsItem
                            icon={<ChevronRight className="h-5 w-5 rotate-90" />}
                            label="Тип канала"
                            value={channelType === 'private' ? 'Частный' : 'Публичный'}
                            leftIcon={<LinkIcon className="h-5 w-5" />}
                        />
                        <SettingsItem
                            icon={<ChevronRight className="h-5 w-5" />}
                            label="Обсуждение"
                            value="Добавить группу"
                            leftIcon={<MessageSquare className="h-5 w-5" />}
                        />
                        <SettingsItem
                            icon={<ChevronRight className="h-5 w-5" />}
                            label="Сообщения каналу"
                            value="Выкл."
                            badge="НОВОЕ"
                            leftIcon={<Bell className="h-5 w-5" />}
                        />
                        <SettingsItem
                            icon={<ChevronRight className="h-5 w-5" />}
                            label="Оформление"
                            value={name}
                            badge="НОВОЕ"
                            leftIcon={<Star className="h-5 w-5" />}
                        />
                        <SettingsToggle label="Переводить сообщения" leftIcon={<Globe2 className="h-5 w-5" />} badge="НОВОЕ" locked />
                        <SettingsToggle label="Подписывать сообщения" leftIcon={<Type className="h-5 w-5" />} />
                    </div>

                    <div className="px-6 py-2">
                        <p className="text-[13px] text-white/30 leading-snug">
                            Добавлять имена администраторов к их сообщениям в канале.
                        </p>
                    </div>

                    {/* Settings List Section 2 */}
                    <div className="space-y-0.5 border-t border-white/5 py-2 mt-2">
                        <SettingsItem icon={<ChevronRight className="h-5 w-5" />} label="Реакции" value="Все" leftIcon={<Heart className="h-5 w-5" />} />
                        <SettingsItem icon={<ChevronRight className="h-5 w-5" />} label="Пригласительные ссылки" value="1" leftIcon={<LinkIcon className="h-5 w-5" />} />
                        <SettingsItem icon={<ChevronRight className="h-5 w-5" />} label="Администраторы" value="1" leftIcon={<Shield className="h-5 w-5" />} />
                        <SettingsItem icon={<ChevronRight className="h-5 w-5" />} label="Подписчики" value="3" leftIcon={<Users className="h-5 w-5" />} />
                        <SettingsItem icon={<ChevronRight className="h-5 w-5" />} label="Чёрный список" leftIcon={<Ban className="h-5 w-5" />} />
                        <SettingsItem icon={<ChevronRight className="h-5 w-5" />} label="Недавние действия" leftIcon={<History className="h-5 w-5" />} />
                        <SettingsItem icon={<ChevronRight className="h-5 w-5" />} label="Партнёрские программы" badge="НОВОЕ" leftIcon={<Star className="h-5 w-5" />} />
                    </div>

                    {/* Delete Action */}
                    <div className="border-t border-white/5 py-2 mt-2">
                        <button
                            onClick={onDelete}
                            className="w-full flex items-center gap-4 px-6 py-3 text-red-500 hover:bg-red-500/5 transition-colors"
                        >
                            <Trash2 className="h-5 w-5" />
                            <span className="text-[15px]">Удалить канал</span>
                        </button>
                    </div>
                    <div className="h-4" />
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-2 px-6 py-4 bg-white/5 backdrop-blur-md border-t border-white/5">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-blue-400 font-bold text-[14px] uppercase hover:bg-white/5 rounded transition-colors"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-5 py-2 text-blue-400 font-bold text-[14px] uppercase hover:bg-white/5 rounded transition-colors"
                    >
                        {isSaving ? 'Сохранение...' : 'Сохранить'}
                    </button>
                </div>
            </GlassCard>
        </AnimatedModal>
    );
}

function SettingsItem({ label, value, icon, leftIcon, badge }: { label: string, value?: string, icon?: React.ReactNode, leftIcon: React.ReactNode, badge?: string }) {
    return (
        <button className="w-full flex items-center justify-between px-6 py-3 hover:bg-white/5 transition-colors group">
            <div className="flex items-center gap-6">
                <div className="text-white/40 group-hover:text-white/60 transition-colors">
                    {leftIcon}
                </div>
                <div className="flex flex-col items-start translate-y-[2px]">
                    <div className="flex items-center gap-2">
                        <span className="text-[15px] text-white font-medium">{label}</span>
                        {badge && (
                            <span className="text-[9px] font-black bg-blue-500/20 text-blue-400 px-1 py-0.5 rounded leading-none">
                                {badge}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-1">
                {value && <span className="text-[14px] text-blue-400">{value}</span>}
                <div className="text-white/10 group-hover:text-white/30 transition-colors">
                    {icon}
                </div>
            </div>
        </button>
    );
}

function SettingsToggle({ label, leftIcon, badge, locked, defaultOn = false }: { label: string, leftIcon: React.ReactNode, badge?: string, locked?: boolean, defaultOn?: boolean }) {
    const [on, setOn] = useState(defaultOn);
    return (
        <label className="w-full flex items-center justify-between px-6 py-3 hover:bg-white/5 transition-colors group cursor-pointer">
            <div className="flex items-center gap-6">
                <div className="text-white/40 group-hover:text-white/60 transition-colors">
                    {leftIcon}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[15px] text-white font-medium">{label}</span>
                    {badge && (
                        <span className="text-[9px] font-black bg-blue-500/20 text-blue-400 px-1 py-0.5 rounded leading-none">
                            {badge}
                        </span>
                    )}
                </div>
            </div>
            {locked ? (
                <div className="w-9 h-4 bg-white/20 rounded-full flex items-center px-1">
                    <Lock className="h-3 w-3 text-white/40" />
                </div>
            ) : (
                <div
                    onClick={() => setOn(!on)}
                    className={`w-9 h-4 rounded-full relative transition-colors ${on ? 'bg-blue-500' : 'bg-white/20'}`}
                >
                    <div className={`absolute -top-0.5 left-0 w-5 h-5 bg-[#1a1c2e] border-2 border-white/20 rounded-full transition-transform ${on ? 'translate-x-5 border-blue-500' : 'translate-x-0'}`} />
                </div>
            )}
        </label>
    );
}


