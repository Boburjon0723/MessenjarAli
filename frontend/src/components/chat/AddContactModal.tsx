'use client';

import React, { useEffect, useState } from 'react';
import { AnimatedModal } from '../ui/AnimatedModal';
import { X, User, Phone } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

interface AddContactModalProps {
    open: boolean;
    onClose: () => void;
    onStartChat: (user: any) => void | Promise<void>;
}

export default function AddContactModal({ open, onClose, onStartChat }: AddContactModalProps) {
    const { t } = useLanguage();
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('+998');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setName('');
        setSurname('');
        setPhoneNumber('+998');
        setError('');
        setLoading(false);
    }, [open]);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/[^\d+]/g, '');
        if (!val.startsWith('+998')) {
            val = '+998' + val.replace(/\+998/g, '').replace(/^\+/, '');
        }
        setPhoneNumber(val.substring(0, 13));
    };

    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || phoneNumber.length < 13) {
            setError(t('enter_name_and_phone'));
            return;
        }

        setLoading(true);
        setError('');

        try {
            const searchRes = await apiFetch(`/api/users/search?phone=${encodeURIComponent(phoneNumber)}`);
            if (!searchRes.ok) throw new Error('search');
            const users = await searchRes.json();

            if (!Array.isArray(users) || users.length === 0) {
                setError(t('user_not_found'));
                setLoading(false);
                return;
            }

            const foundUser = users[0];
            const saveRes = await apiFetch('/api/users/contacts', {
                method: 'POST',
                body: JSON.stringify({
                    contactUserId: foundUser.id,
                    name: name.trim(),
                    surname: surname.trim(),
                }),
            });

            if (saveRes.ok) {
                await onStartChat({
                    ...foundUser,
                    name: name.trim(),
                    surname: surname.trim(),
                    avatar: foundUser.avatar_url || foundUser.avatar,
                });
                onClose();
            } else {
                setError(t('contact_save_error'));
            }
        } catch {
            setError(t('contact_search_error'));
        } finally {
            setLoading(false);
        }
    };

    const fieldCls =
        'w-full bg-transparent border-b border-white/10 py-2 text-white text-[16px] focus:outline-none focus:border-[#8774e1] transition-colors placeholder:text-[#6d6d6d]';

    return (
        <AnimatedModal open={open} zClass="z-[80]" onBackdropClick={onClose} className="bg-black/50 p-4">
            <div className="w-full max-w-[420px] flex flex-col overflow-hidden rounded-[16px] bg-[#212121] shadow-[0_2px_16px_rgba(0,0,0,0.45)]">
                <div className="px-4 py-3 flex justify-between items-center">
                    <h2 className="text-[20px] font-medium text-white">{t('new_contact')}</h2>
                    <button type="button" onClick={onClose} className="text-[#aaaaaa] hover:text-white transition-colors p-1">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleAddContact} className="px-6 pb-5 space-y-7">
                    <div className="flex items-center gap-5">
                        <User className="h-6 w-6 shrink-0 text-[#aaaaaa]" />
                        <div className="flex-1 relative">
                            <label className="absolute -top-4 left-0 text-[13px] text-[#8774e1]">{t('name')}</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className={fieldCls}
                                placeholder={t('name')}
                                autoFocus
                                maxLength={70}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-5">
                        <div className="w-6 shrink-0" />
                        <input
                            type="text"
                            value={surname}
                            onChange={(e) => setSurname(e.target.value)}
                            className={fieldCls}
                            placeholder={t('surname')}
                            maxLength={70}
                        />
                    </div>

                    <div className="flex items-center gap-5">
                        <Phone className="h-6 w-6 shrink-0 text-[#aaaaaa]" />
                        <div className="flex-1 relative pt-1">
                            <label className="absolute -top-4 left-0 text-[13px] text-[#aaaaaa]">{t('phone_number')}</label>
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={handlePhoneChange}
                                className={`${fieldCls} text-[17px]`}
                                placeholder="+998 -- --- -- --"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg">{error}</div>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-[#8774e1] font-medium text-[15px] uppercase hover:bg-[#8774e1]/10 rounded-lg transition-colors"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name.trim()}
                            className="px-4 py-2 text-[#8774e1] font-medium text-[15px] uppercase hover:bg-[#8774e1]/10 rounded-lg transition-colors disabled:opacity-30 flex items-center gap-2"
                        >
                            {loading && <div className="w-4 h-4 border-2 border-[#8774e1]/30 border-t-[#8774e1] rounded-full animate-spin" />}
                            {t('add')}
                        </button>
                    </div>
                </form>
            </div>
        </AnimatedModal>
    );
}
