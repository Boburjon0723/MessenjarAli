"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Phone, User, Calendar, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, Globe } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { TranslationKeys } from "@/lib/translations";

import { DEFAULT_PLATFORM_BACKGROUND } from "@/lib/default-background";
import { setAuth } from "@/lib/auth-storage";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:4000"
    : "https://backend-production-ad05.up.railway.app");

/** Telegram bot username, @siz: masalan "ExpertLineBot" */
const TELEGRAM_BOT_USER =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME) ||
  "";
const TELEGRAM_BOT_URL =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL) ||
  "https://t.me/MessenjrAli_bot";

const COUNTRY_CODES = [
  { code: "+998", country: "UZ", label: "Uzbekistan" },
  { code: "+7", country: "RU", label: "Russia/Kazakhstan" },
  { code: "+1", country: "US", label: "USA" },
  { code: "+992", country: "TJ", label: "Tajikistan" },
  { code: "+996", country: "KG", label: "Kyrgyzstan" },
  { code: "+90", country: "TR", label: "Turkey" },
  { code: "+82", country: "KR", label: "South Korea" },
];

const LANGUAGES = [
  { code: "uz", label: "O'zbek", flag: "🇺🇿", desc: "O'zbek tilida davom eting" },
  { code: "ru", label: "Русский", flag: "🇷🇺", desc: "Продолжить на русском" },
  { code: "en", label: "English", flag: "🇬🇧", desc: "Continue in English" },
];

type Step = "lang" | "form" | "telegram" | "otp";
type Lang = "uz" | "ru" | "en";

