"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { apiFetch } from "@/lib/api";
import StudentDashboard from "./StudentDashboard";
import type { ExpertPanelMode } from "@/lib/expert-roles";

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
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);
    const [isPrivateRoom, setIsPrivateRoom] = useState(false);
    const [roomClosed, setRoomClosed] = useState(false);
    const [subscriptionExpired, setSubscriptionExpired] = useState(false);
    const [needsInvite, setNeedsInvite] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
                const privateRoom = room.type === "private";
                setIsPrivateRoom(privateRoom);

                if (privateRoom) {
                    const accessRes = await apiFetch(
                        `/api/chats/${encodeURIComponent(roomId)}/panel-access`
                    );
                    if (cancelled) return;
                    if (!accessRes.ok) {
                        setRoomClosed(true);
                        setLoading(false);
                        return;
                    }
                    const access = await accessRes.json();
                    if (access?.allowed) {
                        setHasAccess(true);
                    } else {
                        setRoomClosed(true);
                    }
                    setLoading(false);
                    return;
                }

                if (!creatorId) {
                    setHasAccess(true);
                    setLoading(false);
                    return;
                }

                const subRes = await apiFetch(
                    `/api/wallet/subscription-status?mentorId=${encodeURIComponent(creatorId)}`
                );
                if (cancelled) return;
                if (subRes.ok) {
                    const data = await subRes.json();
                    if (data.active) {
                        setHasAccess(true);
                    } else if (data.expired) {
                        setSubscriptionExpired(true);
                    } else {
                        setNeedsInvite(true);
                    }
                } else {
                    setNeedsInvite(true);
                }
            } catch {
                if (!cancelled) setError("Ma'lumotni yuklashda xatolik");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [roomId]);

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

    if (roomClosed && isPrivateRoom) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f1116] text-white gap-4 p-6">
                <p className="text-white/80 text-center">{t("panel_room_closed")}</p>
                <p className="text-sm text-white/50 text-center max-w-sm">{t("invite_expired_hint")}</p>
                <button
                    onClick={onLeave}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold"
                >
                    {t("back")}
                </button>
            </div>
        );
    }

    if (subscriptionExpired) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f1116] text-white gap-4 p-6">
                <p className="text-white/90 text-center font-semibold">{t("subscription_expired_lesson")}</p>
                <p className="text-sm text-white/50 text-center max-w-sm">{t("subscription_expired_hint")}</p>
                <button
                    onClick={onLeave}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold"
                >
                    {t("back")}
                </button>
            </div>
        );
    }

    if (needsInvite) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f1116] text-white gap-4 p-6">
                <p className="text-white/90 text-center font-semibold max-w-md">{t("subscription_pay_via_invite")}</p>
                <button
                    onClick={onLeave}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold"
                >
                    {t("back")}
                </button>
            </div>
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

    return null;
}
