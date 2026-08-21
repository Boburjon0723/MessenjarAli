export type SongTrack = {
    id: string;
    url: string;
    title: string;
    filename?: string;
    /** Jump-to-message uchun */
    chatId?: string;
};

export type SongPlayerState = {
    track: SongTrack | null;
    playlist: SongTrack[];
    playing: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    muted: boolean;
    rate: number;
    shuffle: boolean;
    /** Telegram: off → all (round) → one (loop) */
    repeat: 'off' | 'one' | 'all';
};

const listeners = new Set<() => void>();

let audio: HTMLAudioElement | null = null;

let state: SongPlayerState = {
    track: null,
    playlist: [],
    playing: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    muted: false,
    rate: 1,
    shuffle: false,
    repeat: 'off',
};

function emit() {
    listeners.forEach((fn) => fn());
}

function syncMediaSession() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const t = state.track;
    try {
        if (!t) {
            navigator.mediaSession.metadata = null;
            return;
        }
        navigator.mediaSession.metadata = new MediaMetadata({
            title: t.title || 'Audio',
            artist: 'ExpertLine',
        });
        navigator.mediaSession.playbackState = state.playing ? 'playing' : 'paused';
    } catch {
        /* ignore */
    }
}

function getAudio(): HTMLAudioElement {
    if (!audio && typeof Audio !== 'undefined') {
        audio = new Audio();
        audio.preload = 'metadata';
        audio.addEventListener('timeupdate', () => {
            state = { ...state, currentTime: audio?.currentTime || 0, duration: audio?.duration || state.duration };
            emit();
        });
        audio.addEventListener('loadedmetadata', () => {
            state = { ...state, duration: audio?.duration || 0 };
            emit();
        });
        audio.addEventListener('durationchange', () => {
            state = { ...state, duration: audio?.duration || 0 };
            emit();
        });
        audio.addEventListener('play', () => {
            state = { ...state, playing: true };
            syncMediaSession();
            emit();
        });
        audio.addEventListener('pause', () => {
            state = { ...state, playing: false };
            syncMediaSession();
            emit();
        });
        audio.addEventListener('ended', () => {
            if (state.repeat === 'one' && state.track) {
                audio!.currentTime = 0;
                void audio!.play().catch(() => undefined);
                return;
            }
            nextTrack();
        });
        audio.addEventListener('error', () => {
            // Buzilgan trekdа keyingisiga o‘tish
            if (state.playlist.length > 1) nextTrack();
            else {
                state = { ...state, playing: false };
                emit();
            }
        });

        if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
            try {
                navigator.mediaSession.setActionHandler('play', () => void getAudio().play());
                navigator.mediaSession.setActionHandler('pause', () => getAudio().pause());
                navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
                navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
                navigator.mediaSession.setActionHandler('seekto', (details) => {
                    if (typeof details.seekTime === 'number') songPlayer.seek(details.seekTime);
                });
            } catch {
                /* ignore */
            }
        }
    }
    if (!audio) throw new Error('Audio unavailable');
    return audio;
}

function playIndex(i: number) {
    const list = state.playlist;
    if (!list.length) return;
    const idx = ((i % list.length) + list.length) % list.length;
    const track = list[idx];
    const el = getAudio();
    if (state.track?.url !== track.url || state.track?.id !== track.id) {
        el.src = track.url;
    }
    el.playbackRate = state.rate;
    el.volume = state.muted ? 0 : state.volume;
    state = { ...state, track, currentTime: 0, duration: Number.isFinite(el.duration) ? el.duration : 0 };
    syncMediaSession();
    emit();
    void el.play().catch(() => {
        state = { ...state, playing: false };
        emit();
    });
}

export function nextTrack() {
    const list = state.playlist;
    if (!list.length) {
        try {
            getAudio().pause();
        } catch {
            /* ignore */
        }
        return;
    }
    const cur = list.findIndex((t) => t.id === state.track?.id);
    if (state.shuffle && list.length > 1) {
        let n = Math.floor(Math.random() * list.length);
        if (n === cur) n = (n + 1) % list.length;
        playIndex(n);
        return;
    }
    if (cur < list.length - 1) playIndex(cur + 1);
    else if (state.repeat === 'all') playIndex(0);
    else {
        try {
            getAudio().pause();
        } catch {
            /* ignore */
        }
        state = { ...state, playing: false };
        emit();
    }
}

export function prevTrack() {
    const el = getAudio();
    // Telegram: >5s → boshiga qaytarish
    if (el.currentTime > 5) {
        el.currentTime = 0;
        state = { ...state, currentTime: 0 };
        emit();
        return;
    }
    const list = state.playlist;
    if (!list.length) return;
    const cur = list.findIndex((t) => t.id === state.track?.id);
    if (state.shuffle && list.length > 1) {
        let n = Math.floor(Math.random() * list.length);
        if (n === cur) n = (n - 1 + list.length) % list.length;
        playIndex(n);
        return;
    }
    if (cur > 0) playIndex(cur - 1);
    else if (state.repeat === 'all') playIndex(list.length - 1);
    else playIndex(0);
}

export const songPlayer = {
    subscribe(fn: () => void) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    },
    getSnapshot(): SongPlayerState {
        return state;
    },
    play(track: SongTrack, playlist?: SongTrack[]) {
        const list =
            playlist && playlist.length
                ? playlist
                : state.playlist.some((t) => t.id === track.id)
                  ? state.playlist
                  : [...state.playlist.filter((t) => t.id !== track.id), track];
        state = { ...state, playlist: list };
        if (state.track?.id === track.id) {
            const el = getAudio();
            if (state.playing) el.pause();
            else void el.play().catch(() => undefined);
            return;
        }
        const idx = list.findIndex((t) => t.id === track.id);
        playIndex(idx >= 0 ? idx : 0);
    },
    toggle() {
        const el = getAudio();
        if (!state.track) return;
        if (state.playing) el.pause();
        else void el.play().catch(() => undefined);
    },
    pause() {
        try {
            getAudio().pause();
        } catch {
            /* ignore */
        }
    },
    next: nextTrack,
    prev: prevTrack,
    seek(t: number) {
        const el = getAudio();
        const max = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : t;
        el.currentTime = Math.max(0, Math.min(t, max));
        state = { ...state, currentTime: el.currentTime };
        emit();
    },
    setVolume(v: number) {
        const el = getAudio();
        const volume = Math.max(0, Math.min(1, v));
        el.volume = state.muted ? 0 : volume;
        state = { ...state, volume, muted: volume === 0 ? state.muted : false };
        emit();
    },
    toggleMute() {
        const el = getAudio();
        const muted = !state.muted;
        el.volume = muted ? 0 : state.volume;
        state = { ...state, muted };
        emit();
    },
    cycleRate() {
        const rates = [1, 1.5, 2, 0.5];
        const i = rates.indexOf(state.rate);
        const rate = rates[(i + 1) % rates.length];
        getAudio().playbackRate = rate;
        state = { ...state, rate };
        emit();
    },
    toggleShuffle() {
        state = { ...state, shuffle: !state.shuffle };
        emit();
    },
    cycleRepeat() {
        const next = state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off';
        state = { ...state, repeat: next };
        emit();
    },
    /** Telegram close: stop + hide bar */
    close() {
        try {
            const el = getAudio();
            el.pause();
            el.removeAttribute('src');
            el.load();
        } catch {
            /* ignore */
        }
        state = {
            ...state,
            track: null,
            playing: false,
            currentTime: 0,
            duration: 0,
        };
        syncMediaSession();
        emit();
    },
};
