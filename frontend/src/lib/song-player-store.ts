export type SongTrack = {
    id: string;
    url: string;
    title: string;
    filename?: string;
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

function getAudio(): HTMLAudioElement {
    if (!audio && typeof Audio !== 'undefined') {
        audio = new Audio();
        audio.preload = 'metadata';
        audio.addEventListener('timeupdate', () => {
            state = { ...state, currentTime: audio?.currentTime || 0, duration: audio?.duration || 0 };
            emit();
        });
        audio.addEventListener('loadedmetadata', () => {
            state = { ...state, duration: audio?.duration || 0 };
            emit();
        });
        audio.addEventListener('play', () => {
            state = { ...state, playing: true };
            emit();
        });
        audio.addEventListener('pause', () => {
            state = { ...state, playing: false };
            emit();
        });
        audio.addEventListener('ended', () => {
            if (state.repeat === 'one' && state.track) {
                audio!.currentTime = 0;
                void audio!.play();
                return;
            }
            nextTrack();
        });
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
    if (state.track?.url !== track.url) {
        el.src = track.url;
    }
    el.playbackRate = state.rate;
    el.volume = state.muted ? 0 : state.volume;
    state = { ...state, track, currentTime: 0 };
    emit();
    void el.play();
}

export function nextTrack() {
    const list = state.playlist;
    if (!list.length) {
        getAudio().pause();
        return;
    }
    const cur = list.findIndex((t) => t.id === state.track?.id);
    if (state.shuffle) {
        playIndex(Math.floor(Math.random() * list.length));
        return;
    }
    if (cur < list.length - 1) playIndex(cur + 1);
    else if (state.repeat === 'all') playIndex(0);
    else {
        getAudio().pause();
        state = { ...state, playing: false };
        emit();
    }
}

export function prevTrack() {
    const el = getAudio();
    if (el.currentTime > 3) {
        el.currentTime = 0;
        return;
    }
    const list = state.playlist;
    const cur = list.findIndex((t) => t.id === state.track?.id);
    if (cur > 0) playIndex(cur - 1);
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
        const list = playlist && playlist.length ? playlist : (state.playlist.some((t) => t.id === track.id) ? state.playlist : [...state.playlist.filter((t) => t.id !== track.id), track]);
        state = { ...state, playlist: list };
        if (state.track?.id === track.id) {
            const el = getAudio();
            if (state.playing) el.pause();
            else void el.play();
            return;
        }
        const idx = list.findIndex((t) => t.id === track.id);
        playIndex(idx >= 0 ? idx : 0);
    },
    toggle() {
        const el = getAudio();
        if (!state.track) return;
        if (state.playing) el.pause();
        else void el.play();
    },
    pause() {
        try {
            getAudio().pause();
        } catch { /* ignore */ }
    },
    next: nextTrack,
    prev: prevTrack,
    seek(t: number) {
        const el = getAudio();
        el.currentTime = Math.max(0, Math.min(t, el.duration || t));
        state = { ...state, currentTime: el.currentTime };
        emit();
    },
    setVolume(v: number) {
        const el = getAudio();
        const volume = Math.max(0, Math.min(1, v));
        el.volume = state.muted ? 0 : volume;
        state = { ...state, volume };
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
    close() {
        try {
            getAudio().pause();
        } catch { /* ignore */ }
        state = { ...state, track: null, playing: false, currentTime: 0 };
        emit();
    },
};
