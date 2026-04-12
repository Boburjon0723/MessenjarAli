import React, { useState, useEffect } from 'react';
import { GlassCard } from './GlassCard';
import { AnimatedModal } from './AnimatedModal';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface GlassDatePickerProps {
    open: boolean;
    value: string; // YYYY-MM-DD
    onChange: (val: string) => void;
    onClose: () => void;
    language: 'uz' | 'ru';
}

export const GlassDatePicker: React.FC<GlassDatePickerProps> = ({
    open,
    value,
    onChange,
    onClose,
    language
}) => {
    const today = new Date();
    const initialDate = value ? new Date(value) : new Date();

    const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
    const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
    const [selectedDate, setSelectedDate] = useState<Date | null>(value ? new Date(value) : null);

    const monthNames = {
        uz: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'],
        ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
    };

    const daysOfWeek = {
        uz: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sha', 'Ya'],
        ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
    };

    const getDaysInMonth = (month: number, year: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month: number, year: number) => {
        let day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // Adjust to Monday start
    };

    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const handleDateSelect = (day: number) => {
        const newDate = new Date(currentYear, currentMonth, day);
        setSelectedDate(newDate);
        const y = newDate.getFullYear();
        const m = String(newDate.getMonth() + 1).padStart(2, '0');
        const d = String(newDate.getDate()).padStart(2, '0');
        onChange(`${y}-${m}-${d}`);
    };

    const days = [];
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

    // Padding for first week
    for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="w-10 h-10"></div>);
    }

    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
        const isSelected = selectedDate &&
            selectedDate.getDate() === i &&
            selectedDate.getMonth() === currentMonth &&
            selectedDate.getFullYear() === currentYear;
        const isToday = today.getDate() === i &&
            today.getMonth() === currentMonth &&
            today.getFullYear() === currentYear;

        days.push(
            <button
                key={i}
                onClick={() => handleDateSelect(i)}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm transition-all
                    ${isSelected ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20 scale-110 font-bold' : 'text-white/80 hover:bg-white/10'}
                    ${isToday && !isSelected ? 'border border-blue-500/50 text-blue-400' : ''}
                `}
            >
                {i}
            </button>
        );
    }

    return (
        <AnimatedModal open={open} zClass="z-[300]" onBackdropClick={onClose} className="bg-black/60 backdrop-blur-md p-4">
            <GlassCard className="w-full max-w-[340px] bg-[#1c242f]/90 p-0 overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] border border-white/10">
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-500/80"></div>
                        <div className="w-2 h-2 rounded-full bg-yellow-500/80"></div>
                        <div className="w-2 h-2 rounded-full bg-green-500/80"></div>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={currentYear}
                            onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                            className="bg-transparent text-white font-bold outline-none cursor-pointer hover:text-blue-400 transition-colors appearance-none px-2"
                        >
                            {Array.from({ length: 100 }, (_, i) => today.getFullYear() - i).map(y => (
                                <option key={y} value={y} className="bg-[#1c242f] text-white">{y}</option>
                            ))}
                        </select>
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors bg-white/10 rounded-full p-1">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-white/10 text-white/60 transition-colors">
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <h4 className="text-white font-semibold text-lg min-w-[120px] text-center tracking-tight">
                            {monthNames[language][currentMonth]}
                        </h4>
                        <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-white/10 text-white/60 transition-colors">
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {daysOfWeek[language].map(d => (
                            <div key={d} className="w-10 h-10 flex items-center justify-center text-[10px] font-black text-white/20 uppercase tracking-widest">
                                {d}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {days}
                    </div>
                </div>

                <div className="p-4 border-t border-white/10 flex justify-between items-center bg-white/5">
                    <button onClick={() => {
                        const y = today.getFullYear();
                        const m = String(today.getMonth() + 1).padStart(2, '0');
                        const d = String(today.getDate()).padStart(2, '0');
                        onChange(`${y}-${m}-${d}`);
                        onClose();
                    }} className="text-blue-400 text-xs font-bold hover:text-blue-300 transition-colors uppercase tracking-wider">
                        Bugun
                    </button>
                    <button onClick={onClose} className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-full transition-all shadow-lg shadow-blue-500/20 active:scale-95 uppercase tracking-wider">
                        OK
                    </button>
                </div>
            </GlassCard>
        </AnimatedModal>
    );
};
