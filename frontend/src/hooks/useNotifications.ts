"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { apiFetch } from '../lib/api';
import { alertIncomingChatMessage } from '@/lib/message-alert';

export interface Notification {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    data: any;
    is_read: boolean;
    created_at: string;
}

export const useNotifications = () => {
    const { socket } = useSocket();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await apiFetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
                setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    useEffect(() => {
        if (!socket) return;

        const handleNewNotification = (notification: Notification) => {
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);

            alertIncomingChatMessage({
                title: notification.title,
                body: notification.message,
                tag: `app-notif-${notification.id}`,
            });
        };

        socket.on('new_notification', handleNewNotification);

        return () => {
            socket.off('new_notification', handleNewNotification);
        };
    }, [socket]);

    const markAsRead = async (id: string) => {
        try {
            const res = await apiFetch(`/api/notifications/${id}/read`, { method: 'POST' });
            if (res.ok) {
                setNotifications(prev =>
                    prev.map(n => n.id === id ? { ...n, is_read: true } : n)
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const res = await apiFetch('/api/notifications/read-all', { method: 'POST' });
            if (res.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                setUnreadCount(0);
            }
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    return {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        refresh: fetchNotifications
    };
};


