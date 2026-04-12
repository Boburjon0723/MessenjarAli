"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useNotification } from "@/context/NotificationContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Bot, Plus, Copy, RefreshCw, Trash2, X } from "lucide-react";

interface BotItem {
    id: string;
    user_id: string;
    name: string;
    username: string;
    token_prefix: string;
    created_at: string;
}

export default function BotsPanel({ onClose }: { onClose: () => void }) {
    const { showSuccess, showError } = useNotification();
    const { confirm } = useConfirm();
    const [bots, setBots] = useState<BotItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [createdToken, setCreatedToken] = useState<string | null>(null);
    const [newBotId, setNewBotId] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchBots = async () => {
        setLoading(true);
        try {
            const res = await apiFetch("/api/bots");
            if (res.ok) {
                const data = await res.json();
                setBots(Array.isArray(data) ? data : []);
            } else setBots([]);
        } catch {
            setBots([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBots();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!name.trim()) {
            setError("Bot nomi kerak");
            return;
        }
        if (!username.trim()) {
            setError("Username kerak");
            return;
        }
        setCreating(true);
        try {
            const res = await apiFetch("/api/bots", {
                method: "POST",
                body: JSON.stringify({ name: name.trim(), username: username.trim() }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data.message || "Yaratishda xato");
                return;
            }
            setCreatedToken(data.token);
            setNewBotId(data.bot?.id || null);
            setBots((prev) => (data.bot ? [data.bot, ...prev] : prev));
            setName("");
            setUsername("");
            setShowForm(false);
        } catch {
            setError("Tarmoq xatosi");
        } finally {
            setCreating(false);
        }
    };

    const copyToken = () => {
        if (createdToken && typeof navigator !== "undefined" && navigator.clipboard) {
            navigator.clipboard.writeText(createdToken);
            showSuccess("Token nusxalandi. Uni xavfsiz joyda saqlang.");
        }
    };

    const closeTokenView = () => {
        setCreatedToken(null);
        setNewBotId(null);
    };

    const regenerateToken = async (botId: string) => {
        setRegeneratingId(botId);
        try {
            const res = await apiFetch(`/api/bots/${botId}/regenerate`, { method: "PUT" });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.token) {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                    navigator.clipboard.writeText(data.token);
                }
                showSuccess("Yangi token yaratildi va nusxalandi.");
                fetchBots();
            } else {
                showError(data.message || "Xato yuz berdi");
            }
        } catch {
            showError("Xatolik yuz berdi");
        } finally {
            setRegeneratingId(null);
        }
    };

    const deleteBot = async (botId: string) => {
        const ok = await confirm({
            title: "Botni o'chirish",
            description: "Botni o‘chirishni xohlaysizmi? Token ishlamay qoladi.",
            variant: 'danger',
            confirmLabel: "O'chirish"
        });
        if (!ok) return;
        setDeletingId(botId);
        try {
            const res = await apiFetch(`/api/bots/${botId}`, { method: "DELETE" });
            if (res.ok) {
                setBots((prev) => prev.filter((b) => b.id !== botId));
                if (newBotId === botId) closeTokenView();
                showSuccess("Bot o'chirildi.");
            } else {
                const data = await res.json().catch(() => ({}));
                showError(data.message || "O‘chirishda xato");
            }
        } catch {
            showError("Xatolik yuz berdi");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[#1a1c20]/90 backdrop-blur-xl border border-white/10 rounded-2xl">
            <header className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-white font-bold text-lg">Botlar</h2>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/70">
                    <X className="h-5 w-5" />
                </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {createdToken && (
                    <div className="rounded-xl bg-amber-500/20 border border-amber-500/40 p-4 space-y-2">
                        <p className="text-amber-200 text-sm font-medium">Token faqat bir marta ko‘rsatiladi. Nusxalab saqlang.</p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 truncate text-xs bg-black/30 px-2 py-1 rounded text-white/80">{createdToken}</code>
                            <button type="button" onClick={copyToken} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white">
                                <Copy className="h-4 w-4" />
                            </button>
                        </div>
                        <button type="button" onClick={closeTokenView} className="text-amber-200 text-sm underline">Yopish</button>
                    </div>
                )}

                {showForm ? (
                    <form onSubmit={handleCreate} className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
                        <input
                            type="text"
                            placeholder="Bot nomi"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-white placeholder-white/40"
                        />
                        <input
                            type="text"
                            placeholder="Username (lotin, raqam, _)"
                            value={username}
                            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                            className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-white placeholder-white/40"
                        />
                        {error && <p className="text-red-400 text-sm">{error}</p>}
                        <div className="flex gap-2">
                            <button type="submit" disabled={creating} className="rounded-lg bg-blue-600 px-4 py-2 text-white font-medium disabled:opacity-50">
                                Yaratish
                            </button>
                            <button type="button" onClick={() => { setShowForm(false); setError(""); }} className="rounded-lg bg-white/10 px-4 py-2 text-white">
                                Bekor
                            </button>
                        </div>
                    </form>
                ) : (
                    <button
                        type="button"
                        onClick={() => setShowForm(true)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 py-3 text-white font-medium"
                    >
                        <Plus className="h-5 w-5" /> Yangi bot
                    </button>
                )}

                <p className="text-white/50 text-xs">
                    Bot tokeni orqali tashqi tizimdan xabar yuborish: <code className="bg-black/30 px-1 rounded">POST /api/bot/sendMessage</code>, header: <code className="bg-black/30 px-1 rounded">Authorization: Bot &lt;token&gt;</code> yoki <code className="bg-black/30 px-1 rounded">X-Bot-Token</code>.
                </p>

                {loading ? (
                    <div className="text-white/50 py-6">Yuklanmoqda…</div>
                ) : bots.length === 0 ? (
                    <div className="text-white/40 py-6 text-center">Hali bot yo‘q. &quot;Yangi bot&quot; orqali yarating.</div>
                ) : (
                    <ul className="space-y-2">
                        {bots.map((b) => (
                            <li key={b.id} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/30 flex items-center justify-center flex-shrink-0">
                                        <Bot className="h-5 w-5 text-blue-300" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-white font-medium truncate">{b.name}</p>
                                        <p className="text-white/50 text-sm truncate">@{b.username}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => regenerateToken(b.id)}
                                        disabled={!!regeneratingId}
                                        title="Token yangilash"
                                        className="p-2 rounded-lg hover:bg-white/10 text-white/70 disabled:opacity-50"
                                    >
                                        <RefreshCw className={`h-4 w-4 ${regeneratingId === b.id ? "animate-spin" : ""}`} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => deleteBot(b.id)}
                                        disabled={!!deletingId}
                                        title="O‘chirish"
                                        className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 disabled:opacity-50"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
