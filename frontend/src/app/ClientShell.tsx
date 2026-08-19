"use client";

import React from "react";
import { usePathname } from "next/navigation";
import WebAppInstallPrompt from "@/components/pwa/WebAppInstallPrompt";
import AuthSessionRefresh from "@/components/auth/AuthSessionRefresh";
import E2EKeyBootstrap from "@/components/auth/E2EKeyBootstrap";

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
      <E2EKeyBootstrap />
      <WebAppInstallPrompt />
    </div>
  );
}



