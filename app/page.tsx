"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

const fitur = [
  {
    icon: "📷",
    title: "Face Verification",
    desc: "Verifikasi wajah secara real-time untuk memastikan identitas pengguna dengan lebih aman.",
    tag: "AI POWERED",
  },
  {
    icon: "📍",
    title: "Geo-Tagging GPS",
    desc: "Pastikan absensi dilakukan pada lokasi yang telah ditentukan oleh sistem.",
    tag: "LOCATION",
  },
  {
    icon: "⚡",
    title: "Smart Approval",
    desc: "Kelola izin, cuti, dan lembur dengan sistem persetujuan digital yang cepat.",
    tag: "INSTANT",
  },
  {
    icon: "📊",
    title: "Live Dashboard",
    desc: "Pantau data kehadiran secara langsung melalui dashboard yang informatif.",
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
    desc: "Lokasi perangkat diverifikasi secara real-time.",
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
  const [showPopup, setShowPopup] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });

  /* =====================================================
     REALTIME CLOCK
  ===================================================== */

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      setCurrentTime(
        now.toLocaleTimeString("id-ID", {
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

  /* =====================================================
     NAVBAR SCROLL
  ===================================================== */

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* =====================================================
     MOUSE GLOW
  ===================================================== */

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({
        x: (event.clientX / window.innerWidth) * 100,
        y: (event.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  /* =====================================================
     WELCOME POPUP
  ===================================================== */

  useEffect(() => {
    const popupAlreadyShown = sessionStorage.getItem("svara-popup");

    if (!popupAlreadyShown) {
      const timer = setTimeout(() => {
        setShowPopup(true);
        sessionStorage.setItem("svara-popup", "true");
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, []);

  /* =====================================================
     NOTIFICATION
  ===================================================== */

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowNotification(true);
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  /* =====================================================
     SCROLL REVEAL
  ===================================================== */

  useEffect(() => {
    const elements = document.querySelectorAll(".reveal");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("show");
          }
        });
      },
      {
        threshold: 0.1,
      }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#f7f9ff] text-slate-900">

      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">

        <div
          className="mouse-glow"
          style={{
            left: `${mousePosition.x}%`,
            top: `${mousePosition.y}%`,
          }}
        />

        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />

        <div className="dot-grid" />

        {Array.from({ length: 20 }).map((_, index) => (
          <span
            key={index}
            className="particle"
            style={{
              left: `${(index * 29) % 100}%`,
              top: `${(index * 41) % 100}%`,
              animationDelay: `${index * 0.35}s`,
            }}
          />
        ))}
      </div>

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <nav
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "border-b border-white/60 bg-white/75 py-2.5 shadow-xl shadow-blue-900/10 backdrop-blur-2xl"
            : "bg-transparent py-4 sm:py-5"
        }`}
      >

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">

          {/* LOGO */}

          <Link
            href="/"
            className="shrink-0 transition duration-300 hover:scale-105"
          >
            <Image
              src="/svara.png"
              alt="SVARA Innovation Logo"
              width={200}
              height={60}
              priority
              className="h-8 w-auto object-contain sm:h-10 md:h-11"
            />
          </Link>

          {/* RIGHT NAV */}

          <div className="flex items-center gap-1.5 sm:gap-3">

            {/* =================================================
                JAM
                TETAP MUNCUL DI HP / TABLET / IOS
            ================================================= */}

            <div className="clock-box flex shrink-0 items-center gap-1.5 rounded-full border border-blue-100 bg-white/85 px-2.5 py-1.5 shadow-lg shadow-blue-900/5 backdrop-blur-xl sm:gap-2.5 sm:px-4 sm:py-2">

              <span className="relative flex h-2 w-2 shrink-0 sm:h-2.5 sm:w-2.5">

                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />

                <span className="relative inline-flex h-full w-full rounded-full bg-emerald-500" />

              </span>

              {/* HP */}
              <span className="font-mono text-[10px] font-black text-blue-700 sm:hidden">
                {currentTime ? currentTime.slice(0, 5) : "--:--"}
              </span>

              {/* TABLET / DESKTOP */}
              <span className="hidden font-mono text-xs font-black tracking-wider text-blue-700 sm:inline">
                {currentTime || "--:--:--"}
              </span>

              <span className="hidden text-[9px] font-bold text-slate-400 sm:inline">
                WIB
              </span>

            </div>

            {/* LOGIN */}

            <Link
              href="/login"
              className="login-button group relative shrink-0 overflow-hidden rounded-full bg-slate-950 px-4 py-2 text-[11px] font-black text-white shadow-xl sm:px-7 sm:py-2.5 sm:text-sm"
            >

              <span className="relative z-10">
                Login
              </span>

              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 transition-transform duration-500 group-hover:translate-x-0" />

            </Link>

          </div>

        </div>
      </nav>

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="relative px-4 pb-20 pt-32 sm:px-6 sm:pt-40 lg:px-8 lg:pb-32 lg:pt-48">

        <div className="mx-auto max-w-7xl">

          <div className="grid items-center gap-14 lg:grid-cols-[1fr_1fr] lg:gap-10">

            {/* HERO TEXT */}

            <div className="reveal text-center lg:text-left">

              {/* Badge */}

              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/80 px-3 py-2 text-[10px] font-black text-blue-700 shadow-lg backdrop-blur-xl sm:px-4 sm:text-xs">

                <span className="relative flex h-2 w-2">

                  <span className="absolute h-full w-full animate-ping rounded-full bg-blue-400" />

                  <span className="relative h-full w-full rounded-full bg-blue-600" />

                </span>

                SISTEM ABSENSI CLOUD

                <span className="animate-pulse">
                  ✦
                </span>

              </div>

              {/* TITLE */}

              <h1 className="text-[2.8rem] font-black leading-[1] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-7xl">

                Pantau Kehadiran

                <br />

                <span className="gradient-text">
                  Lebih Cerdas.
                </span>

                <br />

                Lebih Cepat.

              </h1>

              <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-slate-500 sm:text-lg lg:mx-0">

                Tingkatkan disiplin dan produktivitas dengan
                verifikasi wajah, GPS presisi, approval,
                dan monitoring real-time dalam satu platform.

              </p>

              {/* BUTTONS */}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">

                <Link
                  href="/login"
                  className="main-button group relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-8 py-4 text-sm font-black text-white shadow-xl shadow-blue-600/30"
                >

                  <span className="relative z-10">
                    Mulai Sekarang
                    <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </span>

                  <span className="shine-effect" />

                </Link>

                <a
                  href="#fitur"
                  className="rounded-2xl border border-slate-200 bg-white/80 px-8 py-4 text-center text-sm font-black text-slate-700 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                >
                  Lihat Fitur
                  <span className="ml-2">
                    ↓
                  </span>
                </a>

              </div>

              {/* STATS */}

              <div className="mx-auto mt-9 grid max-w-lg grid-cols-3 gap-2 lg:mx-0 lg:gap-4">

                <div className="stat-card">
                  <strong>
                    99.9%
                  </strong>
                  <span>
                    Accuracy
                  </span>
                </div>

                <div className="stat-card">
                  <strong>
                    LIVE
                  </strong>
                  <span>
                    Monitoring
                  </span>
                </div>

                <div className="stat-card">
                  <strong>
                    CLOUD
                  </strong>
                  <span>
                    System
                  </span>
                </div>

              </div>

            </div>

            {/* =================================================
                HERO IMAGE
            ================================================= */}

            <div className="reveal relative mx-auto w-full max-w-[560px]">

              {/* BIG GLOW */}

              <div className="hero-glow" />

              {/* FLOATING ATTENDANCE */}

              <div className="floating-card attendance-card">

                <div className="flex items-center gap-2.5 sm:gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-sm sm:h-11 sm:w-11 sm:text-lg">
                    ✓
                  </div>

                  <div>

                    <p className="text-[9px] font-black text-slate-900 sm:text-xs">
                      ATTENDANCE
                    </p>

                    <p className="text-[8px] text-emerald-600 sm:text-[10px]">
                      Successfully Recorded
                    </p>

                  </div>

                </div>

              </div>

              {/* MAIN DASHBOARD */}

              <div className="dashboard-wrapper">

                <div className="dashboard-glow" />

                <div className="dashboard-card group">

                  {/* Shine */}

                  <div className="dashboard-shine" />

                  <div className="overflow-hidden rounded-[1.6rem] bg-white sm:rounded-[2rem]">

                    <Image
                      src="/hero.png"
                      alt="Sistem Absensi Dashboard"
                      width={650}
                      height={650}
                      priority
                      className="w-full object-contain p-2 transition-transform duration-700 group-hover:scale-[1.04] sm:p-3"
                    />

                  </div>

                </div>

              </div>

              {/* GPS */}

              <div className="floating-card gps-card">

                <div className="flex items-center gap-2 sm:gap-3">

                  <span className="text-lg sm:text-2xl">
                    📍
                  </span>

                  <div>

                    <p className="text-[8px] text-slate-400 sm:text-[10px]">
                      GPS STATUS
                    </p>

                    <p className="text-[10px] font-black text-white sm:text-sm">
                      Location Verified
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>
      </section>

      {/* =====================================================
          FEATURES
      ===================================================== */}

      <section
        id="fitur"
        className="relative px-4 py-20 sm:px-6 lg:px-8 lg:py-32"
      >

        <div className="mx-auto max-w-7xl">

          <div className="reveal mx-auto mb-12 max-w-3xl text-center sm:mb-16">

            <span className="section-label">
              POWERFUL FEATURES
            </span>

            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">

              Teknologi masa depan

              <br />

              <span className="text-slate-400">
                untuk absensi modern.
              </span>

            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-500">
              Semua fitur penting tersedia dalam satu sistem
              yang cepat, aman, dan mudah digunakan.
            </p>

          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {fitur.map((item, index) => (

              <div
                key={item.title}
                className="reveal feature-card"
                style={{
                  transitionDelay: `${index * 100}ms`,
                }}
              >

                <div className="feature-glow" />

                <div className="relative z-10">

                  <div className="mb-6 flex items-center justify-between">

                    <div className="feature-icon">
                      {item.icon}
                    </div>

                    <span className="feature-tag">
                      {item.tag}
                    </span>

                  </div>

                  <h3 className="text-xl font-black text-slate-900 transition-colors group-hover:text-blue-600">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {item.desc}
                  </p>

                  <div className="feature-line" />

                </div>

              </div>

            ))}

          </div>

        </div>

      </section>

      {/* =====================================================
          PROCESS
      ===================================================== */}

      <section className="relative overflow-hidden bg-[#050816] px-4 py-20 sm:px-6 lg:px-8 lg:py-32">

        <div className="dark-orb dark-orb-1" />
        <div className="dark-orb dark-orb-2" />

        <div className="relative z-10 mx-auto max-w-7xl">

          <div className="reveal mb-12 text-center sm:mb-16">

            <span className="section-label text-blue-400">
              HOW IT WORKS
            </span>

            <h2 className="mt-3 text-3xl font-black text-white sm:text-5xl">

              Semudah

              <span className="gradient-text ml-2">
                1, 2, 3, 4.
              </span>

            </h2>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-slate-400">
              Proses absensi dibuat sederhana agar pengguna
              dapat mencatat kehadiran dalam hitungan detik.
            </p>

          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {steps.map((step, index) => (

              <div
                key={step.number}
                className="reveal process-card"
                style={{
                  transitionDelay: `${index * 100}ms`,
                }}
              >

                <div className="flex items-center justify-between">

                  <span className="process-number">
                    {step.number}
                  </span>

                  <div className="process-icon">
                    {step.icon}
                  </div>

                </div>

                <h3 className="mt-7 text-xl font-black text-white">
                  {step.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {step.desc}
                </p>

                <div className="process-line" />

              </div>

            ))}

          </div>

        </div>
      </section>

      {/* =====================================================
          CTA
      ===================================================== */}

      <section className="relative overflow-hidden bg-gradient-to-b from-white to-blue-50 px-4 py-20 sm:px-6 lg:px-8 lg:py-32">

        <div className="mx-auto max-w-5xl">

          <div className="reveal cta-card">

            <div className="cta-orb cta-orb-1" />
            <div className="cta-orb cta-orb-2" />

            <div className="relative z-10">

              <div className="mb-4 text-4xl">
                🚀
              </div>

              <h2 className="text-3xl font-black sm:text-5xl">
                Siap naik level?
              </h2>

              <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-blue-100 sm:text-base">
                Gunakan sistem absensi yang lebih modern,
                cepat, aman, dan terintegrasi.
              </p>

              <Link
                href="/login"
                className="mt-8 inline-flex rounded-2xl bg-white px-8 py-4 text-sm font-black text-blue-700 shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-105"
              >
                Masuk ke Sistem →
              </Link>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="border-t border-slate-800 bg-[#020617] px-4 py-10">

        <div className="mx-auto flex max-w-7xl flex-col items-center gap-5 text-center">

          <div className="rounded-xl bg-white px-4 py-2 shadow-lg">
            <Image
              src="/svara.png"
              alt="SVARA Innovation Logo"
              width={150}
              height={40}
              className="h-8 w-auto object-contain"
            />
          </div>

          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} SVARA INNOVATION.
            Hak Cipta Dilindungi.
          </p>

          <p className="text-[10px] text-slate-600">
            Smart Attendance • Cloud • Realtime
          </p>

        </div>

      </footer>

      {/* =====================================================
          FLOATING NOTIFICATION
      ===================================================== */}

      <div
        className={`fixed bottom-4 left-4 right-4 z-[80] transition-all duration-700 sm:bottom-7 sm:left-auto sm:right-7 sm:w-[360px] ${
          showNotification
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-10 opacity-0"
        }`}
      >

        <div className="notification">

          <div className="flex gap-3">

            <div className="notification-icon">
              ✓
            </div>

            <div className="min-w-0 flex-1">

              <div className="flex items-center justify-between">

                <p className="text-sm font-black text-slate-900">
                  Sistem Online
                </p>

                <button
                  onClick={() => setShowNotification(false)}
                  className="text-lg text-slate-400 transition hover:rotate-90 hover:text-slate-900"
                >
                  ×
                </button>

              </div>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Semua layanan SVARA berjalan normal dan siap digunakan.
              </p>

            </div>

          </div>

        </div>

      </div>

      {/* =====================================================
          WELCOME POPUP
      ===================================================== */}

      {showPopup && (

        <div className="popup-overlay">

          <div className="popup-card">

            <button
              onClick={() => setShowPopup(false)}
              className="popup-close"
            >
              ×
            </button>

            <div className="popup-icon">
              👋
            </div>

            <span className="section-label">
              WELCOME TO SVARA
            </span>

            <h2 className="mt-3 pr-8 text-3xl font-black text-slate-950">
              Absensi jadi lebih

              <span className="gradient-text">
                {" "}
                keren.
              </span>
            </h2>

            <p className="mt-4 text-sm leading-6 text-slate-500">
              Nikmati pengalaman absensi modern
              dengan teknologi yang cepat dan terintegrasi.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">

              <div className="popup-feature">
                <span>
                  📷
                </span>
                <p>
                  Face Verification
                </p>
              </div>

              <div className="popup-feature">
                <span>
                  📍
                </span>
                <p>
                  GPS Tracking
                </p>
              </div>

            </div>

            <div className="mt-6 flex gap-3">

              <button
                onClick={() => setShowPopup(false)}
                className="popup-later"
              >
                Nanti
              </button>

              <Link
                href="/login"
                onClick={() => setShowPopup(false)}
                className="popup-login"
              >
                Masuk →
              </Link>

            </div>

          </div>

        </div>

      )}

      {/* =====================================================
          CSS ANIMATION
      ===================================================== */}

      <style jsx global>{`

        html {
          scroll-behavior: smooth;
        }

        body {
          overflow-x: hidden;
        }

        /* ==============================
           BACKGROUND
        ============================== */

        .mouse-glow {
          position: fixed;
          width: 350px;
          height: 350px;
          transform: translate(-50%, -50%);
          border-radius: 9999px;
          background: rgba(59, 130, 246, .08);
          filter: blur(80px);
          transition:
            left .5s ease,
            top .5s ease;
        }

        .blob {
          position: absolute;
          border-radius: 9999px;
          filter: blur(100px);
          animation: blobMove 12s ease-in-out infinite;
        }

        .blob-1 {
          width: 500px;
          height: 500px;
          left: -180px;
          top: -150px;
          background: rgba(37, 99, 235, .15);
        }

        .blob-2 {
          width: 450px;
          height: 450px;
          right: -180px;
          top: 15%;
          background: rgba(124, 58, 237, .12);
          animation-delay: 3s;
        }

        .blob-3 {
          width: 400px;
          height: 400px;
          left: 30%;
          bottom: -200px;
          background: rgba(79, 70, 229, .10);
          animation-delay: 6s;
        }

        @keyframes blobMove {

          0%, 100% {
            transform: translate(0, 0) scale(1);
          }

          33% {
            transform: translate(40px, -40px) scale(1.08);
          }

          66% {
            transform: translate(-30px, 35px) scale(.94);
          }

        }

        .dot-grid {
          position: absolute;
          inset: 0;
          opacity: .035;
          background-image:
            radial-gradient(#2563eb 1px, transparent 1px);
          background-size: 28px 28px;
        }

        .particle {
          position: absolute;
          width: 5px;
          height: 5px;
          border-radius: 9999px;
          background: rgba(37, 99, 235, .25);
          animation: particleMove 7s ease-in-out infinite;
        }

        @keyframes particleMove {

          0%, 100% {
            transform: translateY(0);
            opacity: .2;
          }

          50% {
            transform: translateY(-30px);
            opacity: .8;
          }

        }

        /* ==============================
           TEXT
        ============================== */

        .gradient-text {
          background:
            linear-gradient(
              90deg,
              #2563eb,
              #4f46e5,
              #7c3aed,
              #2563eb
            );
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: gradientMove 5s linear infinite;
        }

        @keyframes gradientMove {

          0% {
            background-position: 0% 50%;
          }

          100% {
            background-position: 300% 50%;
          }

        }

        .section-label {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .25em;
          color: #2563eb;
        }

        /* ==============================
           REVEAL
        ============================== */

        .reveal {
          opacity: 0;
          transform: translateY(35px);
          transition:
            opacity .8s ease,
            transform .8s cubic-bezier(.16,1,.3,1);
        }

        .reveal.show {
          opacity: 1;
          transform: translateY(0);
        }

        /* ==============================
           BUTTON
        ============================== */

        .main-button {
          transition:
            transform .3s ease,
            box-shadow .3s ease;
        }

        .main-button:hover {
          transform: translateY(-3px);
          box-shadow:
            0 20px 50px rgba(37,99,235,.4);
        }

        .shine-effect {
          position: absolute;
          top: 0;
          left: -100%;
          width: 60%;
          height: 100%;
          transform: skewX(-20deg);
          background: rgba(255,255,255,.22);
          transition: left .8s ease;
        }

        .main-button:hover .shine-effect {
          left: 140%;
        }

        .login-button {
          transition:
            transform .3s ease,
            box-shadow .3s ease;
        }

        .login-button:hover {
          transform: translateY(-2px);
          box-shadow:
            0 15px 35px rgba(37,99,235,.25);
        }

        /* ==============================
           CLOCK
        ============================== */

        .clock-box {
          transition:
            transform .3s ease,
            box-shadow .3s ease;
        }

        .clock-box:hover {
          transform: translateY(-2px);
          box-shadow:
            0 10px 30px rgba(37,99,235,.12);
        }

        /* ==============================
           STATS
        ============================== */

        .stat-card {
          border: 1px solid rgba(255,255,255,.8);
          background: rgba(255,255,255,.65);
          backdrop-filter: blur(16px);
          border-radius: 18px;
          padding: 12px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(15,23,42,.04);
          transition: .3s ease;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 15px 35px rgba(37,99,235,.12);
        }

        .stat-card strong {
          display: block;
          font-size: 16px;
          font-weight: 900;
        }

        .stat-card span {
          display: block;
          margin-top: 4px;
          font-size: 9px;
          color: #94a3b8;
        }

        /* ==============================
           HERO DASHBOARD
        ============================== */

        .hero-glow {
          position: absolute;
          width: 80%;
          height: 80%;
          left: 10%;
          top: 10%;
          border-radius: 9999px;
          background:
            linear-gradient(
              135deg,
              rgba(37,99,235,.25),
              rgba(124,58,237,.2)
            );
          filter: blur(90px);
          animation: glowPulse 5s ease-in-out infinite;
        }

        @keyframes glowPulse {

          0%, 100% {
            transform: scale(.95);
            opacity: .7;
          }

          50% {
            transform: scale(1.08);
            opacity: 1;
          }

        }

        .dashboard-wrapper {
          position: relative;
          width: 90%;
          margin: auto;
          animation: dashboardFloat 6s ease-in-out infinite;
        }

        @keyframes dashboardFloat {

          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }

          50% {
            transform: translateY(-12px) rotate(.4deg);
          }

        }

        .dashboard-glow {
          position: absolute;
          inset: -15px;
          border-radius: 50px;
          background:
            linear-gradient(
              90deg,
              rgba(37,99,235,.2),
              rgba(99,102,241,.2),
              rgba(124,58,237,.2)
            );
          filter: blur(25px);
        }

        .dashboard-card {
          position: relative;
          overflow: hidden;
          border-radius: 40px;
          padding: 8px;
          border: 1px solid rgba(255,255,255,.8);
          background: rgba(255,255,255,.65);
          backdrop-filter: blur(25px);
          box-shadow:
            0 30px 100px rgba(30,64,175,.2);
        }

        .dashboard-shine {
          position: absolute;
          z-index: 10;
          top: 0;
          left: -130%;
          width: 70%;
          height: 100%;
          transform: skewX(-25deg);
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(255,255,255,.6),
              transparent
            );
          transition: left 1.3s ease;
        }

        .dashboard-card:hover .dashboard-shine {
          left: 300%;
        }

        .floating-card {
          position: absolute;
          z-index: 30;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.7);
          background: rgba(255,255,255,.85);
          padding: 12px;
          box-shadow:
            0 25px 60px rgba(15,23,42,.15);
          backdrop-filter: blur(20px);
          animation: floating 5s ease-in-out infinite;
        }

        .attendance-card {
          left: 0;
          top: 8%;
        }

        .gps-card {
          right: 0;
          bottom: 4%;
          background: rgba(2,6,23,.95);
          border-color: rgba(255,255,255,.1);
          animation-delay: 2s;
        }

        @keyframes floating {

          0%, 100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-12px);
          }

        }

        /* ==============================
           FEATURES
        ============================== */

        .feature-card {
          position: relative;
          overflow: hidden;
          border-radius: 32px;
          border: 1px solid rgba(255,255,255,.8);
          background: rgba(255,255,255,.7);
          padding: 28px;
          box-shadow:
            0 15px 45px rgba(15,23,42,.05);
          backdrop-filter: blur(20px);
          transition:
            transform .5s cubic-bezier(.16,1,.3,1),
            box-shadow .5s ease,
            border-color .5s ease;
        }

        .feature-card:hover {
          transform: translateY(-10px);
          border-color: rgba(96,165,250,.5);
          box-shadow:
            0 30px 70px rgba(37,99,235,.15);
        }

        .feature-glow {
          position: absolute;
          right: -50px;
          top: -50px;
          width: 150px;
          height: 150px;
          border-radius: 9999px;
          background: rgba(59,130,246,.08);
          filter: blur(30px);
          transition: .5s ease;
        }

        .feature-card:hover .feature-glow {
          background: rgba(59,130,246,.22);
          transform: scale(1.4);
        }

        .feature-icon {
          display: flex;
          width: 56px;
          height: 56px;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          background:
            linear-gradient(
              135deg,
              #eff6ff,
              #e0e7ff
            );
          font-size: 25px;
          box-shadow: inset 0 2px 10px rgba(255,255,255,.8);
          transition: .5s ease;
        }

        .feature-card:hover .feature-icon {
          transform: rotate(7deg) scale(1.1);
        }

        .feature-tag {
          border-radius: 9999px;
          background: #eff6ff;
          padding: 5px 9px;
          font-size: 8px;
          font-weight: 900;
          color: #2563eb;
        }

        .feature-line {
          width: 30px;
          height: 4px;
          margin-top: 22px;
          border-radius: 9999px;
          background: #2563eb;
          transition: .5s ease;
        }

        .feature-card:hover .feature-line {
          width: 100%;
        }

        /* ==============================
           DARK PROCESS
        ============================== */

        .dark-orb {
          position: absolute;
          border-radius: 9999px;
          filter: blur(120px);
        }

        .dark-orb-1 {
          width: 500px;
          height: 500px;
          top: -250px;
          left: 30%;
          background: rgba(37,99,235,.18);
        }

        .dark-orb-2 {
          width: 400px;
          height: 400px;
          bottom: -200px;
          right: -100px;
          background: rgba(124,58,237,.15);
        }

        .process-card {
          border-radius: 32px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.035);
          padding: 28px;
          backdrop-filter: blur(20px);
          transition: .5s cubic-bezier(.16,1,.3,1);
        }

        .process-card:hover {
          transform: translateY(-10px);
          border-color: rgba(59,130,246,.5);
          background: rgba(255,255,255,.06);
          box-shadow:
            0 25px 60px rgba(37,99,235,.12);
        }

        .process-number {
          font-size: 48px;
          font-weight: 900;
          color: rgba(255,255,255,.08);
          transition: .5s ease;
        }

        .process-card:hover .process-number {
          color: rgba(59,130,246,.35);
        }

        .process-icon {
          display: flex;
          width: 48px;
          height: 48px;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
          background: rgba(255,255,255,.05);
          font-size: 20px;
          transition: .5s ease;
        }

        .process-card:hover .process-icon {
          background: #2563eb;
          transform: rotate(5deg) scale(1.08);
          box-shadow:
            0 10px 30px rgba(37,99,235,.4);
        }

        .process-line {
          width: 30px;
          height: 4px;
          margin-top: 25px;
          border-radius: 9999px;
          background: #2563eb;
          transition: .5s ease;
        }

        .process-card:hover .process-line {
          width: 100%;
        }

        /* ==============================
           CTA
        ============================== */

        .cta-card {
          position: relative;
          overflow: hidden;
          border-radius: 48px;
          padding: 65px 30px;
          text-align: center;
          color: white;
          background:
            linear-gradient(
              135deg,
              #2563eb,
              #4f46e5,
              #7c3aed
            );
          box-shadow:
            0 30px 100px rgba(37,99,235,.3);
        }

        .cta-orb {
          position: absolute;
          border-radius: 9999px;
          background: rgba(255,255,255,.1);
          filter: blur(30px);
        }

        .cta-orb-1 {
          width: 250px;
          height: 250px;
          left: -100px;
          top: -100px;
        }

        .cta-orb-2 {
          width: 250px;
          height: 250px;
          right: -100px;
          bottom: -100px;
        }

        /* ==============================
           NOTIFICATION
        ============================== */

        .notification {
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,.7);
          background: rgba(255,255,255,.9);
          padding: 15px;
          box-shadow:
            0 25px 70px rgba(15,23,42,.18);
          backdrop-filter: blur(25px);
        }

        .notification-icon {
          display: flex;
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: #dcfce7;
          color: #16a34a;
          font-size: 18px;
        }

        /* ==============================
           POPUP
        ============================== */

        .popup-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: rgba(2,6,23,.55);
          backdrop-filter: blur(12px);
        }

        .popup-card {
          position: relative;
          width: 100%;
          max-width: 430px;
          max-height: 90vh;
          overflow-y: auto;
          border-radius: 32px;
          border: 1px solid rgba(255,255,255,.8);
          background: white;
          padding: 30px;
          box-shadow:
            0 40px 120px rgba(2,6,23,.35);
          animation: popupIn .55s cubic-bezier(.16,1,.3,1);
        }

        @keyframes popupIn {

          from {
            opacity: 0;
            transform:
              scale(.85)
              translateY(30px);
          }

          to {
            opacity: 1;
            transform:
              scale(1)
              translateY(0);
          }

        }

        .popup-close {
          position: absolute;
          right: 18px;
          top: 18px;
          display: flex;
          width: 36px;
          height: 36px;
          align-items: center;
          justify-content: center;
          border-radius: 9999px;
          background: #f1f5f9;
          color: #64748b;
          transition: .3s ease;
        }

        .popup-close:hover {
          transform: rotate(90deg);
          background: #e2e8f0;
        }

        .popup-icon {
          display: flex;
          width: 62px;
          height: 62px;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          background:
            linear-gradient(
              135deg,
              #2563eb,
              #4f46e5
            );
          font-size: 25px;
          box-shadow:
            0 15px 35px rgba(37,99,235,.3);
        }

        .popup-feature {
          border-radius: 18px;
          background: #eff6ff;
          padding: 15px;
        }

        .popup-feature span {
          font-size: 22px;
        }

        .popup-feature p {
          margin-top: 8px;
          font-size: 10px;
          font-weight: 800;
          color: #1e293b;
        }

        .popup-later,
        .popup-login {
          flex: 1;
          border-radius: 13px;
          padding: 13px;
          text-align: center;
          font-size: 12px;
          font-weight: 800;
        }

        .popup-later {
          border: 1px solid #e2e8f0;
          color: #64748b;
        }

        .popup-login {
          color: white;
          background:
            linear-gradient(
              90deg,
              #2563eb,
              #4f46e5
            );
          box-shadow:
            0 10px 25px rgba(37,99,235,.25);
        }

        /* ==============================
           MOBILE
        ============================== */

        @media (max-width: 640px) {

          .blob-1 {
            width: 300px;
            height: 300px;
            left: -120px;
            top: -100px;
          }

          .blob-2 {
            width: 280px;
            height: 280px;
            right: -150px;
          }

          .blob-3 {
            width: 250px;
            height: 250px;
          }

          .mouse-glow {
            display: none;
          }

          .dashboard-wrapper {
            width: 87%;
          }

          .dashboard-card {
            border-radius: 27px;
            padding: 5px;
          }

          .attendance-card {
            left: -2px;
            top: 7%;
            padding: 9px;
          }

          .gps-card {
            right: -2px;
            bottom: 5%;
            padding: 9px;
          }

          .feature-card {
            padding: 22px;
            border-radius: 25px;
          }

          .process-card {
            padding: 22px;
            border-radius: 25px;
          }

          .cta-card {
            padding: 50px 22px;
            border-radius: 32px;
          }

          .popup-card {
            border-radius: 27px;
            padding: 25px;
          }

        }

        /* ==============================
           IOS SAFARI
        ============================== */

        @supports (-webkit-touch-callout: none) {

          .clock-box {
            -webkit-backdrop-filter: blur(20px);
          }

          .popup-overlay {
            min-height: -webkit-fill-available;
          }

        }

        /* ==============================
           SCROLLBAR
        ============================== */

        ::-webkit-scrollbar {
          width: 7px;
        }

        ::-webkit-scrollbar-track {
          background: #f8fafc;
        }

        ::-webkit-scrollbar-thumb {
          border-radius: 9999px;
          background:
            linear-gradient(
              #2563eb,
              #6366f1
            );
        }

      `}</style>

    </main>
  );
}