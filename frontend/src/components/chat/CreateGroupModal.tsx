import React, { useState, useRef } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { AnimatedModal } from '../ui/AnimatedModal';
import { useNotification } from '@/context/NotificationContext';

interface CreateGroupModalProps {
    open: boolean;
    onClose: () => void;
    onCreateGroup: (name: string, participantIds: string[], avatarUrl?: string) => void;
}

export default function CreateGroupModal({ open, onClose, onCreateGroup }: CreateGroupModalProps) {
    const { showError } = useNotification();
    const [groupName, setGroupName] = useState('');
    const [creating, setCreating] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarUploadedUrl, setAvatarUploadedUrl] = useState<string | null>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file || !file.type.startsWith('image/')) return;
        setAvatarPreview(URL.createObjectURL(file));
        setUploadingAvatar(true);
        try {
            const { uploadFileWithProgress } = await import('@/lib/upload');
            const formData = new FormData();
            formData.append('files', file);
            const data = await uploadFileWithProgress('/api/media/upload', formData);
            const url = (data?.url ?? data?.urls?.[0] ?? data?.files?.[0]?.url) || null;
            if (url) setAvatarUploadedUrl(url);
        } catch (err) {
            console.error('Rasm yuklanmadi:', err);
            setAvatarPreview(null);
            showError('Rasm yuklanmadi. Qayta urinib ko\'ring.');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleCreate = async () => {
        if (!groupName.trim()) return;
        setCreating(true);
        await onCreateGroup(groupName.trim(), [], avatarUploadedUrl || undefined);
        setCreating(false);
        onClose();
    };

    return (
        <AnimatedModal open={open} zClass="z-50" className="bg-black/60 backdrop-blur-sm p-4">
            <GlassCard className="w-full max-w-md !p-0 border border-white/10 flex flex-col max-h-[85vh] overflow-hidden !rounded-[28px] shadow-2xl">
                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/10 backdrop-blur-md">
                    <h2 className="text-[19px] font-bold text-white">Guruh yaratish</h2>
                    <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <div className="space-y-6 pt-2">
                        <div className="flex flex-col items-center gap-4">
                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAvatarChange}
                            />
                            <button
                                type="button"
                                onClick={() => avatarInputRef.current?.click()}
                                disabled={uploadingAvatar}
                                className="relative w-24 h-24 rounded-full bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden hover:border-white/40 hover:bg-white/10 transition-colors disabled:opacity-70"
                            >
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                )}
                                {uploadingAvatar && (
                                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    </div>
                                )}
                            </button>
                            <p className="text-white/40 text-sm text-center">
                                {avatarUploadedUrl ? 'Profil rasm tanlandi' : 'Profil rasmni shu yerdan yuklang (ixtiyoriy)'}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-white/70">Guruh nomi</label>
                            <input
                                type="text"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                placeholder="Masalan: Do'stlar"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--accent-purple-start)]"
                                autoFocus
                            />
                        </div>

                        <p className="text-white/50 text-sm">A'zolarni guruh yaratilgach sozlamalar orqali qo'shasiz.</p>
                    </div>
                </div>

                <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end">
                    <button
                        onClick={handleCreate}
                        disabled={!groupName.trim() || creating}
                        className="px-6 py-2 bg-[var(--accent-purple-start)] text-white rounded-lg disabled:opacity-50 hover:bg-[var(--accent-purple-end)] transition-colors flex items-center gap-2"
                    >
                        {creating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        Yaratish
                    </button>
                </div>
            </GlassCard>
        </AnimatedModal>
    );
}


