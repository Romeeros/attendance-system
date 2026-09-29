"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const fitur = [
  {
    icon: "📷",
    title: "Face Verification",
    desc: "Verifikasi wajah untuk memastikan identitas pengguna dengan aman.",
    tag: "AI POWERED",
  },
  {
    icon: "📍",
    title: "Geo-Tagging GPS",
    desc: "Pastikan absensi dilakukan pada lokasi yang telah ditentukan.",
    tag: "LOCATION",
  },
  {
    icon: "⚡",
    title: "Smart Approval",
    desc: "Kelola izin, cuti, dan lembur dengan persetujuan digital.",
    tag: "INSTANT",
  },
  {
    icon: "📊",
    title: "Live Dashboard",
    desc: "Pantau data kehadiran melalui dashboard secara real-time.",
    tag: "REALTIME",
  },
];

const steps = [
  {
    number: "01",
    icon: "🔐",
    title: "Login Akun",
    desc: "Masuk menggunakan akun yang sudah terdaftar.",
  },
  {
    number: "02",
    icon: "📷",
    title: "Verifikasi Wajah",
    desc: "Sistem melakukan validasi wajah secara otomatis.",
  },
  {
    number: "03",
    icon: "📍",
    title: "Validasi GPS",
    desc: "Lokasi perangkat diverifikasi oleh sistem.",
  },
  {
    number: "04",
    icon: "✓",
    title: "Berhasil",
    desc: "Data kehadiran tersimpan aman di server.",
  },
];

