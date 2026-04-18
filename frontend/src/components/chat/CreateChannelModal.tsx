import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { AnimatedModal } from '../ui/AnimatedModal';
import { Camera, Globe, Lock, ArrowLeft, Check, Megaphone, X } from 'lucide-react';

interface CreateChannelModalProps {
    open: boolean;
    onClose: () => void;
    onCreateChannel: (data: { name: string; description: string; link?: string; channelType: 'public' | 'private' }) => void;
}

export default function CreateChannelModal({ open, onClose, onCreateChannel }: CreateChannelModalProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [channelType, setChannelType] = useState<'public' | 'private'>('public');
    const [link, setLink] = useState('');
    const [creating, setCreating] = useState(false);

    const handleNext = () => {
        if (!name.trim()) return;
        setStep(2);
    };

    const handleCreate = async () => {
        if (!name.trim()) return;
        setCreating(true);
        await onCreateChannel({
            name,
            description,
            link: channelType === 'public' ? link : undefined,
            channelType
        });
        setCreating(false);
        onClose();
    };

    return (
        <AnimatedModal open={open} zClass="z-50" onBackdropClick={onClose} className="bg-black/60 backdrop-blur-sm p-4">
            <GlassCard className="w-full max-w-md !p-0 border border-white/10 flex flex-col max-h-[90vh] shadow-2xl overflow-hidden !rounded-[28px]">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/10">
                    <div className="flex items-center gap-3">
                        {step === 2 && (
                            <button onClick={() => setStep(1)} className="text-white/50 hover:text-white transition-colors">
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                        )}
                        <h2 className="text-xl font-bold text-white">
                            {step === 1 ? "Новый канал" : "Настройки канала"}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {step === 1 ? (
                        <div className="space-y-6">
                            {/* Avatar Picker */}
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center cursor-pointer hover:bg-blue-600 transition-colors shadow-lg">
                                    <Camera className="h-10 w-10 text-white" />
                                </div>
                                <p className="text-white/40 text-sm">Выберите фото канала</p>
                            </div>

                            {/* Inputs */}
                            <div className="space-y-4">
                                <div className="space-y-1.5 line-input-container">
                                    <label className="text-xs font-medium text-blue-400 ml-1">Название канала</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Название канала"
                                        className="w-full bg-transparent border-b border-white/10 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                        autoFocus
                                    />
                                </div>

                                <div className="space-y-1.5 line-input-container">
                                    <input
                                        type="text"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Описание (необязательно)"
                                        className="w-full bg-transparent border-b border-white/10 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                    <p className="text-[11px] text-white/30 ml-1">Вы можете добавить описание для вашего канала.</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Type Selection */}
                            <div className="space-y-4">
                                <div
                                    onClick={() => setChannelType('public')}
                                    className={`flex items-start gap-4 p-3 rounded-xl cursor-pointer transition-colors ${channelType === 'public' ? 'bg-white/5' : 'hover:bg-white/5'}`}
                                >
                                    <div className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center ${channelType === 'public' ? 'border-blue-500' : 'border-white/30'}`}>
                                        {channelType === 'public' && <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-white font-medium">Публичный канал</h3>
                                        <p className="text-white/40 text-sm">Все могут найти канал через поиск и подписаться.</p>
                                    </div>
                                </div>

                                <div
                                    onClick={() => setChannelType('private')}
                                    className={`flex items-start gap-4 p-3 rounded-xl cursor-pointer transition-colors ${channelType === 'private' ? 'bg-white/5' : 'hover:bg-white/5'}`}
                                >
                                    <div className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center ${channelType === 'private' ? 'border-blue-500' : 'border-white/30'}`}>
                                        {channelType === 'private' && <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-white font-medium">Частный канал</h3>
                                        <p className="text-white/40 text-sm">Подписаться можно только по ссылке-приглашению.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Link Input */}
                            {channelType === 'public' && (
                                <div className="space-y-3 pt-2">
                                    <h3 className="text-white font-medium px-1">Ссылка</h3>
                                    <div className="flex items-center gap-1 border-b border-white/10 py-2 focus-within:border-blue-500 transition-colors">
                                        <span className="text-white/50">t.me/</span>
                                        <input
                                            type="text"
                                            value={link}
                                            onChange={(e) => setLink(e.target.value)}
                                            placeholder="link"
                                            className="flex-1 bg-transparent text-white focus:outline-none"
                                            autoFocus
                                        />
                                    </div>
                                    <p className="text-[11px] text-white/30 px-1">
                                        Вы можете выбрать публичную ссылку на <b>ExpertLine</b>. Люди смогут найти ваш канал по этой ссылке.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-white/10 flex justify-end gap-3 px-6">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-blue-400 hover:text-blue-300 transition-colors font-medium"
                    >
                        Отмена
                    </button>
                    {step === 1 ? (
                        <button
                            onClick={handleNext}
                            disabled={!name.trim()}
                            className="px-6 py-2 bg-transparent text-blue-400 disabled:opacity-30 hover:text-blue-300 transition-colors font-medium flex items-center gap-2"
                        >
                            Создать
                        </button>
                    ) : (
                        <button
                            onClick={handleCreate}
                            disabled={creating || (channelType === 'public' && !link.trim())}
                            className="px-6 py-2 bg-transparent text-blue-400 disabled:opacity-30 hover:text-blue-300 transition-colors font-medium flex items-center gap-2"
                        >
                            {creating && <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>}
                            Сохранить
                        </button>
                    )}
                </div>
            </GlassCard>
        </AnimatedModal>
    );
}

