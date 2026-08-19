"use client";

import React, { useEffect, useState } from 'react';
import {
    LiveKitRoom,
    VideoConference,
    RoomAudioRenderer,
    useLocalParticipant,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { apiFetch } from '@/lib/api';

interface LiveKitRoomWrapperProps {
    sessionId: string;
    onDisconnected: () => void;
    /** Ovozli chaqiruv: faqat audio, video yo'q */
    audioOnly?: boolean;
    /** Global call overlay mute holati */
    muted?: boolean;
}

function MicSync({ muted }: { muted?: boolean }) {
    const { localParticipant } = useLocalParticipant();
    useEffect(() => {
        if (!localParticipant || muted == null) return;
        void localParticipant.setMicrophoneEnabled(!muted);
    }, [localParticipant, muted]);
    return null;
}

export default function LiveKitRoomWrapper({ sessionId, onDisconnected, audioOnly = false, muted }: LiveKitRoomWrapperProps) {
    const [token, setToken] = useState("");
    const [wsUrl, setWsUrl] = useState("");

    useEffect(() => {
        const fetchToken = async () => {
            try {
                const response = await apiFetch(`/api/livekit/token?room=${sessionId}`);
                if (!response.ok) {
                    console.error("Failed to fetch LiveKit token");
                    return;
                }
                const data = await response.json();
                setToken(data.token);
                setWsUrl(data.wsUrl);
            } catch (e) {
                console.error("Error getting LiveKit token:", e);
            }
        };
        fetchToken();
    }, [sessionId]);

    if (token === "") {
        return <div className="text-white flex items-center justify-center w-full h-full">Ulanish kutilmoqda... (LiveKit)</div>;
    }

    return (
        <LiveKitRoom
            video={!audioOnly}
            audio={true}
            token={token}
            serverUrl={wsUrl}
            data-lk-theme="default"
            style={
                audioOnly ?
                    { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }
                :   { height: '100%', width: '100%', backgroundColor: 'transparent' }
            }
            onDisconnected={onDisconnected}
        >
            <MicSync muted={muted} />
            {audioOnly ?
                <RoomAudioRenderer />
            :   <>
                    <VideoConference />
                    <RoomAudioRenderer />
                </>
            }
        </LiveKitRoom>
    );
}


