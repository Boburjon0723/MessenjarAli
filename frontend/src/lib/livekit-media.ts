import {
    AudioPresets,
    type AudioCaptureOptions,
    type RoomOptions,
    type TrackPublishOptions,
} from 'livekit-client';

/**
 * Call / panel mikrofon: echo + shovqin bostirish + AGC + (Chrome) voiceIsolation.
 * Mono 48 kHz — nutq uchun barqarorroq.
 */
export const LIVEKIT_AUDIO_CAPTURE: AudioCaptureOptions = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    voiceIsolation: true,
    channelCount: 1,
    sampleRate: 48000,
};

/** Publish: nutq sifatini yuqoriroq bitrate + DTX/RED */
export const LIVEKIT_AUDIO_PUBLISH: TrackPublishOptions = {
    audioPreset: AudioPresets.musicHighQuality,
    dtx: true,
    red: true,
};

/** Faqat ovozli call — biroz pastroq bitrate, nutqga mos */
export const LIVEKIT_AUDIO_PUBLISH_SPEECH: TrackPublishOptions = {
    audioPreset: AudioPresets.speech,
    dtx: true,
    red: true,
};

export function liveKitRoomOptions(kind: 'call' | 'panel' | 'speech' = 'panel'): RoomOptions {
    const publish =
        kind === 'speech' ? LIVEKIT_AUDIO_PUBLISH_SPEECH : LIVEKIT_AUDIO_PUBLISH;
    return {
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: { ...LIVEKIT_AUDIO_CAPTURE },
        publishDefaults: { ...publish },
    };
}

/** getUserMedia (yozuv / legacy) — LiveKit capture bilan bir xil */
export const MEDIA_RECORDER_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
    sampleRate: 48000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
};
