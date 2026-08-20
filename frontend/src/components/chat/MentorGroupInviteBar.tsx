'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useNotification } from '@/context/NotificationContext';
import { useLanguage } from '@/context/LanguageContext';
import { getUser } from '@/lib/auth-storage';
import { useSocket } from '@/context/SocketContext';

type MentorGroup = { id: string; name: string; chatId?: string };

type Eligibility = {
    showInviteBar: boolean;
    isActiveStudent?: boolean;
    canReinviteViaListing?: boolean;
    memberGroups?: { id: string; name: string }[];
};

export function MentorGroupInviteBar({
    chatId,
    expertName,
}: {
    chatId: string;
    expertName: string;
}) {
    const { showSuccess, showError } = useNotification();
    const { t } = useLanguage();
    const { socket } = useSocket();
    const [groups, setGroups] = useState<MentorGroup[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [eligibility, setEligibility] = useState<Eligibility | null>(null);

    const refreshEligibility = useCallback(async () => {
        try {
            const res = await apiFetch(
                `/api/specialists/mentor/group-invite-eligibility?chatId=${encodeURIComponent(chatId)}`
            );
            if (!res.ok) {
                setEligibility({ showInviteBar: true });
                return;
            }
            const data = (await res.json()) as Eligibility;
            setEligibility(data);
        } catch {
            setEligibility({ showInviteBar: true });
        }
    }, [chatId]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const me = getUser() as { id?: string } | null;
                const expertId = me?.id;
                if (!expertId) return;
                const [groupsRes] = await Promise.all([
                    apiFetch(`/api/chats/expert/${encodeURIComponent(String(expertId))}`),
                    refreshEligibility(),
                ]);
                if (!groupsRes.ok) return;
                const data = await groupsRes.json();
                if (cancelled) return;
                const mapped = (Array.isArray(data) ? data : []).map((g: any) => ({
                    id: String(g.id || g.chatId),
                    name: String(g.name || t('group_label')),
                    chatId: String(g.id || g.chatId),
                }));
                setGroups(mapped);
                if (mapped.length > 0) setSelectedGroupId(mapped[0].id);
            } catch {
                /* ignore */
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [t, chatId, refreshEligibility]);

    useEffect(() => {
        if (!socket || !chatId) return;
        const onMeta = (data: { chatId?: string }) => {
            if (data?.chatId && String(data.chatId) === String(chatId)) {
                void refreshEligibility();
            }
        };
        const onJoined = () => {
            void refreshEligibility();
        };
        socket.on('message_metadata_updated', onMeta);
        socket.on('participant_joined', onJoined);
        return () => {
            socket.off('message_metadata_updated', onMeta);
            socket.off('participant_joined', onJoined);
        };
    }, [socket, chatId, refreshEligibility]);

    const handleSend = async () => {
        if (!selectedGroupId) {
            showError(t('select_group_label') as string);
            return;
        }
        setSending(true);
        try {
            const res = await apiFetch('/api/specialists/mentor/group-join-invite', {
                method: 'POST',
                body: JSON.stringify({
                    chatId,
                    groupId: selectedGroupId,
                    expertName,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.message || t('server_error'));
            showSuccess(t('invite_sent_success') as string);
            void refreshEligibility();
        } catch (e) {
            showError(e instanceof Error ? e.message : (t('server_error') as string));
        } finally {
            setSending(false);
        }
    };

    if (loading || groups.length === 0) return null;
    if (eligibility && !eligibility.showInviteBar) return null;

    return (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-[20px] border border-[#8774e1]/25 bg-[#8774e1]/10 px-3 py-2">
            <Users className="h-4 w-4 shrink-0 text-[#8774e1]" />
            <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#212121] px-2 py-1.5 text-[13px] text-white focus:outline-none focus:border-[#8774e1]/50"
            >
                {groups.map((g) => (
                    <option key={g.id} value={g.id} className="bg-[#212121]">
                        {g.name}
                    </option>
                ))}
            </select>
            <button
                type="button"
                onClick={() => void handleSend()}
                disabled={sending}
                className="shrink-0 rounded-lg bg-[#8774e1] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#7b68d9] disabled:opacity-60"
            >
                {sending
                    ? '...'
                    : eligibility?.canReinviteViaListing
                      ? (t('group_reinvite_btn') as string)
                      : (t('send_group_join_invite') as string)}
            </button>
        </div>
    );
}

export default MentorGroupInviteBar;
