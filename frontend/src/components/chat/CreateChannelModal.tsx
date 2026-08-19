import React, { useState } from 'react';
import { AnimatedModal } from '../ui/AnimatedModal';
import { Camera, ArrowLeft, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface CreateChannelModalProps {
    open: boolean;
    onClose: () => void;
    onCreateChannel: (data: { name: string; description: string; link?: string; channelType: 'public' | 'private' }) => void;
}

export default function CreateChannelModal({ open, onClose, onCreateChannel }: CreateChannelModalProps) {
    const { t } = useLanguage();
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
            <div className="w-full max-w-md bg-[#212121] border border-white/[0.06] flex flex-col max-h-[90vh] shadow-2xl overflow-hidden rounded-[20px]">
                <div className="p-4 border-b border-white/[0.06] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        {step === 2 && (
                            <button onClick={() => setStep(1)} className="text-white/50 hover:text-white transition-colors">
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                        )}
                        <h2 className="text-xl font-bold text-white">
                            {step === 1 ? (t('new_channel') || 'Yangi kanal') : (t('channel_settings') || 'Kanal sozlamalari')}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {step === 1 ? (
                        <div className="space-y-6">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-24 h-24 rounded-full bg-[#8774e1] flex items-center justify-center cursor-pointer hover:bg-[#7a68d4] transition-colors shadow-lg">
                                    <Camera className="h-10 w-10 text-white" />
                                </div>
                                <p className="text-white/40 text-sm">{t('choose_channel_photo') || 'Kanal rasmini tanlang'}</p>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-[#8774e1] ml-1">{t('channel_name') || 'Kanal nomi'}</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder={t('channel_name') as string || 'Kanal nomi'}
                                        className="w-full bg-transparent border-b border-white/10 py-2 text-white focus:outline-none focus:border-[#8774e1] transition-colors"
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <input
                                        type="text"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder={t('description_optional') || "Tavsif (ixtiyoriy)"}
                                        className="w-full bg-transparent border-b border-white/10 py-2 text-white focus:outline-none focus:border-[#8774e1] transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div
                                    onClick={() => setChannelType('public')}
                                    className={`flex items-start gap-4 p-3 rounded-xl cursor-pointer transition-colors ${channelType === 'public' ? 'bg-white/5' : 'hover:bg-white/5'}`}
                                >
                                    <div className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center ${channelType === 'public' ? 'border-[#8774e1]' : 'border-white/30'}`}>
                                        {channelType === 'public' && <div className="h-2.5 w-2.5 rounded-full bg-[#8774e1]" />}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-white font-medium">{t('public_channel') || 'Ommaviy kanal'}</h3>
                                        <p className="text-white/40 text-sm">{t('public_channel_desc') || "Barchasi kanalni qidiruv orqali topishi mumkin."}</p>
                                    </div>
                                </div>
                                <div
                                    onClick={() => setChannelType('private')}
                                    className={`flex items-start gap-4 p-3 rounded-xl cursor-pointer transition-colors ${channelType === 'private' ? 'bg-white/5' : 'hover:bg-white/5'}`}
                                >
                                    <div className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center ${channelType === 'private' ? 'border-[#8774e1]' : 'border-white/30'}`}>
                                        {channelType === 'private' && <div className="h-2.5 w-2.5 rounded-full bg-[#8774e1]" />}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-white font-medium">{t('private_channel') || 'Shaxsiy kanal'}</h3>
                                        <p className="text-white/40 text-sm">{t('private_channel_desc') || "Faqat taklifnoma havolasi orqali obuna bo'lish mumkin."}</p>
                                    </div>
                                </div>
                            </div>

                            {channelType === 'public' && (
                                <div className="space-y-3 pt-2">
                                    <h3 className="text-white font-medium px-1">{t('link') || 'Havola'}</h3>
                                    <div className="flex items-center gap-1 border-b border-white/10 py-2 focus-within:border-[#8774e1] transition-colors">
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
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/[0.06] flex justify-end gap-3 px-6">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-white/50 hover:text-white/70 transition-colors font-medium"
                    >
                        {t('cancel') || 'Bekor'}
                    </button>
                    {step === 1 ? (
                        <button
                            onClick={handleNext}
                            disabled={!name.trim()}
                            className="px-6 py-2 text-[#8774e1] disabled:opacity-30 hover:text-[#9d8ef0] transition-colors font-medium"
                        >
                            {t('next') || 'Keyingi'}
                        </button>
                    ) : (
                        <button
                            onClick={handleCreate}
                            disabled={creating || (channelType === 'public' && !link.trim())}
                            className="px-6 py-2 text-[#8774e1] disabled:opacity-30 hover:text-[#9d8ef0] transition-colors font-medium flex items-center gap-2"
                        >
                            {creating && <div className="w-4 h-4 border-2 border-[#8774e1]/30 border-t-[#8774e1] rounded-full animate-spin" />}
                            {t('save') || 'Saqlash'}
                        </button>
                    )}
                </div>
            </div>
        </AnimatedModal>
    );
}
