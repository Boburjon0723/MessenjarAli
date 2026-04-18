"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Phone, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { setAuth } from "@/lib/auth-storage";
import { DEFAULT_PLATFORM_BACKGROUND } from "@/lib/default-background";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://backend-production-ad05.up.railway.app";

const COUNTRY_CODES = [
  { code: "+998", country: "UZ", label: "Uzbekistan" },
  { code: "+7", country: "RU", label: "Russia/Kazakhstan" },
  { code: "+1", country: "US", label: "USA" },
  { code: "+992", country: "TJ", label: "Tajikistan" },
  { code: "+996", country: "KG", label: "Kyrgyzstan" },
  { code: "+90", country: "TR", label: "Turkey" },
  { code: "+82", country: "KR", label: "South Korea" },
];

import { useLanguage } from "@/context/LanguageContext";
import { TranslationKeys } from "@/lib/translations";
import { Suspense } from "react";

function Login() {
  const { t } = useLanguage();
  const router = useRouter();

  const [countryCode, setCountryCode] = useState("+998");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [justRegistered, setJustRegistered] = useState(false);
  const [desktopUrl, setDesktopUrl] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetCode, setResetCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("registered")) {
      setJustRegistered(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchDesktopInfo = async () => {
      try {
        const res = await fetch(`${API_URL}/api/desktop`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.url) {
          setDesktopUrl(data.url);
        }
      } catch {
        // desktop ilova hali sozlanmagan bo'lishi mumkin – jim o'tamiz
      }
    };

    fetchDesktopInfo();
  }, []);

  const handleDesktopDownloadClick = () => {
    if (!desktopUrl) return;
    if (typeof window === "undefined") return;

    let url = desktopUrl;

    // Agar bu Google Drive "view" havolasi bo'lsa, uni avtomatik ravishda direct download formatga o'tkazamiz
    // Misol: https://drive.google.com/file/d/FILE_ID/view?...  ->  https://drive.google.com/uc?export=download&id=FILE_ID
    try {
      const driveMatch = url.match(/https?:\/\/drive\.google\.com\/file\/d\/([^/]+)\//);
      if (driveMatch && driveMatch[1]) {
        const fileId = driveMatch[1];
        url = `https://drive.google.com/uc?export=download&id=${fileId}`;
      }
    } catch {
      // agar parslash muvaffaqiyatsiz bo'lsa, asl URL bilan davom etamiz
    }

    // Brauzerga yuklab olishni boshlash uchun shu URL'ga yo'naltiramiz (login sahifadan chiqadi, lekin yuklab olish kafolatliroq ishlaydi)
    window.location.href = url;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setJustRegistered(false);
    setLoading(true);

    if (!phone || !password) {
      setError(t('error_phone_pass_req') as TranslationKeys);
      setLoading(false);
      return;
    }

    const numericPhone = phone.replace(/\D/g, "");
    if (numericPhone.length < 9) {
      setError(t('error_phone_full_req') as TranslationKeys);
      setLoading(false);
      return;
    }

    const fullPhone = `${countryCode}${numericPhone}`;

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone, password }),
      });

      const data = await res.json();

      if (res.ok) {
        if (typeof window !== "undefined") {
          setAuth(data.token, data.refreshToken || "", data.user || {}, rememberMe);
        }
        router.push("/messages");
      } else {
        if (res.status === 401) {
          setError(t('error_invalid_credentials') as TranslationKeys);
        } else if (res.status === 403) {
          setError(t('error_account_blocked') as TranslationKeys);
        } else {
          setError(
            data.message || (t('error_generic_login') as TranslationKeys)
          );
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(
        t('error_server_connection') as TranslationKeys
      );
    } finally {
      setLoading(false);
    }
  };

  const fullPhone = `${countryCode}${phone.replace(/\D/g, "")}`;

  const handleRequestReset = async () => {
    setResetError(null);
    setResetMessage(null);

    const numericPhone = phone.replace(/\D/g, "");
    if (!numericPhone || numericPhone.length < 9) {
      setResetError(t('error_phone_first') as TranslationKeys);
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/request-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setResetError(data?.message || (t('error_generic_login') as TranslationKeys));
        return;
      }

      setResetStep(2);
      setResetMessage(t('reset_code_sent_desc_tg') as TranslationKeys);
    } catch (err) {
      console.error("request reset error:", err);
      setResetError(t('error_server_connection') as TranslationKeys);
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    setResetError(null);
    setResetMessage(null);

    if (!resetCode || !resetNewPassword) {
      setResetError(t('error_code_pass_req') as TranslationKeys);
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/confirm-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: fullPhone,
          code: resetCode.trim(),
          newPassword: resetNewPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setResetError(data?.message || (t('error_generic_login') as TranslationKeys));
        return;
      }

      setResetMessage(t('reset_success') as TranslationKeys);
      setResetStep(1);
      setResetCode("");
      setResetNewPassword("");
      setResetOpen(false);
    } catch (err) {
      console.error("confirm reset error:", err);
      setResetError("Serverga ulanib bo‘lmadi. Keyinroq qayta urinib ko‘ring.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] text-white flex items-start md:items-center justify-center relative overflow-hidden overflow-y-auto pb-safe">
      {/* Platform default fon (messages bilan bir xil manzara) */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${DEFAULT_PLATFORM_BACKGROUND})` }}
      />
      <div
        aria-hidden
        className="absolute inset-0 z-0 bg-[rgba(15,23,42,0.4)] backdrop-blur-[8px] [-webkit-backdrop-filter:blur(8px)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,_#1d4ed8_0,_transparent_50%),radial-gradient(circle_at_bottom,_#7c3aed_0,_transparent_55%)] opacity-35"
      />
      <div aria-hidden className="absolute inset-0 z-0 bg-gradient-to-br from-black/55 via-black/45 to-[#020617]/88" />

      {/* Centered card */}
      <div className="relative z-10 w-full max-w-4xl px-4 py-6 sm:py-10 md:py-0">
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-10 md:gap-14 items-center">
          {/* Left side – branding */}
          <div className="space-y-6 md:space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-blue-200/70">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t('branding_tagline')}</span>
            </div>

            <div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight">
                {t('login_title_prefix')}
                <span className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent ml-2">
                  {t('login_title_suffix')}
                </span>
              </h1>
              <p className="mt-4 text-sm md:text-base text-slate-300/80 max-w-md leading-relaxed">
                {t('login_desc')}
              </p>
              {desktopUrl && (
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={handleDesktopDownloadClick}
                    className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs md:text-sm font-medium text-sky-200 hover:bg-white/10 hover:border-sky-400/60 transition-colors"
                  >
                    {t('download_desktop_windows')}
                  </button>
                </div>
              )}
            </div>

            <div className="hidden md:flex items-center gap-3 text-xs text-slate-400/80">
              <div className="flex -space-x-2">
                <div className="h-7 w-7 rounded-full border border-slate-900 bg-gradient-to-br from-sky-500 to-indigo-500" />
                <div className="h-7 w-7 rounded-full border border-slate-900 bg-gradient-to-br from-emerald-400 to-cyan-500" />
                <div className="h-7 w-7 rounded-full border border-slate-900 bg-gradient-to-br from-fuchsia-500 to-rose-500" />
              </div>
              <span>{t('login_features_features')}</span>
            </div>
          </div>

          {/* Right side – form */}
          <div className="relative animate-auth-enter-left">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-sky-500/60 via-indigo-500/40 to-fuchsia-500/40 opacity-60 blur-xl" />
            <div className="relative rounded-3xl border border-white/10 bg-black/60 backdrop-blur-2xl px-4 py-6 sm:px-6 sm:py-7 md:px-7 md:py-8 shadow-2xl shadow-sky-900/40">
              <div className="mb-6">
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight">
                  {t('login_form_title')}
                </h2>
                <p className="mt-1 text-xs md:text-sm text-slate-400">
                  {t('login_form_desc')}
                </p>
              </div>

              {justRegistered && !error && (
                <div role="status" className="mb-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-200">
                  {t('reg_success_login_now')}
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2 rounded-2xl border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-xs text-red-200"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Phone */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-300">
                    {t('phone_label')}
                  </label>
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 focus-within:border-sky-400/70 focus-within:bg-white/10 transition-all">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="bg-transparent text-xs md:text-sm font-semibold text-white focus:outline-none w-[70px]"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option
                          key={c.country}
                          value={c.code}
                          className="bg-slate-900 text-white"
                        >
                          {c.code}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) =>
                        setPhone(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="90 123 45 67"
                      className="flex-1 bg-transparent text-xs md:text-sm font-medium text-white placeholder:text-slate-500 focus:outline-none"
                    />
                    <Phone className="h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-300">
                    {t('password')}
                  </label>
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 focus-within:border-sky-400/70 focus-within:bg-white/10 transition-all">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="flex-1 bg-transparent text-xs md:text-sm font-medium text-white placeholder:text-slate-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-white/20 bg-white/5 text-sky-500 focus:ring-sky-500"
                  />
                  <span>{t('remember_me')}</span>
                </label>

                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setResetOpen((v) => !v);
                      setResetError(null);
                      setResetMessage(null);
                      setResetStep(1);
                    }}
                    className="text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {t('forgot_password')}
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <p className="text-slate-400">
                      {t('no_account')}{" "}
                      <Link
                        href="/register"
                        className="text-sky-400 hover:text-sky-300 font-medium ml-1 transition-colors"
                      >
                        {t('register')}
                      </Link>
                    </p>
                  </div>
                </div>

                {resetOpen && (
                  <div className="mt-4 rounded-2xl border border-sky-500/30 bg-sky-500/5 p-3 space-y-3">
                    <p className="text-[11px] text-slate-200">
                      {t('reset_pass_desc')}
                    </p>
                    {resetMessage && (
                      <div className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2">
                        {resetMessage}
                      </div>
                    )}
                    {resetError && (
                      <div role="alert" className="flex items-start gap-2 text-[11px] text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                        <span>{resetError}</span>
                      </div>
                    )}

                    {resetStep === 1 && (
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={handleRequestReset}
                          disabled={resetLoading}
                          className="inline-flex items-center justify-center rounded-full bg-sky-600 hover:bg-sky-500 px-4 py-2 text-[11px] font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {resetLoading ? t('sending_status') : t('get_code')}
                        </button>
                        <span className="text-[10px] text-slate-400">
                          {t('error_phone_first')}
                        </span>
                      </div>
                    )}

                    {resetStep === 2 && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] text-slate-300">{t('verification_code')}</label>
                            <input
                              type="text"
                              value={resetCode}
                              onChange={(e) => setResetCode(e.target.value)}
                              className="w-full rounded-2xl bg-black/40 border border-white/10 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                              placeholder="123456"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] text-slate-300">{t('new_password')}</label>
                            <input
                              type="password"
                              value={resetNewPassword}
                              onChange={(e) => setResetNewPassword(e.target.value)}
                              className="w-full rounded-2xl bg-black/40 border border-white/10 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                              placeholder={t('password') as string}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleConfirmReset}
                          disabled={resetLoading}
                          className="inline-flex items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-[11px] font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {resetLoading ? t('verifying') : t('reset_pass_btn')}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    loading ||
                    !phone ||
                    !password ||
                    phone.replace(/\D/g, "").length < 9
                  }
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-900/40 transition-all hover:shadow-xl hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed min-h-[48px] touch-manipulation"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t('logging_in')}</span>
                    </>
                  ) : (
                    t('login_btn')
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-white animate-pulse">{t('loading')}</div>
      </div>
    }>
      <Login />
    </Suspense>
  );
}


