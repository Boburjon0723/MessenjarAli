import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { AnimatedModal } from '../ui/AnimatedModal';
import { X, Search, UserPlus, SortDesc, Trash2 } from 'lucide-react';

interface ContactsModalProps {
    open: boolean;
    contacts: any[];
    onClose: () => void;
    onStartChat: (user: any) => void;
    onAddContact: () => void;
    onDeleteContact: (contactId: string) => void;
}

export default function ContactsModal({ open, contacts, onClose, onStartChat, onAddContact, onDeleteContact }: ContactsModalProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredContacts = contacts.filter(c =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone?.includes(searchQuery)
    );

    return (
        <AnimatedModal open={open} zClass="z-[60]" onBackdropClick={onClose} className="bg-black/60 backdrop-blur-sm p-4">
            <GlassCard className="w-full max-w-[420px] !p-0 flex flex-col max-h-[85vh] overflow-hidden !rounded-[25px] border border-white/20 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-white/10 backdrop-blur-md">
                    <div className="flex items-center gap-4 text-white">
                        <h2 className="text-[19px] font-bold">Контакты</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-2 text-white/50 hover:text-white transition-colors">
                            <SortDesc className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="px-6 py-3 border-b border-white/5">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 group-focus-within:text-blue-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Поиск"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-transparent focus:border-blue-500/50 rounded-xl py-2 pl-10 pr-4 text-white text-sm outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Contacts List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    {filteredContacts.length > 0 ? (
                        filteredContacts.map((contact, index) => (
                            <div
                                key={contact.id || index}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all group/item animate-fade-in relative"
                                style={{ animationDelay: `${index * 30}ms` }}
                            >
                                <button
                                    onClick={() => onStartChat(contact)}
                                    className="flex-1 flex items-center gap-3 text-left"
                                >
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-lg shadow-lg border border-white/10 group-hover/item:scale-105 transition-transform overflow-hidden">
                                            {(() => {
                                                const avatar = contact.avatar || contact.avatar_url;
                                                if (avatar && avatar !== 'null' && avatar !== '' && avatar !== 'use_initials') {
                                                    const src = avatar.startsWith('http') || avatar.startsWith('data:')
                                                        ? avatar
                                                        : `${process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app'}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
                                                    return (
                                                        <img
                                                            src={src}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                                (e.target as HTMLImageElement).parentElement!.innerText = (contact.name?.[0] || '?').toUpperCase();
                                                            }}
                                                        />
                                                    );
                                                }
                                                return (contact.name?.[0] || '?').toUpperCase();
                                            })()}
                                        </div>
                                        {contact.status === 'online' && (
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1a1c2e]"></div>
                                        )}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <h3 className="text-[15px] font-medium text-white truncate">{contact.name}</h3>
                                        <p className="text-xs text-white/40 group-hover/item:text-blue-400 transition-colors">
                                            {contact.status || "был(a) недавно"}
                                        </p>
                                    </div>
                                </button>

                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteContact(contact.id); }}
                                    className="p-2 text-white/20 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-all rounded-lg hover:bg-red-400/10"
                                    title="O'chirish"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-white/30">
                            <p className="text-sm">Контакт не найден</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 bg-white/10 flex justify-between items-center border-t border-white/5">
                    <button
                        onClick={onAddContact}
                        className="flex items-center gap-2 px-4 py-2 text-blue-400 font-bold text-[14px] uppercase hover:bg-blue-400/10 rounded-xl transition-colors"
                    >
                        <UserPlus className="h-5 w-5" />
                        Добавить контакт
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-white/50 font-bold text-[14px] uppercase hover:bg-white/10 hover:text-white rounded-xl transition-colors"
                    >
                        Закрыть
                    </button>
                </div>
            </GlassCard>
        </AnimatedModal>
    );
}


