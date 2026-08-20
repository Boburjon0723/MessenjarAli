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
import {
    LIVEKIT_AUDIO_CAPTURE,
    LIVEKIT_AUDIO_PUBLISH,
    LIVEKIT_AUDIO_PUBLISH_SPEECH,
    liveKitRoomOptions,
} from '@/lib/livekit-media';

interface LiveKitRoomWrapperProps {
    sessionId: string;
    onDisconnected: () => void;
    /** Ovozli chaqiruv: faqat audio, video yo'q */
    audioOnly?: boolean;
    /** Global call overlay mute holati */
    muted?: boolean;
}

function MicSync({ muted, speech }: { muted?: boolean; speech?: boolean }) {
    const { localParticipant } = useLocalParticipant();
    useEffect(() => {
        if (!localParticipant || muted == null) return;
        const publish = speech ? LIVEKIT_AUDIO_PUBLISH_SPEECH : LIVEKIT_AUDIO_PUBLISH;
        void localParticipant.setMicrophoneEnabled(!muted, LIVEKIT_AUDIO_CAPTURE, publish);
    }, [localParticipant, muted, speech]);
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
            audio={LIVEKIT_AUDIO_CAPTURE}
            token={token}
            serverUrl={wsUrl}
            options={liveKitRoomOptions(audioOnly ? 'speech' : 'call')}
            data-lk-theme="default"
            style={
                audioOnly ?
                    { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }
                :   { height: '100%', width: '100%', backgroundColor: 'transparent' }
            }
            onDisconnected={onDisconnected}
        >
            <MicSync muted={muted} speech={audioOnly} />
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
