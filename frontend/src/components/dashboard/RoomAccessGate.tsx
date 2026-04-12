"use client";

import React, { useState, useEffect } from "react";
import { useNotification } from "@/context/NotificationContext";
import { apiFetch } from "@/lib/api";
import StudentDashboard from "./StudentDashboard";
import type { ExpertPanelMode } from "@/lib/expert-roles";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://backend-production-ad05.up.railway.app";
const DEFAULT_MONTHLY_MALI = 100;

export default function RoomAccessGate({
    roomId,
    user,
    sessionStyle = "mentor",
    onLeave,
}: {
    roomId: string;
    user: any;
    sessionStyle?: ExpertPanelMode;
    onLeave: () => void;
}) {
    const { showError } = useNotification();
    const [loading, setLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);
    const [mentorId, setMentorId] = useState<string | null>(null);
    const [mentorName, setMentorName] = useState<string>("");
    const [roomName, setRoomName] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [subscribing, setSubscribing] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const roomRes = await apiFetch(`/api/chats/${roomId}/room-info`);
                if (!roomRes.ok) {
                    setError("Xona topilmadi");
                    setLoading(false);
                    return;
                }
                const room = await roomRes.json();
                const creatorId = room.creator_id;
                if (!creatorId) {
                    setHasAccess(true);
                    setLoading(false);
                    return;
                }
                setMentorId(creatorId);
                setMentorName(room.creator_name || "Ustoz");
                setRoomName(room.name || "Dars");

                const subRes = await apiFetch(`/api/wallet/subscription-status?mentorId=${encodeURIComponent(creatorId)}`);
                if (cancelled) return;
                if (subRes.ok) {
                    const data = await subRes.json();
                    if (data.active) setHasAccess(true);
                }
            } catch (e) {
                if (!cancelled) setError("Ma'lumotni yuklashda xatolik");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [roomId]);

    const handleSubscribe = async () => {
        if (!mentorId) return;
        setSubscribing(true);
        try {
            const res = await apiFetch("/api/wallet/subscribe-to-mentor", {
                method: "POST",
                body: JSON.stringify({ mentorId }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setHasAccess(true);
            } else {
                showError(data.message || "Obunada xatolik");
            }
        } catch (e: any) {
            showError(e?.message || "Obunada xatolik");
        } finally {
            setSubscribing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f1116] text-white gap-4">
                <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <p className="text-sm text-white/60">Yuklanmoqda...</p>
            </div>
        );
    }

    if (hasAccess) {
        return (
            <StudentDashboard
                user={user}
                sessionId={roomId}
                sessionStyle={sessionStyle}
                onLeave={onLeave}
            />
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f1116] text-white gap-4 p-6">
                <p className="text-red-400">{error}</p>
                <button
                    onClick={onLeave}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold"
                >
                    Orqaga
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f1116] text-white p-6">
            <div className="w-full max-w-md rounded-3xl bg-white/5 border border-white/10 p-8 shadow-2xl space-y-6">
                <div className="text-center">
                    <h1 className="text-xl font-bold text-white mb-1">1 oylik obuna</h1>
                    <p className="text-sm text-white/60">
                        30 kalendar kun davomida <span className="text-white/90">{mentorName}</span> ustozning barcha darslariga kirish huquqi. Har dars uchun alohida to&apos;lov yo&apos;q.
                    </p>
                </div>
                <div className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-lg text-center">
                    {DEFAULT_MONTHLY_MALI} MALI / oy
                </div>
                <button
                    onClick={handleSubscribe}
                    disabled={subscribing}
                    className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg shadow-lg shadow-blue-600/20 transition-all"
                >
                    {subscribing ? "To'lanmoqda..." : `${DEFAULT_MONTHLY_MALI} MALI — Obuna bo'lish`}
                </button>
                <button
                    onClick={onLeave}
                    className="w-full py-2 text-white/50 hover:text-white text-sm font-medium"
                >
                    Orqaga
                </button>
            </div>
        </div>
    );
}
