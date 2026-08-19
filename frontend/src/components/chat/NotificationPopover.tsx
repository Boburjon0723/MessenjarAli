"use client";

import React from "react";
import { Bell, Check, X } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useLanguage } from "@/context/LanguageContext";
import { formatDistanceToNow } from "date-fns";
import { getNotificationChatId, notificationTypeLabelKey } from "@/lib/notification-nav";

interface NotificationPopoverProps {
    onClose: () => void;
    onOpenChat?: (chatId: string) => void;
}

const NotificationPopover: React.FC<NotificationPopoverProps> = ({ onClose, onOpenChat }) => {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const { t } = useLanguage();

    const handleNotificationClick = (notification: (typeof notifications)[0]) => {
        const chatId = getNotificationChatId(notification.data);
        if (!notification.is_read) void markAsRead(notification.id);
        if (chatId && onOpenChat) {
            onOpenChat(chatId);
            onClose();
        }
    };

    return (
        <div className="absolute right-4 top-16 w-[360px] max-h-[600px] glass-premium bg-white/10 backdrop-blur-[40px] border border-white/20 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col z-[1000] overflow-hidden animate-slide-popover-right">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-xl">
                        <Bell className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-base">{t('notifications_title' as any) || 'Bildirishnomalar'}</h3>
                        <p className="text-[11px] text-white/40 font-medium">
                            {unreadCount} {t('unread_count_suffix' as any) || "ta o'qilmagan"}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                    <X className="w-4 h-4 text-white/50" />
                </button>
            </div>

            {notifications.length > 0 && (
                <div className="px-4 py-2 border-b border-white/10 flex justify-end">
                    <button
                        onClick={markAllAsRead}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                    >
                        <Check className="w-3 h-3" /> {t('mark_all_read' as any) || "Hammasini o'qilgan deb belgilash"}
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/5">
                {notifications.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                            <Bell className="w-8 h-8 text-white/10" />
                        </div>
                        <p className="text-white/40 text-sm font-medium">{t('no_notifications' as any) || "Hozircha bildirishnomalar yo'q"}</p>
                    </div>
                ) : (
                    notifications.map((notification, index) => {
                        const chatId = getNotificationChatId(notification.data);
                        const typeLabel = t(notificationTypeLabelKey(notification.type) as any);
                        const typeColor =
                            notification.type === 'application_rejected'
                                ? 'text-red-400'
                                : notification.type === 'new_murojaat' ||
                                    notification.type === 'new_application'
                                  ? 'text-amber-300'
                                  : notification.type === 'application_accepted' ||
                                      notification.type === 'payment_received'
                                    ? 'text-green-400'
                                    : notification.type === 'session_request'
                                      ? 'text-blue-400'
                                      : 'text-white/30';

                        return (
                            <div
                                key={notification.id}
                                style={{ animationDelay: `${index * 50}ms` }}
                                className={`p-5 border-b border-white/5 hover:bg-white/10 transition-all cursor-pointer relative group animate-slide-popover-right ${!notification.is_read ? 'bg-blue-500/5' : ''}`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                {!notification.is_read && (
                                    <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />
                                )}
                                <div className="flex justify-between items-start mb-2">
                                    <span
                                        className={`text-[10px] uppercase tracking-widest font-black px-2 py-0.5 rounded-md bg-white/5 ${typeColor}`}
                                    >
                                        {typeLabel}
                                    </span>
                                    <span className="text-[10px] text-white/30 font-medium">
                                        {formatDistanceToNow(new Date(notification.created_at), {
                                            addSuffix: true,
                                        })}
                                    </span>
                                </div>
                                <h4 className="text-sm font-bold text-white mb-1.5 group-hover:text-blue-400 transition-colors">
                                    {notification.title}
                                </h4>
                                <p className="text-xs text-white/60 leading-relaxed font-medium mb-3">
                                    {notification.message}
                                </p>

                                {notification.data?.url && (
                                    <a
                                        href={notification.data.url}
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex w-full mt-2 items-center justify-center py-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black tracking-wide uppercase rounded-xl shadow-lg shadow-blue-500/20 transition-all"
                                    >
                                        {t('joined_lesson')}
                                    </a>
                                )}
                                {!notification.data?.url && chatId && onOpenChat && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleNotificationClick(notification);
                                        }}
                                        className="flex w-full mt-2 items-center justify-center py-2 bg-[#8774e1] hover:bg-[#7665d4] text-white text-[11px] font-bold tracking-wide rounded-xl transition-all"
                                    >
                                        {t('notif_open_chat_btn')}
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default NotificationPopover;
