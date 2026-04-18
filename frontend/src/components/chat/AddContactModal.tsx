import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { AnimatedModal } from '../ui/AnimatedModal';
import { X, User, Phone } from 'lucide-react';

interface AddContactModalProps {
    open: boolean;
    onClose: () => void;
    onStartChat: (user: any) => void;
}

export default function AddContactModal({ open, onClose, onStartChat }: AddContactModalProps) {
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;
        // Keep only digits and +
        val = val.replace(/[^\d+]/g, '');
        if (!val.startsWith('+998')) {
            val = '+998' + val.replace(/\+998/g, '');
        }
        setPhoneNumber(val.substring(0, 13)); // Prefix + 9 digits
    };

    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || phoneNumber.length < 13) {
            setError('Ism va to\'liq telefon raqamini kiriting');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app';

            // 1. Search for user BY PHONE STRICTLY
            const searchRes = await fetch(`${API_URL}/api/users/search?phone=${encodeURIComponent(phoneNumber)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!searchRes.ok) throw new Error('Qidiruvda xato');
            const users = await searchRes.json();

            if (users.length === 0) {
                setError('Ushbu raqamli foydalanuvchi topilmadi');
                setLoading(false);
                return;
            }

            const foundUser = users[0];

            // 2. Add to contacts
            const saveRes = await fetch(`${API_URL}/api/users/contacts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contactUserId: foundUser.id,
                    name: name,
                    surname: surname
                })
            });

            if (saveRes.ok) {
                onStartChat({ ...foundUser, name, surname }); // Open chat with custom names
                onClose();
            } else {
                setError('Kontaktni saqlashda xato');
            }
        } catch (err) {
            setError('Xato yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatedModal open={open} zClass="z-[70]" className="bg-black/60 backdrop-blur-sm p-4">
            <GlassCard className="w-full max-w-[420px] !p-0 border border-white/20 flex flex-col max-h-[85vh] overflow-hidden !rounded-[25px] shadow-2xl">
                {/* Header */}
                <div className="px-6 py-5 flex justify-between items-center">
                    <h2 className="text-[20px] font-bold text-white">Новый контакт</h2>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleAddContact} className="px-8 pb-8 space-y-8">
                    {/* Name Field */}
                    <div className="flex items-center gap-6 group">
                        <div className="p-2 text-white/30 group-focus-within:text-blue-400 transition-colors">
                            <User className="h-6 w-6" />
                        </div>
                        <div className="flex-1 relative">
                            <label className="absolute -top-5 left-0 text-[13px] text-blue-400 font-medium">Имя</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-transparent border-b border-white/10 py-2 text-white text-[16px] focus:outline-none focus:border-blue-400 transition-colors placeholder:text-white/20"
                                placeholder="Имя"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Surname Field */}
                    <div className="flex items-center gap-6 group">
                        <div className="w-6 mx-2"></div> {/* Spacing for alignment with icon above */}
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={surname}
                                onChange={(e) => setSurname(e.target.value)}
                                className="w-full bg-transparent border-b border-white/10 py-2 text-white text-[16px] focus:outline-none focus:border-blue-400 transition-colors placeholder:text-white/20"
                                placeholder="Фамилия"
                            />
                        </div>
                    </div>

                    {/* Phone Field */}
                    <div className="flex items-center gap-6 group">
                        <div className="p-2 text-white/30 group-focus-within:text-blue-400 transition-colors">
                            <Phone className="h-6 w-6" />
                        </div>
                        <div className="flex-1 relative pt-2">
                            <label className="absolute -top-4 left-0 text-[13px] text-white/40 font-medium group-focus-within:text-blue-400 transition-colors">Номер телефона</label>
                            <input
                                type="text"
                                value={phoneNumber}
                                onChange={handlePhoneChange}
                                className="w-full bg-transparent border-b border-white/10 py-2 text-white text-[17px] focus:outline-none focus:border-blue-400 transition-colors"
                                placeholder="+998 -- --- -- --"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-6 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-blue-400 font-bold text-[15px] uppercase hover:opacity-80 transition-opacity"
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name}
                            className="text-blue-400 font-bold text-[15px] uppercase hover:opacity-80 transition-opacity disabled:opacity-30 flex items-center gap-2"
                        >
                            {loading && <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>}
                            Добавить
                        </button>
                    </div>
                </form>
            </GlassCard>
        </AnimatedModal>
    );
}


