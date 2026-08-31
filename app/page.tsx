"use client";

import { useEffect, useState } from "react";
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

  // Jam realtime
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

  // Navbar saat scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">

      {/* =========================
          NAVBAR
      ========================== */}
      <nav
        className={`fixed left-0 right-0 top-0 z-50 border-b transition-all duration-200 ${
          isScrolled
            ? "border-slate-200 bg-white shadow-sm"
            : "border-transparent bg-white/95"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">

          {/* Logo */}
          <Link href="/" className="shrink-0">
            <Image
              src="/svara.png"
              alt="SVARA Innovation Logo"
              width={180}
              height={55}
              priority
              className="h-8 w-auto sm:h-10"
            />
          </Link>

          {/* Right */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Clock */}
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />

              <span className="font-mono text-[10px] font-bold text-blue-700 sm:text-xs">
                {currentTime || "--:--:--"}
              </span>

              <span className="hidden text-[9px] font-bold text-slate-400 sm:inline">
                WIB
              </span>
            </div>

            {/* Login */}
            <Link
              href="/login"
              className="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-600 sm:px-6 sm:py-2.5 sm:text-sm"
            >
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* =========================
          HERO
      ========================== */}
      <section className="px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-36 lg:px-8 lg:pb-28 lg:pt-40">
        <div className="mx-auto max-w-7xl">

          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">

            {/* Text */}
            <div className="text-center lg:text-left">

              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-[10px] font-bold text-blue-700 sm:px-4 sm:text-xs">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                SISTEM ABSENSI CLOUD
              </div>

              <h1 className="text-[2.6rem] font-black leading-[1.05] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
                Pantau Kehadiran
                <br />
                <span className="text-blue-600">
                  Lebih Cerdas.
                </span>
                <br />
                Lebih Cepat.
              </h1>

              <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-slate-500 sm:text-lg lg:mx-0">
                Tingkatkan disiplin dan produktivitas dengan verifikasi
                wajah, GPS, approval, dan monitoring dalam satu platform.
              </p>

              {/* Buttons */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">

                <Link
                  href="/login"
                  className="rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700"
                >
                  Mulai Sekarang →
                </Link>

                <a
                  href="#fitur"
                  className="rounded-xl border border-slate-200 bg-white px-7 py-3.5 text-center text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:text-blue-600"
                >
                  Lihat Fitur ↓
                </a>
              </div>

              {/* Stats */}
              <div className="mx-auto mt-8 grid max-w-lg grid-cols-3 gap-2 lg:mx-0 lg:gap-3">

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

            {/* Hero Image */}
            <div className="mx-auto w-full max-w-xl">

              <div className="relative">

                {/* Image */}
                <div className="rounded-3xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/70 sm:rounded-[2rem] sm:p-3">
                  <Image
                    src="/hero.png"
                    alt="Sistem Absensi Dashboard"
                    width={650}
                    height={650}
                    priority
                    className="h-auto w-full rounded-2xl object-contain"
                  />
                </div>

                {/* Attendance badge */}
                <div className="absolute -left-2 top-8 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg sm:-left-5 sm:px-4 sm:py-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm text-emerald-600 sm:h-10 sm:w-10">
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

                {/* GPS badge */}
                <div className="absolute -right-2 bottom-8 rounded-xl bg-slate-950 px-3 py-2 text-white shadow-lg sm:-right-5 sm:px-4 sm:py-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-lg">📍</span>

                    <div>
                      <p className="text-[8px] text-slate-400 sm:text-[10px]">
                        GPS STATUS
                      </p>

                      <p className="text-[9px] font-bold sm:text-xs">
                        Location Verified
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =========================
          FEATURES
      ========================== */}
      <section
        id="fitur"
        className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
      >
        <div className="mx-auto max-w-7xl">

          <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">

            <span className="text-[10px] font-black tracking-[0.2em] text-blue-600">
              POWERFUL FEATURES
            </span>

            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
              Teknologi masa depan
              <br />
              <span className="text-slate-400">
                untuk absensi modern.
              </span>
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-500">
              Semua fitur penting tersedia dalam satu sistem yang cepat,
              aman, dan mudah digunakan.
            </p>

          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {fitur.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
              >

                <div className="mb-5 flex items-center justify-between">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl">
                    {item.icon}
                  </div>

                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[8px] font-black text-blue-600">
                    {item.tag}
                  </span>

                </div>

                <h3 className="text-lg font-black text-slate-900">
                  {item.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {item.desc}
                </p>

                <div className="mt-5 h-1 w-8 rounded-full bg-blue-600" />

              </div>
            ))}

          </div>
        </div>
      </section>

      {/* =========================
          HOW IT WORKS
      ========================== */}
      <section className="bg-slate-950 px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">

          <div className="mb-10 text-center sm:mb-14">

            <span className="text-[10px] font-black tracking-[0.2em] text-blue-400">
              HOW IT WORKS
            </span>

            <h2 className="mt-3 text-3xl font-black text-white sm:text-5xl">
              Semudah{" "}
              <span className="text-blue-400">
                1, 2, 3, 4.
              </span>
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-400">
              Proses absensi dibuat sederhana agar pengguna dapat mencatat
              kehadiran dalam hitungan detik.
            </p>

          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {steps.map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition duration-200 hover:border-blue-500/40 hover:bg-white/[0.07]"
              >

                <div className="flex items-center justify-between">

                  <span className="text-4xl font-black text-white/10">
                    {step.number}
                  </span>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-lg">
                    {step.icon}
                  </div>

                </div>

                <h3 className="mt-6 text-lg font-black text-white">
                  {step.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {step.desc}
                </p>

                <div className="mt-5 h-1 w-8 rounded-full bg-blue-600" />

              </div>
            ))}

          </div>
        </div>
      </section>

      {/* =========================
          FOOTER
      ========================== */}
      <footer className="border-t border-slate-800 bg-slate-950 px-4 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 text-center">

          <div className="rounded-lg bg-white px-3 py-1.5">
            <Image
              src="/svara.png"
              alt="SVARA Innovation Logo"
              width={140}
              height={40}
              className="h-7 w-auto"
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

      {/* =========================
          SIMPLE CSS
      ========================== */}
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          overflow-x: hidden;
        }

        .stat-card {
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 14px;
          padding: 11px 8px;
          text-align: center;
        }

        .stat-card strong {
          display: block;
          font-size: 15px;
          font-weight: 900;
          color: #0f172a;
        }

        .stat-card span {
          display: block;
          margin-top: 3px;
          font-size: 9px;
          color: #94a3b8;
        }

        @media (max-width: 640px) {
          .stat-card {
            padding: 10px 5px;
            border-radius: 12px;
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