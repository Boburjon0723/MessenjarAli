"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getPublicWsUrl } from '@/lib/public-origin';
import { getToken } from '@/lib/auth-storage';

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

    const connect = useCallback(() => {
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
        console.log(`[SocketContext] Connecting to ${socketURL}...`);

        const socketInstance = io(socketURL, {
            transports: ['websocket'],
            autoConnect: true,
            auth: { token },
            reconnection: true,
            reconnectionDelay: 1000,
            timeout: 20000,
        });

        socketRef.current = socketInstance;
        setSocket(socketInstance);

        socketInstance.on('connect', () => {
            console.log('[SocketContext] Connected:', socketInstance.id);
            setIsConnected(true);
            window.dispatchEvent(new CustomEvent('socket_reconnected'));
        });

        socketInstance.on('disconnect', (reason) => {
            console.log('[SocketContext] Disconnected:', reason);
            setIsConnected(false);
        });

        socketInstance.on('connect_error', (err) => {
            console.error('[SocketContext] Connection error:', err.message);
            setIsConnected(false);
        });
    }, [disconnect]);

    useEffect(() => {
        connect();

        const onStorageChange = (e: StorageEvent) => {
            if (e.key === 'token') {
                console.log('[SocketContext] Token changed, reconnecting...');
                connect();
            }
        };

        window.addEventListener('storage', onStorageChange);

        const interval = setInterval(() => {
            if (!socketRef.current?.connected && getToken()) {
                connect();
            }
        }, 15000);

        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', onStorageChange);
            disconnect();
        };
    }, [connect, disconnect]);

    return (
        <SocketContext.Provider value={{ socket, isConnected, connect, disconnect }}>
            {children}
        </SocketContext.Provider>
    );
};

