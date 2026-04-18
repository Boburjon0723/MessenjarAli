"use client";

import React, { useState, useEffect } from "react";
import { GlassButton } from "@/components/ui/GlassButton";
import Link from "next/link";
import { ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { TranslationKeys } from "@/lib/translations";
import { DEFAULT_PLATFORM_BACKGROUND } from "@/lib/default-background";

export default function Home() {
  const { t } = useLanguage();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    setShowContent(true);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-[#020617] text-white">
      {/* Platform default fon (birinchi kirish / bosh sahifa) */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-1000"
        style={{
          backgroundImage: `url(${DEFAULT_PLATFORM_BACKGROUND})`,
          filter: "brightness(0.5) contrast(1.05) saturate(1.08) blur(1.5px)",
        }}
      />

      {/* Modern gradient layer */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(147,51,234,0.22),_transparent_55%),radial-gradient(circle_at_20%_80%,_rgba(45,212,191,0.16),_transparent_55%)]" />

      {/* Glassy dark overlay */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/40 via-[#020617]/75 to-black/90 backdrop-blur-[6px]" />

      {/* Accent blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 z-10 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.7),_transparent_65%)] opacity-60 mix-blend-screen" />
      <div className="pointer-events-none absolute -bottom-32 right-[-10%] z-10 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,_rgba(236,72,153,0.6),_transparent_65%)] opacity-60 mix-blend-screen" />

      {/* Subtle bottom glow */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[-40%] z-10 h-[60%] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.35),_transparent_60%)] opacity-70" />

      {/* Content */}
      <div
        className={`relative z-20 mx-auto flex max-w-5xl flex-col items-center px-4 text-center transition-all duration-1000 ${
          showContent
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-10 scale-95"
        }`}
      >
        {/* Premium Header Branding */}
        <div className="mb-6 flex items-center gap-3 rounded-full border border-white/10 bg-black/40 px-4 py-1 text-[11px] uppercase tracking-[0.35em] text-sky-300/80">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold">{t('branding_tagline')}</span>
        </div>

        <h1 className="mb-4 text-5xl font-extrabold tracking-tight sm:text-7xl md:text-8xl lg:text-9xl">
          <span className="bg-gradient-to-b from-white via-white to-white/50 bg-clip-text text-transparent">
            ExpertLine
          </span>
        </h1>

        <p className="mb-2 max-w-2xl text-sm font-semibold uppercase tracking-[0.15em] text-sky-200/90 sm:text-base sm:tracking-[0.2em]">
          {t('home_subtitle_1')}
        </p>

        <p className="mb-8 max-w-2xl text-base font-medium text-slate-200/80 sm:text-lg md:text-xl md:leading-relaxed">
          {t('home_description')}
        </p>

        {/* CTAs */}
        <div className="mb-4 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link href="/login">
            <div className="relative inline-block group">
              <div className="absolute -inset-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-500 rounded-2xl blur opacity-40 group-hover:opacity-70 transition duration-500" />
              <GlassButton
                variant="primary"
                size="lg"
                className="relative px-12 py-4 text-base sm:text-lg font-bold bg-sky-500 hover:bg-sky-400 border-white/10 !rounded-2xl transition-all duration-300 transform active:scale-95"
              >
                {t('start_btn')}
              </GlassButton>
            </div>
          </Link>

          <Link href="/register">
            <button className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm sm:text-base font-semibold text-slate-100 backdrop-blur-md transition-colors hover:bg-white/10">
              {t('register')}
            </button>
          </Link>
        </div>

        <p className="mb-8 text-[11px] text-slate-300/80 sm:text-xs">
          {t('home_footer_hint')}
        </p>

        {/* Feature highlights */}
        <div className="grid w-full max-w-3xl grid-cols-1 gap-3 text-left text-xs text-slate-200/80 sm:grid-cols-3 sm:text-sm">
          <div className="flex items-start gap-3 rounded-2xl bg-black/40 px-4 py-3 backdrop-blur-md border border-white/5">
            <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/20 text-sky-300">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold">{t('feature_chat_title')}</p>
              <p className="text-[11px] text-slate-300/80">
                {t('feature_chat_desc')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-black/40 px-4 py-3 backdrop-blur-md border border-white/5">
            <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold">{t('feature_safety_title')}</p>
              <p className="text-[11px] text-slate-300/80">
                {t('feature_safety_desc')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-black/40 px-4 py-3 backdrop-blur-md border border-white/5">
            <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/20 text-violet-300">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold">{t('feature_wallet_title')}</p>
              <p className="text-[11px] text-slate-300/80">
                {t('feature_wallet_desc')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="pointer-events-none absolute bottom-8 left-1/2 z-20 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-[0.45em] text-white/35">
        ExpertLine • {t('branding_tagline')} • 2026
      </div>
    </div>
  );
}


