"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";

const getDashboardPath = (role: string) => {
  if (role === "owner") return "/owner/dashboard";
  if (role === "admin") return "/admin/dashboard";
  return "/dashboard";
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // =========================================================
  // CEK SESSION YANG SUDAH TERSIMPAN
  // =========================================================
  // Supabase Auth menyimpan session di browser. Jadi user yang
  // masih login tidak perlu memasukkan email/password lagi.
  useEffect(() => {
    let mounted = true;

    const checkExistingSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (!session?.user) {
          setCheckingSession(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (!mounted) return;

        if (profileError || !profile?.role) {
          // Session ada tetapi profil/role tidak ditemukan.
          // Jangan membuat user terjebak di loading.
          setCheckingSession(false);
          return;
        }

        router.replace(getDashboardPath(profile.role));
      } catch (error) {
        console.error("CHECK SESSION ERROR:", error);

        if (mounted) {
          setCheckingSession(false);
        }
      }
    };

    checkExistingSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  // =========================================================
  // MONITOR PERUBAHAN SESSION
  // =========================================================
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setCheckingSession(false);
        return;
      }

      if (
        (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") &&
        session?.user
      ) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (profile?.role) {
          router.replace(getDashboardPath(profile.role));
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // THEME
  const [darkMode, setDarkMode] = useState(false);
  const [themeReady, setThemeReady] = useState(false);

  // =========================================================
  // LOAD THEME DARI HOMEPAGE
  // =========================================================

  useEffect(() => {
    const savedTheme = localStorage.getItem("svara-theme");

    if (savedTheme === "dark") {
      setDarkMode(true);
    } else if (savedTheme === "light") {
      setDarkMode(false);
    } else {
      const systemDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;

      setDarkMode(systemDark);
    }

    setThemeReady(true);
  }, []);

  // =========================================================
  // SIMPAN THEME
  // =========================================================

  useEffect(() => {
    if (!themeReady) return;

    localStorage.setItem(
      "svara-theme",
      darkMode ? "dark" : "light"
    );

    document.documentElement.classList.toggle(
      "dark",
      darkMode
    );
  }, [darkMode, themeReady]);

  // =========================================================
  // LOGIN
  // =========================================================

  const handleLogin = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error || !data.user) {
        setErrorMessage(
          error?.message || "Gagal masuk ke akun."
        );
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        setErrorMessage(
          "Profil pengguna tidak ditemukan."
        );

        await supabase.auth.signOut();
        return;
      }

      setCheckingSession(false);

      router.replace(getDashboardPath(profile.role));
    } catch (error) {
      console.error("LOGIN ERROR:", error);

      setErrorMessage(
        "Terjadi kesalahan saat login. Silakan coba lagi."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // TOGGLE THEME
  // =========================================================

  const toggleTheme = () => {
    setDarkMode((current) => !current);
  };

  if (checkingSession) {
    return (
      <>
        <style jsx global>{`
          html {
            scroll-behavior: smooth;
          }

          body {
            margin: 0;
            overflow-x: hidden;
          }

          * {
            box-sizing: border-box;
          }
        `}</style>

        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lg ring-1 ring-slate-200">
              <svg
                className="h-6 w-6 animate-spin text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-20"
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="opacity-90"
                  fill="currentColor"
                  d="M21 12a9 9 0 00-9-9v3a6 6 0 016 6h3z"
                />
              </svg>
            </div>

            <p className="mt-4 text-sm font-bold text-slate-700">
              Memeriksa sesi login...
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Mohon tunggu sebentar
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          overflow-x: hidden;
        }

        * {
          box-sizing: border-box;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes floating {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-12px);
          }
        }

        @keyframes pulseGlow {
          0%,
          100% {
            opacity: 0.35;
          }

          50% {
            opacity: 0.65;
          }
        }

        .login-animation {
          animation: fadeIn 0.7s
            cubic-bezier(0.16, 1, 0.3, 1);
        }

        .floating-animation {
          animation: floating 6s ease-in-out infinite;
        }

        .glow-animation {
          animation: pulseGlow 5s ease-in-out infinite;
        }

        ::selection {
          background: rgba(59, 130, 246, 0.25);
        }
      `}</style>

      <main
        className={`relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-20 transition-colors duration-500 sm:px-6 ${
          darkMode
            ? "bg-[#050816]"
            : "bg-slate-50"
        }`}
      >
        {/* =====================================================
            BACKGROUND
        ====================================================== */}

        <div className="pointer-events-none absolute inset-0 overflow-hidden">

          <div
            className={`glow-animation absolute -left-40 -top-40 h-[450px] w-[450px] rounded-full blur-3xl ${
              darkMode
                ? "bg-blue-600/20"
                : "bg-blue-400/20"
            }`}
          />

          <div
            className={`glow-animation absolute -bottom-40 -right-40 h-[450px] w-[450px] rounded-full blur-3xl ${
              darkMode
                ? "bg-purple-600/20"
                : "bg-purple-400/20"
            }`}
          />

          <div
            className={`absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${
              darkMode
                ? "bg-indigo-600/10"
                : "bg-blue-400/10"
            }`}
          />
        </div>

        {/* =====================================================
            TOP BAR
        ====================================================== */}

        <div className="absolute left-0 right-0 top-0 z-50">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">

            {/* LOGO */}

            <Link
              href="/"
              className="transition duration-300 hover:scale-105"
            >
              <Image
                src="/svara.png"
                alt="SVARA Innovation"
                width={160}
                height={50}
                priority
                className="h-8 w-auto sm:h-9"
              />
            </Link>

            {/* THEME */}

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className={`relative flex h-11 w-11 items-center justify-center rounded-full border text-lg shadow-sm backdrop-blur-xl transition-all duration-300 hover:scale-105 ${
                darkMode
                  ? "border-white/10 bg-white/5 hover:bg-white/10"
                  : "border-slate-200 bg-white/80 hover:bg-white"
              }`}
            >
              <span
                className={`absolute transition-all duration-300 ${
                  darkMode
                    ? "scale-100 rotate-0 opacity-100"
                    : "scale-0 rotate-90 opacity-0"
                }`}
              >
                🌙
              </span>

              <span
                className={`absolute transition-all duration-300 ${
                  darkMode
                    ? "scale-0 -rotate-90 opacity-0"
                    : "scale-100 rotate-0 opacity-100"
                }`}
              >
                ☀️
              </span>
            </button>
          </div>
        </div>

        {/* =====================================================
            LOGIN CARD
        ====================================================== */}

        <div
          className={`login-animation relative z-10 flex w-full max-w-5xl overflow-hidden rounded-[2rem] border transition-all duration-500 sm:rounded-[2.5rem] ${
            darkMode
              ? "border-white/10 bg-white/[0.035] shadow-[0_30px_100px_-25px_rgba(0,0,0,0.8)]"
              : "border-slate-200 bg-white/80 shadow-[0_30px_80px_-25px_rgba(15,23,42,0.18)]"
          }`}
        >

          {/* ===================================================
              LEFT SIDE
          ==================================================== */}

          <div
            className={`relative hidden w-1/2 overflow-hidden lg:flex lg:flex-col lg:items-center lg:justify-center ${
              darkMode
                ? "bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-800"
                : "bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700"
            }`}
          >
            {/* GLOW */}

            <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

            <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-purple-300/10 blur-3xl" />

            {/* CIRCLE */}

            <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />

            <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />

            {/* IMAGE */}

            <div className="floating-animation relative z-10">
              <Image
                src="/login.png"
                alt="Login Illustration"
                width={390}
                height={390}
                priority
                className="object-contain drop-shadow-2xl"
              />
            </div>

            {/* TEXT */}

            <div className="relative z-10 mt-5 px-10 text-center">

              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[9px] font-bold tracking-wider text-white backdrop-blur-xl">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                SECURE ATTENDANCE
              </div>

              <h2 className="text-3xl font-black tracking-tight text-white">
                Company Attendance
              </h2>

              <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-blue-100/80">
                Kelola absensi karyawan dengan mudah,
                cepat, dan aman dari mana saja.
              </p>
            </div>

            {/* SYSTEM STATUS */}

            <div className="absolute bottom-7 left-1/2 -translate-x-1/2">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-4 py-2 text-[9px] font-bold tracking-wider text-white/70 backdrop-blur-xl">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />

                SYSTEM ONLINE
              </div>
            </div>
          </div>

          {/* ===================================================
              RIGHT SIDE
          ==================================================== */}

          <div className="w-full p-7 sm:p-12 lg:w-1/2 lg:p-14">
            <div className="mx-auto w-full max-w-md">

              {/* MOBILE LOGO */}

              <div className="mb-8 flex justify-center lg:hidden">
                <Image
                  src="/svara.png"
                  alt="SVARA"
                  width={140}
                  height={45}
                  className="h-8 w-auto"
                />
              </div>

              {/* HEADER */}

              <div>

                <div
                  className={`mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[9px] font-black tracking-wider ${
                    darkMode
                      ? "bg-blue-500/10 text-blue-300"
                      : "bg-blue-50 text-blue-600"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  WELCOME BACK
                </div>

                <h1
                  className={`text-3xl font-black tracking-tight sm:text-4xl ${
                    darkMode
                      ? "text-white"
                      : "text-slate-950"
                  }`}
                >
                  Welcome Back 👋
                </h1>

                <p
                  className={`mt-3 text-sm leading-6 ${
                    darkMode
                      ? "text-slate-400"
                      : "text-slate-500"
                  }`}
                >
                  Silakan masuk ke akun Anda untuk
                  melanjutkan.
                </p>
              </div>

              {/* ERROR */}

              {errorMessage && (
                <div
                  className={`mt-6 flex items-start gap-3 rounded-2xl border p-4 text-sm ${
                    darkMode
                      ? "border-red-500/20 bg-red-500/10 text-red-300"
                      : "border-red-100 bg-red-50 text-red-600"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="mt-0.5 h-5 w-5 shrink-0"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>

                  <span>{errorMessage}</span>
                </div>
              )}

              {/* FORM */}

              <form
                onSubmit={handleLogin}
                className="mt-8 space-y-5"
              >

                {/* EMAIL */}

                <div>
                  <label
                    htmlFor="email"
                    className={`mb-2 block text-sm font-semibold ${
                      darkMode
                        ? "text-slate-200"
                        : "text-slate-700"
                    }`}
                  >
                    Email Address
                  </label>

                  <div className="relative">

                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-5 w-5 ${
                          darkMode
                            ? "text-slate-500"
                            : "text-slate-400"
                        }`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                    </div>

                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      placeholder="tes@company.com"
                      required
                      className={`w-full rounded-2xl border py-3.5 pl-11 pr-4 text-sm outline-none transition-all duration-300 ${
                        darkMode
                          ? "border-white/10 bg-white/[0.04] text-white placeholder:text-slate-600 hover:border-white/20 focus:border-blue-500/50 focus:bg-white/[0.07] focus:ring-4 focus:ring-blue-500/10"
                          : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      }`}
                    />
                  </div>
                </div>

                {/* PASSWORD */}

                <div>
                  <label
                    htmlFor="password"
                    className={`mb-2 block text-sm font-semibold ${
                      darkMode
                        ? "text-slate-200"
                        : "text-slate-700"
                    }`}
                  >
                    Password
                  </label>

                  <div className="relative">

                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-5 w-5 ${
                          darkMode
                            ? "text-slate-500"
                            : "text-slate-400"
                        }`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>

                    <input
                      id="password"
                      name="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                      placeholder="••••••••"
                      required
                      className={`w-full rounded-2xl border py-3.5 pl-11 pr-12 text-sm outline-none transition-all duration-300 ${
                        darkMode
                          ? "border-white/10 bg-white/[0.04] text-white placeholder:text-slate-600 hover:border-white/20 focus:border-blue-500/50 focus:bg-white/[0.07] focus:ring-4 focus:ring-blue-500/10"
                          : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((prev) => !prev)
                      }
                      aria-label={
                        showPassword
                          ? "Sembunyikan password"
                          : "Tampilkan password"
                      }
                      className={`absolute inset-y-0 right-0 flex items-center pr-4 text-lg transition-colors ${
                        darkMode
                          ? "text-slate-500 hover:text-blue-400"
                          : "text-slate-400 hover:text-blue-600"
                      }`}
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                {/* OPTIONS */}

                <div className="flex items-center justify-between pt-1">

                  <label
                    className={`flex cursor-pointer items-center gap-2 text-xs ${
                      darkMode
                        ? "text-slate-400"
                        : "text-slate-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked
                      readOnly
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />

                    Tetap masuk di perangkat ini
                  </label>

                  <span
                    className={`text-right text-[10px] leading-4 ${
                      darkMode ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                   
                  </span>

                  <Link
                    href="#"
                    className={`text-xs font-semibold transition-colors ${
                      darkMode
                        ? "text-blue-400 hover:text-blue-300"
                        : "text-blue-600 hover:text-blue-500"
                    }`}
                  >
                    Forgot Password?
                  </Link>
                </div>

                {/* LOGIN BUTTON */}

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-4 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-600/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-blue-600/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="absolute inset-0 -translate-x-full bg-white/15 transition-transform duration-500 group-hover:translate-x-0" />

                  <span className="relative z-10 flex items-center gap-2">

                    {loading ? (
                      <>
                        <svg
                          className="h-5 w-5 animate-spin"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />

                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>

                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign in

                        <span className="transition-transform duration-300 group-hover:translate-x-1">
                          →
                        </span>
                      </>
                    )}
                  </span>
                </button>
              </form>

              {/* DIVIDER */}

              <div className="my-7 flex items-center gap-3">

                <div
                  className={`h-px flex-1 ${
                    darkMode
                      ? "bg-white/10"
                      : "bg-slate-200"
                  }`}
                />

                <span
                  className={`text-[9px] font-bold uppercase tracking-wider ${
                    darkMode
                      ? "text-slate-600"
                      : "text-slate-400"
                  }`}
                >
                  Secure Access
                </span>

                <div
                  className={`h-px flex-1 ${
                    darkMode
                      ? "bg-white/10"
                      : "bg-slate-200"
                  }`}
                />
              </div>

              {/* BACK HOME */}

              <div className="text-center">
                <Link
                  href="/"
                  className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${
                    darkMode
                      ? "text-slate-500 hover:text-blue-400"
                      : "text-slate-500 hover:text-blue-600"
                  }`}
                >
                  ← Back to Homepage
                </Link>
              </div>

              {/* COPYRIGHT */}

              <p
                className={`mt-7 text-center text-[9px] ${
                  darkMode
                    ? "text-slate-700"
                    : "text-slate-400"
                }`}
              >
                © {new Date().getFullYear()} SVARA
                INNOVATION • Secure Attendance
              </p>

            </div>
          </div>
        </div>
      </main>
    </>
  );
}