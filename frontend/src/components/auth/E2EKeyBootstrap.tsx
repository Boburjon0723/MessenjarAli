"use client";

import { useEffect } from "react";
import { getToken, getUser } from "@/lib/auth-storage";
import { publishIdentity } from "@/lib/e2e-crypto";
import { E2E_SEND_ENABLED } from "@/lib/e2e-envelope";

/** Login bo‘lgach identity kalitini yaratadi va public key ni serverga yuboradi. */
export default function E2EKeyBootstrap() {
    useEffect(() => {
        const run = async () => {
            if (!E2E_SEND_ENABLED) return;
            if (typeof window === "undefined" || !window.crypto?.subtle) return;
            if (!getToken()) return;
            const user = getUser() as { id?: string } | null;
            if (!user?.id) return;
            try {
                await publishIdentity(String(user.id));
            } catch (err) {
                console.warn("[e2e] public key publish failed", err);
            }
        };
        void run();
    }, []);
    return null;
}
