import React, { useEffect, useRef, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import {
    Volume2, Settings, Gift, Users, Shield, LogOut,
    Image as ImageIcon, AlertCircle, Plus, X, Sliders
} from 'lucide-react';
import EditChannelModal from './EditChannelModal';

interface ChannelInfoPanelProps {
    chat: any;
    onClose?: () => void;
}

export default function ChannelInfoPanel({ chat, onClose }: ChannelInfoPanelProps) {
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [fullChatDetails, setFullChatDetails] = useState<any>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const lastFetchedChannelIdRef = useRef<string | null>(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
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
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app';
            const res = await fetch(`${API_URL}/api/chats/${chat.id || chat._id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setFullChatDetails(data);
            }
        } catch (err) {
            console.error("Failed to fetch chat details:", err);
        } finally {
            setLoading(false);
        }
    };

    if (!chat) return null;

    const isOwner = (chat.creator_id ?? chat.creatorId) === currentUser?.id;
    const subscribersCount = fullChatDetails?.participants?.length || chat.participantsCount || 0;
    const adminCount = 1; // Default for now

    return (
        <div className="lg:h-full lg:min-h-0 lg:flex-1 lg:static fixed inset-0 z-[100] flex flex-col overflow-hidden max-lg:bg-white/[0.07] max-lg:backdrop-blur-2xl max-lg:backdrop-saturate-150 lg:bg-transparent lg:border-l lg:border-white/5 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] lg:pt-0 lg:pb-0">
            {/* Close Button Top Right for consistency */}
            <button
                onClick={onClose}
                className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-20 p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-full transition-all lg:top-4"
            >
                <X className="h-6 w-6" />
            </button>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain custom-scrollbar flex flex-col items-center">
                {/* Channel Header */}
                <div className="flex flex-col items-center pt-8 pb-6 px-4 w-full">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold text-4xl shadow-2xl group-hover:scale-105 transition-transform duration-300">
                            {chat.avatar ? (
                                <img src={chat.avatar} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                (chat.name || '?').charAt(0).toUpperCase()
                            )}
                        </div>
                        {isOwner && (
                            <div className="absolute bottom-0 right-0 p-1.5 bg-blue-500 rounded-full border-2 border-[#1e293b] text-white">
                                <Settings className="h-3 w-3" />
                            </div>
                        )}
                    </div>

                    <h2 className="text-xl font-bold text-white mt-4 text-center">{chat.name}</h2>
                    <p className="text-white/40 text-sm mt-1">
                        {subscribersCount} obunachi
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center gap-4 px-6 w-full mb-8">
                    {isOwner ? (
                        <>
                            <ActionButton icon={<Volume2 className="h-5 w-5" />} label="Ovoz" />
                            <ActionButton
                                icon={<Sliders className="h-5 w-5" />}
                                label="Boshqaruv"
                                onClick={() => setShowEditModal(true)}
                            />
                            <ActionButton icon={<Gift className="h-5 w-5" />} label="Sovg'a" />
                        </>
                    ) : (
                        <>
                            <ActionButton icon={<Volume2 className="h-5 w-5" />} label="Ovoz" />
                            <ActionButton icon={<Gift className="h-5 w-5" />} label="Sovg'a" />
                            <ActionButton icon={<LogOut className="h-5 w-5" />} label="Chiqish" variant="danger" />
                        </>
                    )}
                </div>

                {/* Menu List */}
                <div className="w-full px-2 space-y-1">
                    <div className="h-px bg-white/5 mx-2 my-2" />

                    {isOwner ? (
                        <>
                            <MenuItem
                                icon={<Users className="h-5 w-5" />}
                                label={`${subscribersCount} obunachi`}
                                rightIcon={<Plus className="h-4 w-4" />}
                            />
                            <MenuItem
                                icon={<Shield className="h-5 w-5" />}
                                label={`${adminCount} administrator`}
                            />
                            <MenuItem
                                icon={<LogOut className="h-5 w-5 text-red-400" />}
                                label="Kanalni tark etish"
                                className="text-red-400"
                            />
                        </>
                    ) : (
                        <>
                            <MenuItem
                                icon={<ImageIcon className="h-5 w-5" />}
                                label="1 ta fotosurat"
                            />
                            <div className="h-px bg-white/5 mx-2 my-2" />
                            <MenuItem
                                icon={<LogOut className="h-5 w-5" />}
                                label="Kanalni tark etish"
                            />
                            <MenuItem
                                icon={<AlertCircle className="h-5 w-5 text-red-500" />}
                                label="Shikoyat qilish"
                                className="text-red-500"
                            />
                        </>
                    )}
                </div>

                {/* Description if exists */}
                {chat.description && (
                    <div className="w-full px-6 py-4 mt-4 border-t border-white/5">
                        <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-wider mb-2">Tavsif</h3>
                        <p className="text-sm text-white/70 leading-relaxed">{chat.description}</p>
                    </div>
                )}
            </div>

            <EditChannelModal
                open={showEditModal}
                chat={chat}
                onClose={() => setShowEditModal(false)}
            />
        </div>
    );
}

function ActionButton({ icon, label, variant = 'default', onClick }: { icon: React.ReactNode, label: string, variant?: 'default' | 'danger', onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex flex-col items-center gap-1 group"
        >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${variant === 'danger'
                ? 'bg-red-500/10 text-red-400 group-hover:bg-red-500/20'
                : 'bg-white/5 text-white/70 group-hover:bg-white/10 group-hover:text-white'
                }`}>
                {icon}
            </div>
            <span className={`text-[11px] font-medium transition-colors ${variant === 'danger' ? 'text-red-400/70' : 'text-white/40 group-hover:text-white/60'
                }`}>{label}</span>
        </button>
    );
}

function MenuItem({ icon, label, rightIcon, className = "" }: { icon: React.ReactNode, label: string, rightIcon?: React.ReactNode, className?: string }) {
    return (
        <button className={`w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group ${className}`}>
            <div className="flex items-center gap-4">
                <div className="w-6 flex items-center justify-center text-white/50 group-hover:text-white transition-colors">
                    {icon}
                </div>
                <span className="text-[14px] font-medium">{label}</span>
            </div>
            {rightIcon && (
                <div className="text-white/30 group-hover:text-white/50">
                    {rightIcon}
                </div>
            )}
        </button>
    );
}

