"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getPublicWsUrl } from '@/lib/public-origin';
import { getToken, getRefreshToken, AUTH_TOKEN_CHANGED_EVENT } from '@/lib/auth-storage';
import { tryRefreshAccessToken } from '@/lib/api';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    connect: () => void;
    disconnect: () => void;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
    connect: () => { },
    disconnect: () => { },
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const socketRef = useRef<Socket | null>(null);
    const authRecoveryRef = useRef(false);
    const connectInnerRef = useRef<() => void>(() => {});
    /** Ref o‘rniga state: Provider har renderda yangi socket referensini beradi (useSocket() doim yangilanadi). */
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.removeAllListeners();
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        setSocket(null);
        setIsConnected(false);
    }, []);

    const connectInner = useCallback(() => {
        const token = typeof window !== 'undefined' ? getToken() : null;
        if (!token) {
            disconnect();
            return;
        }

        if (socketRef.current?.connected) return;

        if (socketRef.current) {
            socketRef.current.removeAllListeners();
            socketRef.current.disconnect();
            socketRef.current = null;
            setSocket(null);
        }

        const socketURL = getPublicWsUrl();

        const socketInstance = io(socketURL, {
            /** Faqat `websocket` ba’zi proxy / CDN da ulanishni sindiradi; server `polling` ni ham qo‘llab-quvvatlaydi */
            transports: ['polling', 'websocket'],
            autoConnect: true,
            auth: { token },
            reconnection: true,
            reconnectionDelay: 1000,
            timeout: 20000,
        });

        socketRef.current = socketInstance;
        setSocket(socketInstance);

        socketInstance.on('connect', () => {
            setIsConnected(true);
        });

        /** Faqat tarmoq uzilgandan keyin qayta ulanishda — birinchi `connect` da emas (ChatWindow ikki marta fetch qilmasin). */
        socketInstance.on('reconnect', () => {
            window.dispatchEvent(new CustomEvent('socket_reconnected'));
        });

        socketInstance.on('disconnect', () => {
            setIsConnected(false);
        });

        socketInstance.on('connect_error', async (err) => {
            setIsConnected(false);
            const msg = String(err?.message || '');
            const looksAuth =
                /invalid token|authentication error|token required|jwt expired|expired/i.test(msg);
            if (looksAuth && getRefreshToken() && !authRecoveryRef.current) {
                authRecoveryRef.current = true;
                try {
                    const ok = await tryRefreshAccessToken();
                    /** `setAuth` → `AUTH_TOKEN_CHANGED_EVENT` → `forceReconnect` (ikkilanmaslik uchun shu yerda qayta chaqirmaymiz) */
                    if (ok) {
                        return;
                    }
                } finally {
                    authRecoveryRef.current = false;
                }
            }
            console.error('[SocketContext] Connection error:', err.message);
        });
    }, [disconnect]);

    connectInnerRef.current = connectInner;

    /** Yangi token bilan qayta ulanish (oldingi socket to‘liq yopiladi). */
    const forceReconnect = useCallback(() => {
        disconnect();
        queueMicrotask(() => {
            const token = typeof window !== 'undefined' ? getToken() : null;
            if (!token) return;
            connectInnerRef.current();
        });
    }, [disconnect]);

    const connect = useCallback(() => {
        connectInner();
    }, [connectInner]);

    useEffect(() => {
        connectInner();

        const onStorageChange = (e: StorageEvent) => {
            if (e.key === 'token') {
                forceReconnect();
            }
        };

        const onTokenChanged = () => forceReconnect();

        window.addEventListener('storage', onStorageChange);
        window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onTokenChanged);

        const interval = setInterval(() => {
            if (!socketRef.current?.connected && getToken()) {
                connectInnerRef.current();
            }
        }, 15000);

        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', onStorageChange);
            window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onTokenChanged);
            disconnect();
        };
    }, [connectInner, disconnect, forceReconnect]);

    return (
        <SocketContext.Provider value={{ socket, isConnected, connect, disconnect }}>
            {children}
        </SocketContext.Provider>
    );
};


