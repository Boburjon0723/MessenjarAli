"use client";

import { Suspense } from "react";
import MessagesPageContent from "./MessagesPageContent";

export default function MessagesPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center bg-[#0f1117]"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}>
            <MessagesPageContent />
        </Suspense>
    );
}
