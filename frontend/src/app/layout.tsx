import type { Metadata, Viewport } from "next";
import "./globals.css";

/** Mobil notch / home indicator: fon to‘liq ekran, status bar ostida oq bo‘shliq kamayadi */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  title: "ExpertLine — mutaxassislarni toping, xavfsiz muloqot",
  description:
    "Mutaxassislar uchun ish prostori, mijozlar uchun qulay kirish: jonli dars, maslahat, chat, kanallar va to'lovlar bitta platformada.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ExpertLine",
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "512x512", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

import { SocketProvider } from "@/context/SocketContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ConfirmProvider } from "@/context/ConfirmContext";
import { LanguageProvider } from "@/context/LanguageContext";
import ClientShell from "./ClientShell";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body className="antialiased">
        <LanguageProvider>
          <NotificationProvider>
            <ConfirmProvider>
              <SocketProvider>
                <ClientShell>{children}</ClientShell>
              </SocketProvider>
            </ConfirmProvider>
          </NotificationProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}


