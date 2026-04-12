"use client";

import React from "react";
import { Bell, Check, Trash2, X } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";

interface NotificationPopoverProps {
    onClose: () => void;
}

const NotificationPopover: React.FC<NotificationPopoverProps> = ({ onClose }) => {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

    return (
        <div className="absolute right-4 top-16 w-[360px] max-h-[600px] glass-premium bg-white/10 backdrop-blur-[40px] border border-white/20 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col z-[1000] overflow-hidden animate-slide-popover-right">
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-xl">
                        <Bell className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-base">Bildirishnomalar</h3>
                        <p className="text-[11px] text-white/40 font-medium">{unreadCount} ta o'qilmagan</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                    <X className="w-4 h-4 text-white/50" />
                </button>
            </div>

            {/* Actions */}
            {notifications.length > 0 && (
                <div className="px-4 py-2 border-b border-white/10 flex justify-end">
                    <button
                        onClick={markAllAsRead}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                    >
                        <Check className="w-3 h-3" /> Hammasini o'qilgan deb belgilash
                    </button>
                </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/5">
                {notifications.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                            <Bell className="w-8 h-8 text-white/10" />
                        </div>
                        <p className="text-white/40 text-sm font-medium">Hozircha bildirishnomalar yo'q</p>
                    </div>
                ) : (
                    notifications.map((notification, index) => (
                        <div
                            key={notification.id}
                            style={{ animationDelay: `${index * 50}ms` }}
                            className={`p-5 border-b border-white/5 hover:bg-white/10 transition-all cursor-pointer relative group animate-slide-popover-right ${!notification.is_read ? 'bg-blue-500/5' : ''}`}
                            onClick={() => !notification.is_read && markAsRead(notification.id)}
                        >
                            {!notification.is_read && (
                                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />
                            )}
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] uppercase tracking-widest font-black px-2 py-0.5 rounded-md bg-white/5 ${notification.type === 'payment_received' ? 'text-green-400' :
                                    notification.type === 'session_request' ? 'text-blue-400' :
                                        'text-white/30'
                                    }`}>
                                    {notification.type.replace('_', ' ')}
                                </span>
                                <span className="text-[10px] text-white/30 font-medium">
                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                </span>
                            </div>
                            <h4 className="text-sm font-bold text-white mb-1.5 group-hover:text-blue-400 transition-colors">{notification.title}</h4>
                            <p className="text-xs text-white/60 leading-relaxed font-medium mb-3">{notification.message}</p>

                            {/* Render actionable button if notification contains a URL */}
                            {notification.data?.url && (
                                <a
                                    href={notification.data.url}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex w-full mt-2 items-center justify-center py-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black tracking-wide uppercase rounded-xl shadow-lg shadow-blue-500/20 transition-all"
                                >
                                    Darsga Qo'shilish
                                </a>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-white/10 bg-white/5 text-center">
                <button className="text-xs text-white/40 hover:text-white transition-colors">
                    Barcha bildirishnomalarni ko'rish
                </button>
            </div>
        </div>
    );
};

export default NotificationPopover;
