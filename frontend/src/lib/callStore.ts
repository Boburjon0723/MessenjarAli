/**
 * Global call state — Telegram-style singleton.
 * Socket listeners are registered once at app level (SocketContext),
 * so incoming calls are received regardless of which chat is open.
 * Multi-tab: BroadcastChannel syncs call state across tabs.
 */

const bc = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('expertline_call')
    : null;

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

export function callReset(broadcast = true) {
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
    if (broadcast) bc?.postMessage({ type: 'reset' });
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
}, fromBroadcast = false) {
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
    if (!fromBroadcast) {
        bc?.postMessage({ type: 'incoming', data });
    }
    try {
        const { playIncomingRing } = await import('@/lib/call-tones');
        stopIncomingTone = playIncomingRing();
    } catch (_) {}
}

/** Called when we receive `call_accepted` from socket */
export function handleCallAccepted(data: { signal: any }, fromBroadcast = false) {
    if (state.status !== 'ringing_out') return;
    stopTones();
    state = { ...state, status: 'active', signal: data.signal };
    startTimer();
    notify();
    if (!fromBroadcast) bc?.postMessage({ type: 'accepted', data });
}

/** Called when we receive `call_rejected` from socket */
export function handleCallRejected(fromBroadcast = false) {
    stopTones();
    callReset(false);
    if (!fromBroadcast) bc?.postMessage({ type: 'rejected' });
}

/** Called when we receive `call_ended` from socket */
export function handleCallEnded(fromBroadcast = false) {
    stopTones();
    callReset(false);
    if (!fromBroadcast) bc?.postMessage({ type: 'ended' });
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
    bc?.postMessage({ type: 'outgoing', data: { peerId, peerName, chatId, callType } });
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

// ── Multi-tab sync via BroadcastChannel ──
bc?.addEventListener('message', (e) => {
    const msg = e.data;
    if (!msg?.type) return;
    switch (msg.type) {
        case 'incoming':
            handleIncomingCall(msg.data, true);
            break;
        case 'accepted':
            handleCallAccepted(msg.data, true);
            break;
        case 'rejected':
            handleCallRejected(true);
            break;
        case 'ended':
            handleCallEnded(true);
            break;
        case 'reset':
            callReset(false);
            break;
        case 'outgoing':
            if (state.status === 'idle') {
                state = { ...state, ...msg.data, status: 'ringing_out' };
                notify();
            }
            break;
    }
});