export default function Home() {
  const [currentTime, setCurrentTime] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // =========================================
  // YOYO STATE
  // =========================================
  const heroRef = useRef<HTMLDivElement | null>(null);

  const dragRef = useRef({
    active: false,
    startY: 0,
    currentY: 0,
  });

  const [heroY, setHeroY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // =========================================
  // LOAD THEME
  // =========================================
  useEffect(() => {
    const savedTheme = localStorage.getItem("svara-theme");

    if (savedTheme === "dark") {
      setDarkMode(true);
    } else if (savedTheme === "light") {
      setDarkMode(false);
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;

      setDarkMode(prefersDark);
    }
  }, []);

  // =========================================
  // SAVE THEME
  // =========================================
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);

    localStorage.setItem(
      "svara-theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  // =========================================
  // REALTIME CLOCK
  // =========================================
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };

    updateTime();

    const timer = setInterval(updateTime, 1000);

    return () => clearInterval(timer);
  }, []);

  // =========================================
  // NAVBAR SCROLL
  // =========================================
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () =>
      window.removeEventListener("scroll", handleScroll);
  }, []);

  // =========================================
  // YOYO - DRAG START
  // =========================================
  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    if (!heroRef.current) return;

    e.preventDefault();

    heroRef.current.setPointerCapture(e.pointerId);

    dragRef.current.active = true;
    dragRef.current.startY = e.clientY;
    dragRef.current.currentY = 0;

    setIsDragging(true);
  };

  // =========================================
  // YOYO - DRAG MOVE
  // =========================================
  const handlePointerMove = (
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    if (!dragRef.current.active) return;

    const rawDistance =
      e.clientY - dragRef.current.startY;

    /*
      Maksimal tarikan sekitar 170px.
    */
    const maxDistance = 170;

    const limitedDistance = Math.max(
      -maxDistance,
      Math.min(maxDistance, rawDistance)
    );

    /*
      Efek karet / resistance.
    */
    const resistance =
      limitedDistance * 0.72;

    dragRef.current.currentY = resistance;

    setHeroY(resistance);
  };

  // =========================================
  // YOYO - RELEASE
  // =========================================
  const releaseYoyo = () => {
    if (!dragRef.current.active) return;

    dragRef.current.active = false;

    setIsDragging(false);

    /*
      Kembali ke posisi awal.
      CSS spring akan membuat efek pantulan.
    */
    setHeroY(0);
  };

  // =========================================
  // YOYO - POINTER UP
  // =========================================
  const handlePointerUp = (
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    if (heroRef.current) {
      try {
        heroRef.current.releasePointerCapture(
          e.pointerId
        );
      } catch {
        // Pointer capture mungkin sudah dilepas
      }
    }

    releaseYoyo();
  };

  // =========================================
  // YOYO - POINTER CANCEL
  // =========================================
  const handlePointerCancel = () => {
    releaseYoyo();
  };

  // =========================================
  // YOYO ROPE POSITION
  // =========================================

  /*
    Posisi awal atas kartu gambar:
    128px

    Posisi anchor:
    36px

    Jadi panjang tali awal:
    128 - 36 = 92px

    Saat gambar bergerak:
    heroY akan mengubah posisi kartu.
  */

  const imageTop = 128 + heroY;
  const ropeTop = Math.min(36, imageTop);
  const ropeHeight = Math.max(
    4,
    Math.abs(imageTop - 36)
  );

  return (
    <main
      className={`min-h-screen overflow-x-hidden transition-colors duration-500 ${
        darkMode
          ? "bg-[#050816] text-white"
          : "bg-[#f8fafc] text-slate-900"
      }`}
    >
      {/* =========================================
          BACKGROUND GLOW
      ========================================== */}

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className={`absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full blur-3xl transition-opacity duration-500 ${
            darkMode
              ? "bg-blue-600/20"
              : "bg-blue-400/20"
          }`}
        />

        <div
          className={`absolute -right-40 top-[25%] h-[500px] w-[500px] rounded-full blur-3xl transition-opacity duration-500 ${
            darkMode
              ? "bg-purple-600/20"
              : "bg-purple-400/15"
          }`}
        />

        <div
          className={`absolute bottom-[-200px] left-[35%] h-[450px] w-[450px] rounded-full blur-3xl ${
            darkMode
              ? "bg-cyan-500/10"
              : "bg-cyan-400/10"
          }`}
        />
      </div>

      {/* =========================================
          NAVBAR
      ========================================== */}

      <nav
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? darkMode
              ? "border-b border-white/10 bg-[#050816]/75 shadow-2xl shadow-black/20 backdrop-blur-2xl"
              : "border-b border-slate-200/70 bg-white/75 shadow-lg shadow-slate-200/20 backdrop-blur-2xl"
            : "border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
          {/* LOGO */}

          <Link
            href="/"
            className="group flex items-center"
          >
            <Image
              src="/svara.png"
              alt="SVARA Innovation Logo"
              width={180}
              height={55}
              priority
              className="h-8 w-auto transition duration-300 group-hover:scale-105 sm:h-10"
            />
          </Link>

          {/* RIGHT */}

          <div className="flex items-center gap-2 sm:gap-3">
            {/* CLOCK */}

            <div
              className={`hidden items-center gap-2 rounded-full border px-3 py-2 backdrop-blur-xl sm:flex ${
                darkMode
                  ? "border-white/10 bg-white/5"
                  : "border-slate-200 bg-white/70"
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />

                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>

              <span
                className={`font-mono text-xs font-bold ${
                  darkMode
                    ? "text-blue-300"
                    : "text-blue-700"
                }`}
              >
                {currentTime || "--:--:--"}
              </span>

              <span
                className={`text-[9px] font-bold ${
                  darkMode
                    ? "text-slate-500"
                    : "text-slate-400"
                }`}
              >
                WIB
              </span>
            </div>

            {/* THEME TOGGLE */}

            <button
              type="button"
              onClick={() =>
                setDarkMode((prev) => !prev)
              }
              aria-label="Toggle theme"
              className={`group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border transition-all duration-300 hover:scale-105 ${
                darkMode
                  ? "border-white/10 bg-white/5 hover:bg-white/10"
                  : "border-slate-200 bg-white/80 hover:bg-slate-50"
              }`}
            >
              <span
                className={`absolute transition-all duration-500 ${
                  darkMode
                    ? "rotate-0 scale-100 opacity-100"
                    : "rotate-90 scale-0 opacity-0"
                }`}
              >
                🌙
              </span>

              <span
                className={`absolute transition-all duration-500 ${
                  darkMode
                    ? "-rotate-90 scale-0 opacity-0"
                    : "rotate-0 scale-100 opacity-100"
                }`}
              >
                ☀️
              </span>
            </button>

            {/* LOGIN */}

            <Link
              href="/login"
              className="group relative overflow-hidden rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-blue-600/40 sm:px-6 sm:py-2.5 sm:text-sm"
            >
              <span className="relative z-10">
                Login
              </span>

              <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-500 group-hover:translate-x-0" />
            </Link>
          </div>
        </div>
      </nav>

      {/* =========================================
          HERO
      ========================================== */}

      <section className="relative px-4 pb-20 pt-28 sm:px-6 sm:pb-24 sm:pt-36 lg:px-8 lg:pb-32 lg:pt-44">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">

            {/* =====================================
                HERO TEXT
            ====================================== */}

            <div className="text-center lg:text-left">
              {/* BADGE */}

              <div
                className={`mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-bold backdrop-blur-xl sm:text-xs ${
                  darkMode
                    ? "border-blue-400/20 bg-blue-500/10 text-blue-300"
                    : "border-blue-100 bg-blue-50/80 text-blue-700"
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />

                  <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
                </span>

                SISTEM ABSENSI CLOUD
              </div>

              {/* TITLE */}

              <h1
                className={`text-[2.8rem] font-black leading-[1.03] tracking-tight sm:text-6xl lg:text-7xl ${
                  darkMode
                    ? "text-white"
                    : "text-slate-950"
                }`}
              >
                Pantau Kehadiran
                <br />

                <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
                  Lebih Cerdas.
                </span>

                <br />

                <span
                  className={
                    darkMode
                      ? "text-slate-300"
                      : "text-slate-700"
                  }
                >
                  Lebih Cepat.
                </span>
              </h1>

              {/* DESCRIPTION */}

              <p
                className={`mx-auto mt-6 max-w-xl text-sm leading-7 sm:text-lg lg:mx-0 ${
                  darkMode
                    ? "text-slate-400"
                    : "text-slate-500"
                }`}
              >
                Tingkatkan disiplin dan produktivitas
                dengan verifikasi wajah, GPS,
                approval, dan monitoring dalam satu
                platform.
              </p>

              {/* BUTTON */}

              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link
                  href="/login"
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-7 py-4 text-sm font-bold text-white shadow-xl shadow-blue-600/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-600/30"
                >
                  <span className="relative z-10">
                    Mulai Sekarang →
                  </span>

                  <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-500 group-hover:translate-x-0" />
                </Link>

                <a
                  href="#fitur"
                  className={`rounded-2xl border px-7 py-4 text-center text-sm font-bold backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 ${
                    darkMode
                      ? "border-white/10 bg-white/5 text-slate-200 hover:border-blue-400/30 hover:bg-white/10 hover:text-blue-300"
                      : "border-slate-200 bg-white/80 text-slate-700 hover:border-blue-200 hover:text-blue-600"
                  }`}
                >
                  Lihat Fitur ↓
                </a>
              </div>

              {/* STATS */}

              <div className="mx-auto mt-9 grid max-w-lg grid-cols-3 gap-2 lg:mx-0 lg:gap-3">
                <div className="stat-card">
                  <strong>99.9%</strong>
                  <span>Accuracy</span>
                </div>

                <div className="stat-card">
                  <strong>LIVE</strong>
                  <span>Monitoring</span>
                </div>

                <div className="stat-card">
                  <strong>CLOUD</strong>
                  <span>System</span>
                </div>
              </div>
            </div>

            {/* =========================================
                HERO IMAGE + YOYO
            ========================================== */}

            <div className="mx-auto w-full max-w-2xl">
              <div className="relative min-h-[560px]">

                {/* MAIN GLOW */}

                <div
                  className={`pointer-events-none absolute left-1/2 top-28 h-[360px] w-[360px] -translate-x-1/2 rounded-full blur-3xl transition-all duration-500 sm:h-[430px] sm:w-[430px] ${
                    isDragging
                      ? "scale-125 opacity-80"
                      : "scale-100 opacity-100"
                  } ${
                    darkMode
                      ? "bg-blue-600/25"
                      : "bg-blue-400/20"
                  }`}
                />

                {/* =====================================
                    YOYO ANCHOR
                ====================================== */}

                <div
                  className={`pointer-events-none absolute left-1/2 top-5 z-30 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border shadow-xl transition-all duration-300 ${
                    isDragging
                      ? "scale-125 shadow-blue-500/40"
                      : "scale-100"
                  } ${
                    darkMode
                      ? "border-blue-300/30 bg-[#111936]"
                      : "border-blue-200 bg-white"
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      darkMode
                        ? "bg-blue-400"
                        : "bg-blue-500"
                    }`}
                  />
                </div>

                {/* =====================================
                    YOYO ROPE
                    TALI SELALU TERHUBUNG KE GAMBAR
                ====================================== */}

                <div
                  className={`pointer-events-none absolute left-1/2 z-0 w-[3px] -translate-x-1/2 rounded-full transition-[top,height,opacity] duration-200 ${
                    isDragging
                      ? "opacity-100"
                      : "opacity-75"
                  } ${
                    darkMode
                      ? "bg-gradient-to-b from-blue-400 via-indigo-400 to-purple-500"
                      : "bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500"
                  }`}
                  style={{
                    top: `${ropeTop}px`,
                    height: `${ropeHeight}px`,
                  }}
                />

                {/* YOYO DECORATIVE RING */}

                <div
                  className={`pointer-events-none absolute left-1/2 top-[28px] z-20 h-12 w-12 -translate-x-1/2 rounded-full border transition-all duration-300 ${
                    isDragging
                      ? "scale-125 opacity-100"
                      : "scale-100 opacity-70"
                  } ${
                    darkMode
                      ? "border-blue-400/20"
                      : "border-blue-500/15"
                  }`}
                />

                {/* =====================================
                    DRAG AREA
                    GAMBAR LEBIH KECIL
                ====================================== */}

                <div
                  ref={heroRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerCancel}
                  style={{
                    transform: `translateY(${heroY}px)`,
                  }}
                  className={`relative z-10 mx-auto w-full max-w-[470px] select-none pt-[128px] touch-none ${
                    isDragging
                      ? "cursor-grabbing"
                      : "cursor-grab"
                  } ${
                    !isDragging
                      ? "hero-spring"
                      : ""
                  }`}
                >
                  {/* IMAGE CARD */}

                  <div
                    className={`group relative overflow-hidden rounded-[2rem] border p-2.5 backdrop-blur-xl transition-all duration-500 sm:p-3 ${
                      isDragging
                        ? "scale-[1.025] shadow-[0_35px_80px_-20px_rgba(37,99,235,0.45)]"
                        : "hover:-translate-y-2"
                    } ${
                      darkMode
                        ? "border-white/10 bg-white/5 shadow-2xl shadow-blue-900/20"
                        : "border-slate-200/80 bg-white/80 shadow-2xl shadow-slate-300/40"
                    }`}
                  >
                    <Image
                      src="/hero.png"
                      alt="Sistem Absensi Dashboard"
                      width={650}
                      height={650}
                      priority
                      draggable={false}
                      className={`h-auto w-full rounded-[1.5rem] object-contain transition duration-500 ${
                        isDragging
                          ? "scale-[1.015]"
                          : "group-hover:scale-[1.02]"
                      }`}
                    />

                    {/* SHINE */}

                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />

                    {/* DRAG LABEL */}

                    <div
                      className={`pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border px-3 py-1.5 text-[9px] font-black tracking-wider backdrop-blur-xl transition-all duration-300 ${
                        isDragging
                          ? "translate-y-1 opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      } ${
                        darkMode
                          ? "border-white/10 bg-[#0b1225]/80 text-blue-300"
                          : "border-slate-200 bg-white/85 text-blue-600"
                      }`}
                    >
                      {isDragging
                        ? "RELEASE ME 🪀"
                        : "DRAG ME ↓"}
                    </div>

                    {/* IMAGE BOTTOM GLOW */}

                    <div
                      className={`pointer-events-none absolute -bottom-10 left-1/2 h-20 w-3/4 -translate-x-1/2 rounded-full blur-2xl transition-all duration-500 ${
                        isDragging
                          ? "bg-blue-500/30 opacity-100"
                          : "bg-blue-500/10 opacity-0 group-hover:opacity-100"
                      }`}
                    />
                  </div>
                </div>

                {/* =====================================
                    ATTENDANCE BADGE
                ====================================== */}

                <div
                  className={`absolute left-0 top-[220px] z-20 rounded-2xl border px-3 py-2.5 shadow-xl backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1 sm:left-2 sm:px-4 sm:py-3 ${
                    darkMode
                      ? "border-white/10 bg-[#10172a]/90"
                      : "border-slate-200 bg-white/90"
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-sm text-emerald-500 sm:h-10 sm:w-10">
                      ✓
                    </div>

                    <div>
                      <p
                        className={`text-[9px] font-black sm:text-xs ${
                          darkMode
                            ? "text-white"
                            : "text-slate-900"
                        }`}
                      >
                        ATTENDANCE
                      </p>

                      <p className="text-[8px] text-emerald-500 sm:text-[10px]">
                        Successfully Recorded
                      </p>
                    </div>
                  </div>
                </div>

                {/* =====================================
                    GPS BADGE
                ====================================== */}

                <div
                  className={`absolute right-0 top-[390px] z-20 rounded-2xl border px-3 py-2.5 shadow-xl backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1 sm:right-2 sm:px-4 sm:py-3 ${
                    darkMode
                      ? "border-white/10 bg-[#10172a]/90"
                      : "border-slate-200 bg-white/90"
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-lg">
                      📍
                    </span>

                    <div>
                      <p
                        className={`text-[8px] sm:text-[10px] ${
                          darkMode
                            ? "text-slate-500"
                            : "text-slate-400"
                        }`}
                      >
                        GPS STATUS
                      </p>

                      <p
                        className={`text-[9px] font-bold sm:text-xs ${
                          darkMode
                            ? "text-white"
                            : "text-slate-900"
                        }`}
                      >
                        Location Verified
                      </p>
                    </div>
                  </div>
                </div>

                {/* =====================================
                    YOYO HINT
                ====================================== */}

                <div
                  className={`pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 text-center transition-all duration-500 ${
                    isDragging
                      ? "translate-y-2 opacity-100"
                      : "opacity-60"
                  }`}
                >
                  <div
                    className={`flex items-center gap-2 text-[9px] font-bold tracking-widest ${
                      darkMode
                        ? "text-slate-500"
                        : "text-slate-400"
                    }`}
                  >
                    <span className="animate-bounce">
                      ↓
                    </span>

                    DRAG & RELEASE

                    <span className="animate-bounce">
                      ↓
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================
          FEATURES
      ========================================== */}

      <section
        id="fitur"
        className={`relative px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28 ${
          darkMode
            ? "bg-[#080c1a]"
            : "bg-white"
        }`}
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
            <span className="text-[10px] font-black tracking-[0.25em] text-blue-500">
              POWERFUL FEATURES
            </span>

            <h2
              className={`mt-3 text-3xl font-black tracking-tight sm:text-5xl ${
                darkMode
                  ? "text-white"
                  : "text-slate-950"
              }`}
            >
              Teknologi masa depan
              <br />

              <span
                className={
                  darkMode
                    ? "text-slate-500"
                    : "text-slate-400"
                }
              >
                untuk absensi modern.
              </span>
            </h2>

            <p
              className={`mx-auto mt-4 max-w-xl text-sm leading-6 ${
                darkMode
                  ? "text-slate-400"
                  : "text-slate-500"
              }`}
            >
              Semua fitur penting tersedia dalam satu
              sistem yang cepat, aman, dan mudah
              digunakan.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {fitur.map((item) => (
              <div
                key={item.title}
                className={`group relative overflow-hidden rounded-3xl border p-6 transition-all duration-500 hover:-translate-y-2 ${
                  darkMode
                    ? "border-white/10 bg-white/[0.035] hover:border-blue-500/30 hover:bg-white/[0.06] hover:shadow-2xl hover:shadow-blue-900/10"
                    : "border-slate-200 bg-white shadow-sm hover:border-blue-100 hover:shadow-2xl hover:shadow-blue-100/40"
                }`}
              >
                <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl opacity-0 transition duration-500 group-hover:opacity-100" />

                <div className="relative">
                  <div className="mb-6 flex items-center justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl transition duration-300 group-hover:scale-110 ${
                        darkMode
                          ? "bg-blue-500/10"
                          : "bg-blue-50"
                      }`}
                    >
                      {item.icon}
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[8px] font-black ${
                        darkMode
                          ? "bg-blue-500/10 text-blue-300"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {item.tag}
                    </span>
                  </div>

                  <h3
                    className={`text-lg font-black ${
                      darkMode
                        ? "text-white"
                        : "text-slate-900"
                    }`}
                  >
                    {item.title}
                  </h3>

                  <p
                    className={`mt-2 text-sm leading-6 ${
                      darkMode
                        ? "text-slate-400"
                        : "text-slate-500"
                    }`}
                  >
                    {item.desc}
                  </p>

                  <div className="mt-6 h-1 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 group-hover:w-14" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================
          HOW IT WORKS
      ========================================== */}

      <section
        className={`relative overflow-hidden px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28 ${
          darkMode
            ? "bg-[#050816]"
            : "bg-slate-950"
        }`}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[20%] top-0 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />

          <div className="absolute bottom-0 right-[10%] h-64 w-64 rounded-full bg-purple-600/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <div className="mb-12 text-center sm:mb-16">
            <span className="text-[10px] font-black tracking-[0.25em] text-blue-400">
              HOW IT WORKS
            </span>

            <h2 className="mt-3 text-3xl font-black text-white sm:text-5xl">
              Semudah{" "}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                1, 2, 3, 4.
              </span>
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-400">
              Proses absensi dibuat sederhana agar
              pengguna dapat mencatat kehadiran dalam
              hitungan detik.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div
                key={step.number}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-6 backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:border-blue-500/30 hover:bg-white/[0.06]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-5xl font-black text-white/[0.07]">
                    {step.number}
                  </span>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-lg transition duration-300 group-hover:scale-110 group-hover:bg-blue-500/10">
                    {step.icon}
                  </div>
                </div>

                <h3 className="mt-6 text-lg font-black text-white">
                  {step.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {step.desc}
                </p>

                <div className="mt-6 h-1 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 group-hover:w-14" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================
          CTA
      ========================================== */}

      <section
        className={`px-4 py-20 sm:px-6 sm:py-24 lg:px-8 ${
          darkMode
            ? "bg-[#080c1a]"
            : "bg-white"
        }`}
      >
        <div className="mx-auto max-w-5xl">
          <div className="relative overflow-hidden rounded-[2rem] border border-blue-500/20 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 px-6 py-12 text-center shadow-2xl shadow-blue-600/20 sm:px-10 sm:py-16">
            <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />

            <div className="absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-black/10 blur-3xl" />

            <div className="relative">
              <span className="text-[10px] font-black tracking-[0.25em] text-blue-100">
                READY TO START?
              </span>

              <h2 className="mt-4 text-3xl font-black text-white sm:text-5xl">
                Kelola absensi lebih
                <br />
                mudah bersama SVARA.
              </h2>

              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-blue-100">
                Sistem absensi modern untuk membantu
                meningkatkan efisiensi dan produktivitas.
              </p>

              <Link
                href="/login"
                className="mt-8 inline-flex rounded-2xl bg-white px-7 py-4 text-sm font-black text-blue-700 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
              >
                Mulai Sekarang →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================
          FOOTER
      ========================================== */}

      <footer
        className={`border-t px-4 py-10 ${
          darkMode
            ? "border-white/10 bg-[#03050c]"
            : "border-slate-200 bg-slate-50"
        }`}
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 text-center">
          <div
            className={`rounded-xl px-3 py-2 ${
              darkMode
                ? "bg-white"
                : "bg-white shadow-sm"
            }`}
          >
            <Image
              src="/svara.png"
              alt="SVARA Innovation Logo"
              width={140}
              height={40}
              className="h-7 w-auto"
            />
          </div>

          <p
            className={`text-xs ${
              darkMode
                ? "text-slate-600"
                : "text-slate-500"
            }`}
          >
            © {new Date().getFullYear()} SVARA
            INNOVATION. Hak Cipta Dilindungi.
          </p>

          <p
            className={`text-[10px] ${
              darkMode
                ? "text-slate-700"
                : "text-slate-400"
            }`}
          >
            Smart Attendance • Cloud • Realtime
          </p>
        </div>
      </footer>

      {/* =========================================
          GLOBAL CSS
      ========================================== */}

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

        ::selection {
          background: rgba(59, 130, 246, 0.25);
        }

        /* =========================================
           YOYO SPRING
        ========================================== */

        .hero-spring {
          transition:
            transform 900ms
              cubic-bezier(0.16, 1.45, 0.35, 1),
            filter 500ms ease;
        }

        .hero-spring:hover {
          filter: drop-shadow(
            0 20px 35px rgba(59, 130, 246, 0.08)
          );
        }

        /* =========================================
           STAT CARD
        ========================================== */

        .stat-card {
          border: 1px solid
            ${darkMode
              ? "rgba(255,255,255,0.08)"
              : "#e2e8f0"};

          background:
            ${darkMode
              ? "rgba(255,255,255,0.035)"
              : "rgba(255,255,255,0.8)"};

          backdrop-filter: blur(16px);
          border-radius: 16px;
          padding: 13px 8px;
          text-align: center;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-3px);
          border-color: rgba(59, 130, 246, 0.3);

          box-shadow:
            0 15px 35px
            rgba(37, 99, 235, 0.08);
        }

        .stat-card strong {
          display: block;
          font-size: 15px;
          font-weight: 900;

          color:
            ${darkMode
              ? "#ffffff"
              : "#0f172a"};
        }

        .stat-card span {
          display: block;
          margin-top: 3px;
          font-size: 9px;

          color:
            ${darkMode
              ? "#64748b"
              : "#94a3b8"};
        }

        /* =========================================
           RESPONSIVE
        ========================================== */

        @media (max-width: 1024px) {
          .hero-spring {
            transition:
              transform 800ms
                cubic-bezier(0.16, 1.45, 0.35, 1),
              filter 400ms ease;
          }
        }

        @media (max-width: 640px) {
          .stat-card {
            padding: 11px 5px;
            border-radius: 13px;
          }

          .stat-card strong {
            font-size: 13px;
          }

          .stat-card span {
            font-size: 8px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }

          *,
          *::before,
          *::after {
            transition-duration: 0.01ms !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
    </main>
  );
}