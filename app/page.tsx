"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--f-display",
});
const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--f-body",
});

const fitur = [
  {
    key: "face",
    span: "md:col-span-4",
    title: "Face Verification",
    desc: "Verifikasi wajah untuk memastikan identitas pengguna dengan aman.",
  },
  {
    key: "gps",
    span: "md:col-span-2",
    title: "Geo-Tagging GPS",
    desc: "Pastikan absensi dilakukan pada lokasi yang telah ditentukan.",
  },
  {
    key: "approval",
    span: "md:col-span-2",
    title: "Smart Approval",
    desc: "Kelola izin, cuti, dan lembur dengan persetujuan digital.",
  },
  {
    key: "dash",
    span: "md:col-span-4",
    title: "Live Dashboard",
    desc: "Pantau data kehadiran melalui dashboard secara real-time.",
  },
];

const steps = [
  { number: "1", title: "Login Akun", desc: "Masuk menggunakan akun yang sudah terdaftar." },
  { number: "2", title: "Verifikasi Wajah", desc: "Sistem melakukan validasi wajah secara otomatis." },
  { number: "3", title: "Validasi GPS", desc: "Lokasi perangkat diverifikasi oleh sistem." },
  { number: "4", title: "Berhasil", desc: "Data kehadiran tersimpan aman di server." },
];

function FeatureVisual({ k }: { k: string }) {
  if (k === "face")
    return (
      <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
        <div className="absolute inset-0 animate-[spin_14s_linear_infinite] rounded-full border-2 border-dashed border-[var(--brand)] opacity-50" />
        <div className="absolute inset-4 rounded-full border border-[var(--accent)] opacity-60" />
        <svg viewBox="0 0 64 64" className="relative h-20 w-20 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="32" cy="24" r="10" />
          <path d="M12 56c2-12 10-18 20-18s18 6 20 18" />
        </svg>
        <span className="chip absolute -right-2 bottom-3">Cocok 99.9%</span>
      </div>
    );
  if (k === "gps")
    return (
      <div className="relative mx-auto flex h-32 w-32 items-center justify-center">
        {[100, 70, 40].map((s) => (
          <div key={s} className="absolute rounded-full border border-[var(--brand)] opacity-30" style={{ width: `${s}%`, height: `${s}%` }} />
        ))}
        <span className="absolute h-4 w-4 animate-ping rounded-full bg-[var(--accent)] opacity-70" />
        <span className="relative h-3 w-3 rounded-full bg-[var(--accent)] shadow-[0_0_18px_var(--accent)]" />
      </div>
    );
  if (k === "approval")
    return (
      <div className="space-y-2">
        {[
          ["Cuti tahunan", "Disetujui", "var(--accent)"],
          ["Izin sakit", "Menunggu", "#f5b83d"],
          ["Lembur Jumat", "Disetujui", "var(--accent)"],
        ].map(([n, s, c]) => (
          <div key={n} className="flex items-center justify-between rounded-xl bd-line bg-bg px-3 py-2 text-xs">
            <span className="font-semibold">{n}</span>
            <span className="flex items-center gap-1.5 c-mute">
              <i className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
              {s}
            </span>
          </div>
        ))}
      </div>
    );
  return (
    <div className="flex h-32 items-end gap-2 sm:gap-3">
      {[45, 70, 55, 85, 62, 92, 78].map((h, i) => (
        <div key={i} className="flex-1 rounded-t-lg" style={{ height: `${h}%`, background: i === 5 ? "linear-gradient(to top,var(--brand),var(--accent))" : "var(--line)" }} />
      ))}
    </div>
  );
}

