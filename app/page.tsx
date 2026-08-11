"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function Home() {
  // State untuk menyimpan waktu saat ini
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    // Fungsi untuk mendapatkan waktu lokal
    const updateTime = () => {
      const now = new Date();
      // Format jam: HH:MM:SS
      const formattedTime = now.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setCurrentTime(formattedTime);
    };

    // Panggil sekali agar jam langsung muncul tanpa delay 1 detik
    updateTime();

    // Update setiap 1 detik (1000 ms)
    const timer = setInterval(updateTime, 1000);

    // Bersihkan interval saat komponen di-unmount
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* ================= Navbar ================= */}
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-100 bg-white/80 px-8 py-4 shadow-sm backdrop-blur-md md:px-16">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 md:text-2xl">
          Company<span className="text-blue-600">Attendance</span>
        </h1>

        <div className="flex items-center gap-4 md:gap-6">
          {/* Komponen Jam Real-time */}
          <div className="flex items-center gap-2 rounded-lg bg-blue-50/50 px-3 py-1.5 text-sm font-bold tracking-widest text-blue-700 border border-blue-100">
            <span>🕒</span>
            <span suppressHydrationWarning>
              {currentTime || "--:--:--"}
            </span>
          </div>

          <Link
            href="/login"
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all duration-300 hover:bg-blue-700 hover:shadow-blue-600/40 active:scale-95"
          >
            Login
          </Link>
        </div>
      </nav>

      {/* ================= Hero ================= */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/60 via-white to-white py-20 md:py-32">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-8 md:grid-cols-2 md:px-16">
          <div className="max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-100/80 px-3.5 py-1.5 text-xs font-semibold text-blue-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
              Solusi Absensi Pintar Berbasis Cloud
            </div>

            <h2 className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 md:text-6xl">
              Sistem Absensi <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Modern</span>
            </h2>

            <p className="mb-8 text-base leading-relaxed text-slate-600 md:text-lg">
              Kelola kehadiran karyawan dengan lebih mudah menggunakan verifikasi foto, lokasi GPS presisi tinggi, dan persetujuan atasan secara real-time.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/login"
                className="rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-blue-600/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-600/40 active:scale-95"
              >
                Mulai Sekarang
              </Link>

              <a
                href="#fitur"
                className="rounded-xl border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-300 hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-600"
              >
                Pelajari Lebih Lanjut
              </a>
            </div>
          </div>

          {/* Placeholder Gambar */}
          <div className="flex justify-center md:justify-end">
            <div className="relative rounded-3xl border border-slate-100 bg-white p-4 shadow-2xl shadow-blue-900/10 transition-transform duration-500 hover:scale-[1.01]">
              <Image
                src="/hero.png"
                alt="Attendance Illustration"
                width={480}
                height={480}
                className="rounded-2xl object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================= Fitur ================= */}
      <section id="fitur" className="bg-white py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-8 md:px-16">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
              Fitur Utama
            </h2>
            <p className="mt-3 text-slate-600">Dirancang khusus untuk mendukung fleksibilitas dan akurasi absensi perusahaan.</p>
          </div>

          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="group rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:-translate-y-2 hover:border-blue-100 hover:shadow-2xl hover:shadow-blue-600/10">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-3xl transition-transform duration-300 group-hover:scale-110">📷</div>
              <h3 className="mb-2 text-xl font-bold text-slate-900">Kamera</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Verifikasi foto akurat saat melakukan absensi secara langsung.
              </p>
            </div>

            <div className="group rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:-translate-y-2 hover:border-blue-100 hover:shadow-2xl hover:shadow-blue-600/10">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-3xl transition-transform duration-300 group-hover:scale-110">📍</div>
              <h3 className="mb-2 text-xl font-bold text-slate-900">GPS</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Mencatat koordinat lokasi pengguna secara otomatis dan real-time.
              </p>
            </div>

            <div className="group rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:-translate-y-2 hover:border-blue-100 hover:shadow-2xl hover:shadow-blue-600/10">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-3xl transition-transform duration-300 group-hover:scale-110">✅</div>
              <h3 className="mb-2 text-xl font-bold text-slate-900">Approval</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Sistem persetujuan cuti dan absensi terintegrasi oleh atasan.
              </p>
            </div>

            <div className="group rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:-translate-y-2 hover:border-blue-100 hover:shadow-2xl hover:shadow-blue-600/10">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-3xl transition-transform duration-300 group-hover:scale-110">📊</div>
              <h3 className="mb-2 text-xl font-bold text-slate-900">Riwayat</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Lihat dan unduh seluruh histori kehadiran dengan mudah.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= Cara Kerja ================= */}
      <section className="bg-slate-100/70 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-8 md:px-16">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
              Cara Kerja
            </h2>
            <p className="mt-3 text-slate-600">Hanya butuh beberapa detik untuk melakukan absensi harian.</p>
          </div>

          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-4">
            <div className="relative rounded-2xl border border-slate-200/60 bg-white p-8 text-center shadow-md transition-all duration-300 hover:shadow-xl">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl font-bold text-blue-600 shadow-inner">1</div>
              <h3 className="font-bold text-slate-900">Login Akun</h3>
              <p className="mt-2 text-xs text-slate-500">Masuk menggunakan kredensial karyawan Anda.</p>
            </div>

            <div className="relative rounded-2xl border border-slate-200/60 bg-white p-8 text-center shadow-md transition-all duration-300 hover:shadow-xl">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl font-bold text-blue-600 shadow-inner">2</div>
              <h3 className="font-bold text-slate-900">Ambil Foto</h3>
              <p className="mt-2 text-xs text-slate-500">Lakukan swafoto untuk validasi kehadiran.</p>
            </div>

            <div className="relative rounded-2xl border border-slate-200/60 bg-white p-8 text-center shadow-md transition-all duration-300 hover:shadow-xl">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl font-bold text-blue-600 shadow-inner">3</div>
              <h3 className="font-bold text-slate-900">Deteksi GPS</h3>
              <p className="mt-2 text-xs text-slate-500">Sistem memverifikasi titik lokasi Anda.</p>
            </div>

            <div className="relative rounded-2xl border border-slate-200/60 bg-white p-8 text-center shadow-md transition-all duration-300 hover:shadow-xl">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl font-bold text-blue-600 shadow-inner">4</div>
              <h3 className="font-bold text-slate-900">Absen Berhasil</h3>
              <p className="mt-2 text-xs text-slate-500">Kehadiran tercatat otomatis di database.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= Footer ================= */}
      <footer className="bg-slate-950 py-12 text-center text-white">
        <div className="mx-auto max-w-7xl px-8">
          <h3 className="text-xl font-bold tracking-tight">
            Company<span className="text-blue-500">Attendance</span>
          </h3>
          <p className="mt-3 text-sm text-slate-400">
            Made with ❤️ using Next.js & Tailwind CSS
          </p>
        </div>
      </footer>
    </main>
  );
}