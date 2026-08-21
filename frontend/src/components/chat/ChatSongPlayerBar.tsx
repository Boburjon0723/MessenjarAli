'use client';

import React, { useCallback, useRef, useSyncExternalStore } from 'react';
import { songPlayer } from '@/lib/song-player-store';
import { downloadChatFile } from '@/lib/download-file';

function fmt(sec: number) {
    if (!sec || !Number.isFinite(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const iconBtn = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#6ab3f3] hover:bg-white/[0.06]';
const utilBtn = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#aaaaaa] hover:bg-white/[0.06] hover:text-white';

/** Telegram Web `.pinned-audio`: chat ustuni tepasidagi floating plate. */
export default function ChatSongPlayerBar() {
    const s = useSyncExternalStore(songPlayer.subscribe, songPlayer.getSnapshot, songPlayer.getSnapshot);
    const seekingRef = useRef(false);

    const seekFromClientX = useCallback(
        (clientX: number, el: HTMLElement) => {
            const rect = el.getBoundingClientRect();
            const p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            songPlayer.seek(p * (s.duration || 0));
        },
        [s.duration]
    );

    const jumpToTrackMessage = useCallback(() => {
        const t = s.track;
        if (!t?.id) return;
        if (t.chatId) {
            window.dispatchEvent(
                new CustomEvent('panel_open_chat', { detail: { chatId: String(t.chatId) } })
            );
        }
        window.setTimeout(() => {
            window.dispatchEvent(
                new CustomEvent('panel_jump_message', {
                    detail: { chatId: t.chatId ? String(t.chatId) : undefined, messageId: String(t.id) },
                })
            );
        }, t.chatId ? 120 : 0);
    }, [s.track]);

    if (!s.track) return null;

    const progress = s.duration ? (s.currentTime / s.duration) * 100 : 0;
    const repeatTitle =
        s.repeat === 'off' ? 'Repeat off' : s.repeat === 'all' ? 'Repeat all' : 'Repeat one';

    return (
        <div className="relative z-[25] w-full overflow-hidden rounded-xl bg-[#212121]/95 shadow-[0_1px_8px_rgba(0,0,0,0.35)] backdrop-blur-md ring-1 ring-white/[0.06]">
            <div className="flex h-12 items-center gap-0.5 px-1.5 sm:px-2">
                <button type="button" className={iconBtn} onClick={() => songPlayer.prev()} aria-label="Previous" title="Previous">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" /></svg>
                </button>
                <button type="button" className={iconBtn} onClick={() => songPlayer.toggle()} aria-label={s.playing ? 'Pause' : 'Play'}>
                    {s.playing ? (
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" /></svg>
                    ) : (
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    )}
                </button>
                <button type="button" className={iconBtn} onClick={() => songPlayer.next()} aria-label="Next" title="Next">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M16 18h2V6h-2v12zM6 18l8.5-6L6 6v12z" /></svg>
                </button>

                <button
                    type="button"
                    onClick={jumpToTrackMessage}
                    className="min-w-0 flex-1 px-1.5 text-left rounded-md hover:bg-white/[0.04] transition-colors"
                    title="Xabarga o‘tish"
                >
                    <p className="truncate text-[14px] leading-5 text-white">{s.track.title}</p>
                </button>

                <span className="hidden sm:block shrink-0 text-[12px] tabular-nums text-[#aaaaaa] px-1">
                    {fmt(s.currentTime)}
                    {s.duration > 0 ? ` / ${fmt(s.duration)}` : ''}
                </span>

                <div className="relative group/vol shrink-0">
                    <button type="button" className={utilBtn} onClick={() => songPlayer.toggleMute()} title="Volume">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                            {s.muted || s.volume === 0
                                ? <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                                : <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />}
                        </svg>
                    </button>
                    <div className="pointer-events-none absolute left-1/2 top-full z-50 hidden -translate-x-1/2 pt-1 group-hover/vol:block">
                        <div className="pointer-events-auto rounded-lg bg-[#2b2b2b] px-2 py-3 shadow-lg">
                            <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.01}
                                value={s.muted ? 0 : s.volume}
                                onChange={(e) => songPlayer.setVolume(Number(e.target.value))}
                                className="h-24 w-6 cursor-pointer appearance-none bg-transparent [writing-mode:vertical-lr] direction-rtl"
                                aria-label="Volume"
                            />
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    className={`${utilBtn} ${s.shuffle ? 'text-[#6ab3f3]' : ''}`}
                    onClick={() => songPlayer.toggleShuffle()}
                    title={s.shuffle ? 'Shuffle on' : 'Shuffle off'}
                >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" /></svg>
                </button>
                <button
                    type="button"
                    className={`relative ${utilBtn} ${s.repeat !== 'off' ? 'text-[#6ab3f3]' : ''}`}
                    onClick={() => songPlayer.cycleRepeat()}
                    title={repeatTitle}
                >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" /></svg>
                    {s.repeat === 'one' ? <span className="absolute bottom-1 right-1 text-[8px] font-bold leading-none">1</span> : null}
                </button>
                <button type="button" className={utilBtn} onClick={() => songPlayer.cycleRate()} title="Speed">
                    <span className="text-[11px] font-semibold">{s.rate === 1 ? '1X' : `${s.rate}X`}</span>
                </button>
                <button
                    type="button"
                    className={utilBtn}
                    title="Save"
                    onClick={() => {
                        const name = s.track?.filename || `${s.track?.title || 'audio'}.mp3`;
                        if (s.track?.url) void downloadChatFile(s.track.url, name);
                    }}
                    aria-label="Save"
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                </button>
                <button type="button" className={utilBtn} onClick={() => songPlayer.close()} aria-label="Close" title="Close">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
            </div>
            <div
                role="slider"
                aria-valuemin={0}
                aria-valuemax={Math.floor(s.duration || 0)}
                aria-valuenow={Math.floor(s.currentTime || 0)}
                aria-label="Seek"
                tabIndex={0}
                className="absolute left-0 right-0 bottom-0 h-2 cursor-pointer touch-none"
                onPointerDown={(e) => {
                    seekingRef.current = true;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    seekFromClientX(e.clientX, e.currentTarget);
                }}
                onPointerMove={(e) => {
                    if (!seekingRef.current) return;
                    seekFromClientX(e.clientX, e.currentTarget);
                }}
                onPointerUp={(e) => {
                    seekingRef.current = false;
                    try {
                        e.currentTarget.releasePointerCapture(e.pointerId);
                    } catch {
                        /* ignore */
                    }
                }}
                onPointerCancel={() => {
                    seekingRef.current = false;
                }}
            >
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[3px] bg-white/15">
                    <div className="h-full bg-[#6ab3f3]" style={{ width: `${progress}%` }} />
                </div>
            </div>
        </div>
    );
}