export default function RegisterPage() {
  const { t, setLanguage } = useLanguage();
  const router = useRouter();

  const [countryCode, setCountryCode] = useState("+998");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [age, setAge] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedLang, setSelectedLang] = useState<Lang>("ru");
  const [step, setStep] = useState<Step>("lang");

  // Sync initial language with global context if already selected in previous session or during lang step
  const handleSelectLang = (lang: Lang) => {
    setSelectedLang(lang);
    setLanguage(lang);
    localStorage.setItem("app-lang", lang);
  };
  const [registeredPhone, setRegisteredPhone] = useState("");
  const [linkCode, setLinkCode] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [pollLoading, setPollLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchRegistrationStatus = useCallback(async () => {
    if (!registeredPhone) return null;
    setPollLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/registration-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: registeredPhone }),
      });
      const data = await res.json();
      if (!res.ok) return null;
      return data as {
        telegramLinked: boolean;
        needsOtp: boolean;
        completed?: boolean;
      };
    } catch {
      return null;
    } finally {
      setPollLoading(false);
    }
  }, [registeredPhone]);

  useEffect(() => {
    if (step !== "telegram" || !registeredPhone) return;

    const tick = async () => {
      const st = await fetchRegistrationStatus();
      if (st?.needsOtp) {
        setStep("otp");
        setError("");
      }
    };

    tick();
    const id = setInterval(tick, 3500);
    return () => clearInterval(id);
  }, [step, registeredPhone, fetchRegistrationStatus]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name || !surname || !phone || !password || !confirmPassword || !age) {
      setError(t('filling_all_fields_req') as TranslationKeys);
      return;
    }

    if (password.length < 6) {
      setError(t('error_password_min') as TranslationKeys);
      return;
    }

    if (password !== confirmPassword) {
      setError(t('error_passwords_not_match') as TranslationKeys);
      return;
    }

    const parsedAge = parseInt(age, 10);
    if (Number.isNaN(parsedAge) || parsedAge < 12) {
      setError(t('error_age_invalid') as TranslationKeys);
      return;
    }

    setLoading(true);

    const fullPhone = `${countryCode}${phone.replace(/\D/g, "")}`;

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: fullPhone,
          password,
          name,
          surname,
          age: parsedAge,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Telegram verification disabled — redirect directly to login
        setSuccess("redirecting");
        setTimeout(() => {
          router.push("/login?registered=1");
        }, 1500);
      } else {
        setError(data.message || (t('error_registration_failed') as TranslationKeys));
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError(
        t('error_server_connection') as TranslationKeys
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!otpCode.trim() || otpCode.trim().length < 4) {
      setError("Botdan kelgan kodni kiriting.");
      return;
    }
    setOtpLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: registeredPhone,
          code: otpCode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Tasdiqlash muvaffaqiyatsiz.");
        return;
      }
      if (data.token && data.refreshToken && data.user) {
        setAuth(data.token, data.refreshToken, data.user as Record<string, unknown>, true);
        router.push("/messages");
      }
    } catch {
      setError("Serverga ulanib bo'lmadi.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setOtpLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/resend-registration-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: registeredPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Kod yuborilmadi.");
      } else {
        setSuccess("Yangi kod Telegramga yuborildi.");
        setTimeout(() => setSuccess(""), 4000);
      }
    } catch {
      setError("Serverga ulanib bo'lmadi.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleCopyLinkCode = async () => {
    if (!linkCode) return;
    try {
      await navigator.clipboard.writeText(linkCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Kodni nusxalab bo'lmadi. Qo'lda belgilang va copy qiling.");
    }
  };

  const formLocked = loading || !!success || step !== "form";

  return (
    <div className="min-h-screen min-h-[100dvh] text-white flex items-start md:items-center justify-center relative overflow-hidden overflow-y-auto pb-safe">
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

      {/* Language Selection Screen */}
      {step === "lang" && (
        <div className="relative z-10 w-full max-w-md px-4 py-10 mx-auto flex flex-col items-center justify-center min-h-screen">
          <div className="relative w-full">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-sky-500/60 via-indigo-500/40 to-fuchsia-500/40 opacity-60 blur-xl rounded-3xl" />
            <div className="relative rounded-3xl border border-white/10 bg-black/60 backdrop-blur-2xl px-6 py-8 shadow-2xl shadow-sky-900/40">
              {/* Header */}
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg">
                  <Globe className="h-7 w-7 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  {t('choose_language')}
                </h1>
                <p className="mt-2 text-sm text-slate-400 max-w-xs">
                  {t('choose_language_desc')}
                </p>
              </div>

              {/* Language Options */}
              <div className="space-y-3 mb-8">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelectLang(lang.code as Lang)}
                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all duration-200 text-left ${
                      selectedLang === lang.code
                        ? "border-sky-400/70 bg-sky-500/15 ring-1 ring-sky-400/40"
                        : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                    }`}
                  >
                    <span className="text-3xl leading-none">{lang.flag}</span>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-base">{lang.label}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{lang.desc}</p>
                    </div>
                    {selectedLang === lang.code && (
                      <div className="w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center shrink-0">
                        <CheckCircle className="h-3.5 w-3.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Continue Button */}
              <button
                type="button"
                onClick={() => {
                  setStep("form");
                }}
                className="w-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-900/40 transition-all hover:shadow-xl hover:brightness-110"
              >
                {t('continue')} →
              </button>

              <p className="text-center text-xs text-slate-500 mt-5">
                {t('change_later_hint')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Registration Form */}
      {step !== "lang" && (
      <div className="relative z-10 w-full max-w-5xl px-4 py-6 sm:py-10 md:py-0">
        <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1.1fr] gap-10 md:gap-14 items-center">
          {/* Left side – branding */}
          <div className="space-y-6 md:space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-blue-200/70">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t('branding_tagline')}</span>
            </div>

            <div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight">
                {t('register_branding_title_prefix')}
                <span className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent ml-2">
                  {t('register_branding_title_main')}
                </span>{" "}
                {t('register_branding_title_suffix')}
              </h1>
              <p className="mt-4 text-sm md:text-base text-slate-300/80 max-w-md leading-relaxed">
                {t('register_branding_desc')}
              </p>
            </div>

            <div className="hidden md:flex items-center gap-3 text-xs text-slate-400/80">
              <div className="flex -space-x-2">
                <div className="h-7 w-7 rounded-full border border-slate-900 bg-gradient-to-br from-sky-500 to-indigo-500" />
                <div className="h-7 w-7 rounded-full border border-slate-900 bg-gradient-to-br from-emerald-400 to-cyan-500" />
                <div className="h-7 w-7 rounded-full border border-slate-900 bg-gradient-to-br from-fuchsia-500 to-rose-500" />
              </div>
              <span>{t('register_features_desc')}</span>
            </div>
          </div>

          {/* Right side – form */}
          <div className="relative animate-auth-enter-right">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-sky-500/60 via-indigo-500/40 to-fuchsia-500/40 opacity-60 blur-xl" />
            <div className="relative rounded-3xl border border-white/10 bg-black/60 backdrop-blur-2xl px-4 py-6 sm:px-6 sm:py-7 md:px-7 md:py-8 shadow-2xl shadow-sky-900/40">
              <div className="mb-6">
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight">
                  {t('register_form_title')}
                </h2>
                <p className="mt-1 text-xs md:text-sm text-slate-400">
                  {t('register_form_desc')}
                </p>
              </div>

              {success && (
                <div
                  role="status"
                  className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-200"
                >
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  <span>
                    {success === "redirecting"
                      ? t('reg_success_redirecting')
                      : success}
                  </span>
                  {success === "redirecting" && (
                    <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin ml-1" />
                  )}
                </div>
              )}

              {/* Verification UI removed as per user request */}

              {error && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2 rounded-2xl border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-xs text-red-200"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      {t('name')}
                    </label>
                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 focus-within:border-sky-400/70 focus-within:bg-white/10 transition-all">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ali"
                        disabled={formLocked}
                        className="flex-1 bg-transparent text-xs md:text-sm font-medium text-white placeholder:text-slate-500 focus:outline-none disabled:opacity-70"
                      />
                      <User className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      {t('surname')}
                    </label>
                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 focus-within:border-sky-400/70 focus-within:bg-white/10 transition-all">
                      <input
                        type="text"
                        value={surname}
                        onChange={(e) => setSurname(e.target.value)}
                        placeholder="Valiyev"
                        disabled={formLocked}
                        className="flex-1 bg-transparent text-xs md:text-sm font-medium text-white placeholder:text-slate-500 focus:outline-none disabled:opacity-70"
                      />
                      <User className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Age */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    {t('age_label')}
                  </label>
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 focus-within:border-sky-400/70 focus-within:bg-white/10 transition-all">
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="24"
                      disabled={formLocked}
                      className="flex-1 bg-transparent text-xs md:text-sm font-medium text-white placeholder:text-slate-500 focus:outline-none disabled:opacity-70"
                    />
                    <Calendar className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="pt-1 text-[10px] text-slate-400">
                    {t('age_min_hint')}
                  </p>
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    {t('phone_label')}
                  </label>
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 focus-within:border-sky-400/70 focus-within:bg-white/10 transition-all">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      disabled={formLocked}
                      className="bg-transparent text-xs md:text-sm font-semibold text-white focus:outline-none w-[70px] disabled:opacity-70"
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
                      disabled={formLocked}
                      className="flex-1 bg-transparent text-xs md:text-sm font-medium text-white placeholder:text-slate-500 focus:outline-none disabled:opacity-70"
                    />
                    <Phone className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {t('tg_code_hint')}
                  </p>
                </div>

                {/* Passwords */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                  <div className="space-y-1.5 min-w-0">
                    <label className="text-xs font-medium text-slate-300">
                    {t('password')}
                    </label>
                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 focus-within:border-sky-400/70 focus-within:bg-white/10 transition-all min-w-0">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={formLocked}
                        className="flex-1 min-w-0 bg-transparent text-xs md:text-sm font-medium text-white placeholder:text-slate-500 focus:outline-none disabled:opacity-70"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="shrink-0 p-0.5 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="pt-1 text-[10px] text-slate-400">
                      {t('password_hint')}
                    </p>
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <label className="text-xs font-medium text-slate-300">
                      {t('confirm_password')}
                    </label>
                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 focus-within:border-sky-400/70 focus-within:bg-white/10 transition-all min-w-0">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={formLocked}
                        className="flex-1 min-w-0 bg-transparent text-xs md:text-sm font-medium text-white placeholder:text-slate-500 focus:outline-none disabled:opacity-70"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="shrink-0 p-0.5 text-slate-400 hover:text-slate-200 transition-colors"
                        aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-slate-400">
                    {t('already_have_account')}
                  </p>
                  <Link
                    href="/login"
                    className="text-[11px] font-medium text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    {t('login_link')}
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={formLocked}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-900/40 transition-all hover:shadow-xl hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed min-h-[48px] touch-manipulation"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t('creating_account')}</span>
                    </>
                  ) : success ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t('redirecting')}</span>
                    </>
                  ) : (
                    t('step_1_create_account')
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