export default function Home() {
  const [currentTime, setCurrentTime] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("svara-theme");
    if (saved === "dark") setDarkMode(true);
    else if (saved === "light") setDarkMode(false);
    else setDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("svara-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    const updateTime = () =>
      setCurrentTime(
        new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className={`${display.variable} ${body.variable} app min-h-screen overflow-x-hidden`}>
      {/* BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[var(--brand)] opacity-[0.16] blur-3xl" />
        <div className="absolute -right-40 top-[28%] h-[480px] w-[480px] rounded-full bg-[var(--accent)] opacity-[0.12] blur-3xl" />
        <div className="grid-bg absolute inset-0" />
      </div>

      {/* NAVBAR */}
      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          isScrolled ? "nav-solid" : "border-b border-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
          <Link href="/" className="group flex items-center">
            <Image
              src="/svara.png"
              alt="SVARA Innovation Logo"
              width={180}
              height={55}
              priority
              className="h-8 w-auto transition duration-300 group-hover:scale-105 sm:h-10"
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="glass hidden items-center gap-2 rounded-full px-3.5 py-2 sm:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
              </span>
              <span className="font-mono text-xs font-bold tabular-nums c-brand">{currentTime || "--:--:--"}</span>
              <span className="text-[10px] font-bold c-mute">WIB</span>
            </div>

            <button
              type="button"
              onClick={() => setDarkMode((p) => !p)}
              aria-label="Ganti tema"
              className="glass relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full transition hover:scale-105"
            >
              <span className={`absolute transition-all duration-500 ${darkMode ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0"}`}>🌙</span>
              <span className={`absolute transition-all duration-500 ${darkMode ? "scale-0 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"}`}>☀️</span>
            </button>

            <Link href="/login" className="btn-primary px-5 py-2.5 text-xs sm:px-6 sm:text-sm">
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative px-4 pb-20 pt-28 sm:px-6 sm:pb-24 sm:pt-36 lg:px-8 lg:pb-32 lg:pt-44">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
            <div className="text-center lg:text-left">
              <div className="glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold c-brand">
                <span className="h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]" />
                Sistem absensi cloud
              </div>

              <h1 className="f-display text-[2.9rem] font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-[4.6rem]">
                Pantau Kehadiran
                <br />
                <span className="grad-text">Lebih Cerdas.</span>
                <br />
                <span className="c-mute">Lebih Cepat.</span>
              </h1>

              <p className="c-mute mx-auto mt-6 max-w-xl text-base leading-7 sm:text-lg lg:mx-0">
                Tingkatkan disiplin dan produktivitas dengan verifikasi wajah, GPS, approval, dan monitoring dalam satu platform.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link href="/login" className="btn-primary px-8 py-4 text-sm">
                  Mulai Sekarang
                </Link>
                <a href="#fitur" className="btn-ghost px-8 py-4 text-center text-sm">
                  Lihat Fitur
                </a>
              </div>

              <div className="mx-auto mt-10 flex max-w-md divide-x divide-[var(--line)] lg:mx-0">
                {[
                  ["99.9%", "Akurasi"],
                  ["Live", "Monitoring"],
                  ["Cloud", "Sistem"],
                ].map(([a, b]) => (
                  <div key={a} className="flex-1 px-4 first:pl-0 lg:text-left">
                    <strong className="f-display block text-2xl font-extrabold sm:text-3xl">{a}</strong>
                    <span className="c-mute text-xs">{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* HERO IMAGE */}
            <div className="mx-auto w-full max-w-2xl">
              <div className="relative mx-auto max-w-[480px] px-2 py-10">
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--brand)] opacity-30 blur-3xl sm:h-[460px] sm:w-[460px]" />

                <div className="glass card-shadow relative overflow-hidden rounded-[2rem] p-2.5 sm:p-3">
                  <Image
                    src="/hero.png"
                    alt="Sistem Absensi Dashboard"
                    width={650}
                    height={650}
                    priority
                    className="h-auto w-full rounded-[1.5rem] object-contain"
                  />

                  {/* face-scan overlay */}
                  <div className="pointer-events-none absolute inset-3 overflow-hidden rounded-[1.5rem]">
                    <span className="scanline" />
                    <i className="corner left-3 top-3 border-l-2 border-t-2" />
                    <i className="corner right-3 top-3 border-r-2 border-t-2" />
                    <i className="corner bottom-3 left-3 border-b-2 border-l-2" />
                    <i className="corner bottom-3 right-3 border-b-2 border-r-2" />
                  </div>
                </div>

                <div className="glass card-shadow absolute -left-1 top-[28%] z-20 rounded-2xl px-3 py-2.5 sm:-left-6 sm:px-4 sm:py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">✓</div>
                    <div>
                      <p className="text-xs font-bold">Absensi tercatat</p>
                      <p className="text-[11px] text-[var(--accent)]">Berhasil disimpan</p>
                    </div>
                  </div>
                </div>

                <div className="glass card-shadow absolute -right-1 bottom-[18%] z-20 rounded-2xl px-3 py-2.5 sm:-right-6 sm:px-4 sm:py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📍</span>
                    <div>
                      <p className="c-mute text-[11px]">Status GPS</p>
                      <p className="text-xs font-bold">Lokasi terverifikasi</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="fitur" className="bg-surface relative px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
            <h2 className="f-display text-3xl font-extrabold tracking-tight sm:text-5xl">
              Teknologi masa depan
              <br />
              <span className="c-mute">untuk absensi modern.</span>
            </h2>
            <p className="c-mute mx-auto mt-4 max-w-xl text-sm leading-6 sm:text-base">
              Semua fitur penting tersedia dalam satu sistem yang cepat, aman, dan mudah digunakan.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-6">
            {fitur.map((item) => (
              <div key={item.key} className={`bento group relative overflow-hidden rounded-3xl p-6 sm:p-7 ${item.span}`}>
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[var(--brand)] opacity-0 blur-3xl transition duration-500 group-hover:opacity-20" />
                <div className="relative flex h-full flex-col justify-between gap-8">
                  <FeatureVisual k={item.key} />
                  <div>
                    <h3 className="f-display text-xl font-extrabold">{item.title}</h3>
                    <p className="c-mute mt-2 text-sm leading-6">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how relative overflow-hidden px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[15%] top-0 h-72 w-72 rounded-full bg-[var(--brand)] opacity-20 blur-3xl" />
          <div className="absolute bottom-0 right-[10%] h-72 w-72 rounded-full bg-[var(--accent)] opacity-15 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <h2 className="f-display text-3xl font-extrabold text-white sm:text-5xl">
              Semudah <span className="grad-text">1, 2, 3, 4.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
              Proses absensi dibuat sederhana agar pengguna dapat mencatat kehadiran dalam hitungan detik.
            </p>
          </div>

          <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="absolute left-[12%] right-[12%] top-7 hidden h-px bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-50 lg:block" />
            {steps.map((s) => (
              <div key={s.number} className="relative text-center">
                <div className="f-display relative mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--accent)]/50 bg-[#07111f] text-xl font-extrabold text-[var(--accent)] shadow-[0_0_30px_-5px_var(--accent)]">
                  {s.number}
                </div>
                <h3 className="f-display mt-5 text-lg font-extrabold text-white">{s.title}</h3>
                <p className="mx-auto mt-2 max-w-[220px] text-sm leading-6 text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-surface px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="cta relative overflow-hidden rounded-[2rem] px-6 py-14 text-center sm:px-10 sm:py-20">
            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-black/20 blur-3xl" />
            <div className="relative">
              <h2 className="f-display text-3xl font-extrabold text-white sm:text-5xl">
                Kelola absensi lebih
                <br />
                mudah bersama SVARA.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/80 sm:text-base">
                Sistem absensi modern untuk membantu meningkatkan efisiensi dan produktivitas.
              </p>
              <Link
                href="/login"
                className="mt-8 inline-flex rounded-2xl bg-white px-8 py-4 text-sm font-extrabold text-[#06223f] shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
              >
                Mulai Sekarang
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer border-t px-4 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 text-center">
          <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
            <Image src="/svara.png" alt="SVARA Innovation Logo" width={140} height={40} className="h-7 w-auto" />
          </div>
          <p className="c-mute text-xs">© {new Date().getFullYear()} SVARA INNOVATION. Hak Cipta Dilindungi.</p>
          <p className="c-mute text-[11px] opacity-70">Smart Attendance • Cloud • Realtime</p>
        </div>
      </footer>

      <style jsx global>{`
        /* ===== PALET — ganti di sini agar cocok dengan logo ===== */
        :root {
          --bg: #f3f8fc;
          --surface: #ffffff;
          --ink: #071a2e;
          --mute: #5a6b7e;
          --line: #dbe6f0;
          --brand: #0a6cff;
          --accent: #00b8a0;
        }
        .dark {
          --bg: #050d19;
          --surface: #0a1626;
          --ink: #eaf3ff;
          --mute: #8ba2ba;
          --line: #172a40;
          --brand: #3d8bff;
          --accent: #2ee6c5;
        }

        html { scroll-behavior: smooth; }
        body { margin: 0; overflow-x: hidden; }
        * { box-sizing: border-box; }
        ::selection { background: color-mix(in srgb, var(--brand) 30%, transparent); }

        .app {
          background: var(--bg);
          color: var(--ink);
          font-family: var(--f-body), system-ui, sans-serif;
          transition: background 0.5s, color 0.5s;
        }
        .f-display { font-family: var(--f-display), var(--f-body), system-ui, sans-serif; }
        .c-mute { color: var(--mute); }
        .c-brand { color: var(--brand); }
        .bg-surface { background: var(--surface); }
        .bg-bg { background: var(--bg); }
        .bd-line { border: 1px solid var(--line); }

        .grad-text {
          background: linear-gradient(100deg, var(--brand), var(--accent));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .grid-bg {
          background-image:
            linear-gradient(var(--line) 1px, transparent 1px),
            linear-gradient(90deg, var(--line) 1px, transparent 1px);
          background-size: 56px 56px;
          opacity: 0.45;
          mask-image: radial-gradient(ellipse at 50% 20%, #000 0%, transparent 70%);
          -webkit-mask-image: radial-gradient(ellipse at 50% 20%, #000 0%, transparent 70%);
        }

        .glass {
          background: color-mix(in srgb, var(--surface) 78%, transparent);
          border: 1px solid var(--line);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }
        .card-shadow { box-shadow: 0 30px 60px -28px color-mix(in srgb, var(--brand) 55%, transparent); }
        .nav-solid {
          background: color-mix(in srgb, var(--bg) 80%, transparent);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--line);
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          font-weight: 800;
          color: #fff;
          background: linear-gradient(100deg, var(--brand), color-mix(in srgb, var(--brand) 40%, var(--accent)));
          box-shadow: 0 14px 30px -12px var(--brand);
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .btn-primary:hover { transform: translateY(-3px); box-shadow: 0 20px 40px -12px var(--brand); }
        .btn-ghost {
          border-radius: 16px;
          font-weight: 700;
          border: 1px solid var(--line);
          background: color-mix(in srgb, var(--surface) 70%, transparent);
          backdrop-filter: blur(14px);
          transition: transform 0.3s, border-color 0.3s, color 0.3s;
        }
        .btn-ghost:hover { transform: translateY(-3px); border-color: var(--brand); color: var(--brand); }
        a:focus-visible, button:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

        .chip {
          border-radius: 999px;
          padding: 5px 11px;
          font-size: 11px;
          font-weight: 700;
          color: var(--accent);
          border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
          background: color-mix(in srgb, var(--surface) 85%, transparent);
          backdrop-filter: blur(10px);
        }

        .bento {
          background: var(--bg);
          border: 1px solid var(--line);
          transition: transform 0.4s, border-color 0.4s, box-shadow 0.4s;
        }
        .bento:hover {
          transform: translateY(-6px);
          border-color: color-mix(in srgb, var(--brand) 50%, var(--line));
          box-shadow: 0 30px 60px -30px color-mix(in srgb, var(--brand) 40%, transparent);
        }

        .how { background: #07111f; }
        .cta { background: linear-gradient(120deg, #0a56d6 0%, #0a6cff 45%, #00b8a0 130%); box-shadow: 0 30px 80px -30px #0a6cff; }
        .footer { border-color: var(--line); background: var(--bg); }

        /* ===== FACE SCAN ===== */
        .scanline {
          position: absolute;
          left: 0;
          right: 0;
          height: 70px;
          top: -70px;
          background: linear-gradient(to bottom, transparent, color-mix(in srgb, var(--accent) 45%, transparent));
          border-bottom: 2px solid var(--accent);
          animation: scan 3.6s ease-in-out infinite;
        }
        @keyframes scan {
          0% { top: -70px; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .corner {
          position: absolute;
          width: 26px;
          height: 26px;
          border-color: var(--accent);
          border-radius: 6px;
        }

        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          *, *::before, *::after {
            transition-duration: 0.01ms !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
    </main>
  );
}
