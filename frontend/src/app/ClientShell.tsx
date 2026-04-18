"use client";

import React from "react";
import { usePathname } from "next/navigation";
import WebAppInstallPrompt from "@/components/pwa/WebAppInstallPrompt";
import AuthSessionRefresh from "@/components/auth/AuthSessionRefresh";

interface ClientShellProps {
  children: React.ReactNode;
}

export default function ClientShell({ children }: ClientShellProps) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      className="min-h-screen animate-fade-in motion-safe:duration-300 motion-safe:ease-out"
    >
      {children}
      <AuthSessionRefresh />
      <WebAppInstallPrompt />
    </div>
  );
}


