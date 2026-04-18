"use client";

import { useEffect, useRef } from "react";
import { getRefreshToken, getUser, getStorageForAuth, setAuth } from "@/lib/auth-storage";
import { getPublicApiUrl } from "@/lib/public-origin";

/**
 * Mobil PWA: ilova orqa fonda uzoq turib, qayta ochganda access token eskirgan bo‘lishi mumkin.
 * Sahifa yana ko‘rinishi bilan refresh token orqali sessiyani yangilaymiz (logout kamayadi).
 */
const MIN_INTERVAL_MS = 90_000;

export default function AuthSessionRefresh() {
    const busy = useRef(false);
    const lastRun = useRef(0);

    useEffect(() => {
        const apiUrl = getPublicApiUrl();

        const refresh = async () => {
            if (typeof document === "undefined" || document.visibilityState !== "visible") return;
            const rt = getRefreshToken();
            if (!rt || busy.current) return;
            const now = Date.now();
            if (now - lastRun.current < MIN_INTERVAL_MS) return;
            busy.current = true;
            try {
                const res = await fetch(`${apiUrl}/api/auth/refresh`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ refreshToken: rt }),
                });
                if (!res.ok) return;
                const data = (await res.json()) as {
                    accessToken?: string;
                    refreshToken?: string;
                };
                if (!data.accessToken) return;
                const user = getUser();
                const storage = getStorageForAuth();
                const remember = storage === localStorage;
                setAuth(
                    data.accessToken,
                    data.refreshToken || rt,
                    (user || {}) as Record<string, unknown>,
                    remember
                );
                lastRun.current = Date.now();
            } catch {
                /* tarmoq / offline */
            } finally {
                busy.current = false;
            }
        };

        const onVisibility = () => void refresh();
        /** PWA / mobil: bfcache dan qaytishda access token yangilash */
        const onPageShow = (e: PageTransitionEvent) => {
            if (e.persisted) lastRun.current = 0;
            void refresh();
        };
        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("pageshow", onPageShow as (ev: Event) => void);
        void refresh();
        return () => {
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("pageshow", onPageShow as (ev: Event) => void);
        };
    }, []);

    return null;
}


