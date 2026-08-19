/**
 * Global call state — Telegram-style singleton.
 * Socket listeners are registered once at app level (SocketContext),
 * so incoming calls are received regardless of which chat is open.
 */

export type CallState = {
    status: 'idle' | 'ringing_in' | 'ringing_out' | 'active';
    callType: 'audio' | 'video';
    peerId: string | null;
    peerName: string | null;
    chatId: string | null;
    callId: string | null;
    signal: any;
    timer: number;
    isMuted: boolean;
    isSpeaker: boolean;
};

type Listener = () => void;

const listeners = new Set<Listener>();
let state: CallState = {
    status: 'idle',
    callType: 'audio',
    peerId: null,
    peerName: null,
    chatId: null,
    callId: null,
    signal: null,
    timer: 0,
    isMuted: false,
    isSpeaker: false,
};

let timerInterval: ReturnType<typeof setInterval> | null = null;
let stopIncomingTone: (() => void) | null = null;
let stopOutgoingTone: (() => void) | null = null;

function notify() {
    listeners.forEach((l) => l());
}

export function getCallState(): CallState {
    return state;
}

export function subscribeCallState(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function startTimer() {
    stopTimer();
    state = { ...state, timer: 0 };
    timerInterval = setInterval(() => {
        state = { ...state, timer: state.timer + 1 };
        notify();
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function stopTones() {
    stopIncomingTone?.();
    stopIncomingTone = null;
    stopOutgoingTone?.();
    stopOutgoingTone = null;
}

export function callReset() {
    stopTimer();
    stopTones();
    state = {
        status: 'idle',
        callType: 'audio',
        peerId: null,
        peerName: null,
        chatId: null,
        callId: null,
        signal: null,
        timer: 0,
        isMuted: false,
        isSpeaker: false,
    };
    notify();
}

/** Called when we receive `incoming_call` from socket */
export async function handleIncomingCall(data: {
    from: string;
    fromName?: string;
    name?: string;
    signal: any;
    callType: 'audio' | 'video';
    chatId?: string;
    callId?: string;
}) {
    if (state.status !== 'idle') return;
    state = {
        ...state,
        status: 'ringing_in',
        peerId: String(data.from),
        peerName: data.fromName || data.name || 'Unknown',
        chatId: data.chatId ? String(data.chatId) : null,
        callId: data.callId ? String(data.callId) : null,
        callType: data.callType || 'audio',
        signal: data.signal,
    };
    notify();
    try {
        const { playIncomingRing } = await import('@/lib/call-tones');
        stopIncomingTone = playIncomingRing();
    } catch (_) {}
}

/** Called when we receive `call_accepted` from socket */
export function handleCallAccepted(data: { signal: any }) {
    if (state.status !== 'ringing_out') return;
    stopTones();
    state = { ...state, status: 'active', signal: data.signal };
    startTimer();
    notify();
}

/** Called when we receive `call_rejected` from socket */
export function handleCallRejected() {
    stopTones();
    callReset();
}

/** Called when we receive `call_ended` from socket */
export function handleCallEnded() {
    stopTones();
    callReset();
}

/** Called when user initiates an outgoing call */
export async function startOutgoingCall(peerId: string, peerName: string, chatId: string, callType: 'audio' | 'video') {
    if (state.status !== 'idle') return;
    state = {
        ...state,
        status: 'ringing_out',
        peerId,
        peerName,
        chatId,
        callType,
    };
    notify();
    try {
        const { playOutgoingTone } = await import('@/lib/call-tones');
        stopOutgoingTone = playOutgoingTone();
    } catch (_) {}
}

export function toggleMute() {
    state = { ...state, isMuted: !state.isMuted };
    notify();
}

export function toggleSpeaker() {
    state = { ...state, isSpeaker: !state.isSpeaker };
    notify();
}
