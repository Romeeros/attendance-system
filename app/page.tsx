"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function Home() {
  const [currentTime, setCurrentTime] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);

  // Efek untuk jam realtime
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
    // Panggil sekali untuk menghindari delay
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Efek untuk mendeteksi scroll (merubah gaya navbar)
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased selection:bg-blue-600 selection:text-white relative overflow-hidden">
      
      {/* Background Ornaments (Animated Blob Gradients) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/20 blur-[120px] pointer-events-none -z-10 animate-pulse duration-[5000ms]"></div>
      <div className="absolute top-[20%] right-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-500/20 blur-[120px] pointer-events-none -z-10 animate-pulse duration-[7000ms]"></div>

      {/* ================= Navbar ================= */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${
          isScrolled
            ? "bg-white/80 backdrop-blur-xl border-b border-white/30 shadow-sm py-2 sm:py-3"
            : "bg-transparent py-4 sm:py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo (Responsive text size to fit small mobile screens) */}
          <h1 className="text-[17px] sm:text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 transition-transform hover:scale-105">
            Company<span className="text-blue-600">Attendance</span>
          </h1>

          <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
            {/* Jam - Sekarang TAMPIL di mobile dengan ukuran yang disesuaikan */}
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-white/70 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-1.5 text-[11px] sm:text-sm font-bold tracking-widest text-blue-700 border border-blue-100/80 shadow-sm transition-all hover:bg-blue-50">
              <span className="animate-[pulse_1.5s_ease-in-out_infinite]">🕒</span>
              <span suppressHydrationWarning>{currentTime || "--:--:--"}</span>
            </div>

            <Link
              href="/login"
              className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1.5 sm:px-7 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all duration-300 hover:shadow-blue-600/50 hover:scale-105 active:scale-95"
            >
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* ================= Hero ================= */}
      <section className="relative pt-28 pb-16 md:pt-40 md:pb-24 lg:pt-48 lg:pb-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            
            {/* Hero Text */}
            <div className="max-w-2xl mx-auto lg:mx-0 text-center lg:text-left relative z-10">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-md px-4 py-2 text-xs sm:text-sm font-semibold text-blue-700 shadow-md shadow-blue-900/5 border border-blue-100/50 transition-all hover:-translate-y-1">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
                </span>
                Sistem Absensi Cloud Terintegrasi
              </div>

              <h2 className="mb-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
                Pantau Kehadiran <br className="hidden sm:block" />
                <span className="relative whitespace-nowrap">
                  <span className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Lebih Cerdas
                  </span>
                </span>
              </h2>

              <p className="mb-8 text-sm sm:text-lg leading-relaxed text-slate-600 max-w-lg mx-auto lg:mx-0">
                Tingkatkan disiplin dan produktivitas dengan sistem verifikasi modern, 
                pelacakan lokasi GPS presisi, dan persetujuan real-time dalam satu platform.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  href="/login"
                  className="w-full sm:w-auto text-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-sm font-bold text-white shadow-xl shadow-blue-600/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-blue-600/50 hover:from-blue-500 hover:to-indigo-500 active:scale-95"
                >
                  Mulai Sekarang 🚀
                </Link>

                <a
                  href="#fitur"
                  className="w-full sm:w-auto text-center rounded-full bg-white px-8 py-4 text-sm font-bold text-slate-700 shadow-md border border-slate-200 transition-all duration-300 hover:border-blue-200 hover:bg-blue-50/80 hover:text-blue-600 active:scale-95"
                >
                  Lihat Fitur
                </a>
              </div>
            </div>

            {/* Hero Image / Placeholder dengan Efek Shine Keren */}
            <div className="relative flex justify-center lg:justify-end mt-8 lg:mt-0">
              {/* Box luar sebagai frame */}
              <div className="relative w-full max-w-[320px] sm:max-w-[420px] lg:max-w-[480px] aspect-square rounded-[2.5rem] bg-gradient-to-tr from-blue-200/50 to-indigo-100/50 p-2 sm:p-3 shadow-2xl shadow-blue-900/15 transition-all duration-700 hover:-translate-y-3 group">
                
                {/* Background blur di dalam frame */}
                <div className="absolute inset-0 bg-white/40 rounded-[2.5rem] backdrop-blur-xl border border-white/60"></div>
                
                {/* Animasi kilauan cahaya (Shine/Glare) saat di hover */}
                <div className="absolute inset-0 overflow-hidden rounded-[2.5rem] z-20 pointer-events-none">
                  <div className="absolute top-0 left-[-150%] w-[150%] h-full bg-gradient-to-r from-transparent via-white/60 to-transparent skew-x-[-25deg] transition-transform duration-1000 ease-in-out group-hover:translate-x-[250%]"></div>
                </div>

                {/* Gambar Utama (Tanpa tooltip budi santoso/lokasi) */}
                <div className="relative z-10 w-full h-full rounded-[2rem] overflow-hidden shadow-sm bg-white flex items-center justify-center">
                  <Image
                    src="/hero.png" // Gambar logo/Svara seperti di referensi
                    alt="Sistem Absensi Dashboard"
                    width={480}
                    height={480}
                    className="object-contain w-full h-full p-4 transition-transform duration-500 group-hover:scale-105"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= Fitur ================= */}
      <section id="fitur" className="relative py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 sm:mb-16 max-w-2xl text-center">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Teknologi Masa Depan
            </h2>
            <p className="mt-4 text-sm sm:text-lg text-slate-600">
              Dirancang khusus untuk mendukung fleksibilitas, keamanan, dan akurasi data absensi perusahaan Anda.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card Fitur */}
            {[
              { icon: "📷", title: "Face Verification", desc: "Sistem cerdas mendeteksi wajah karyawan secara real-time untuk menghindari kecurangan." },
              { icon: "📍", title: "Geo-Tagging GPS", desc: "Mengunci radius koordinat lokasi kantor. Memastikan absensi tepat pada tempatnya." },
              { icon: "✅", title: "Smart Approval", desc: "Persetujuan cuti, izin, atau lembur bisa dilakukan atasan dengan sekali klik (One-Click)." },
              { icon: "📊", title: "Live Dashboard", desc: "Pantau dan ekspor laporan kehadiran seluruh divisi dengan format yang rapi dan detail." },
            ].map((fitur, idx) => (
              <div 
                key={idx} 
                className="group relative rounded-3xl bg-white/60 backdrop-blur-lg p-6 sm:p-8 shadow-lg shadow-slate-200/40 border border-white transition-all duration-300 hover:-translate-y-3 hover:shadow-2xl hover:shadow-blue-600/15 hover:bg-white"
              >
                {/* Glow Effect on Hover */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"></div>

                <div className="mb-6 relative inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-3xl shadow-inner transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 z-10">
                  {fitur.icon}
                </div>
                <h3 className="mb-3 text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors relative z-10">{fitur.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600 relative z-10">
                  {fitur.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= Cara Kerja ================= */}
      <section className="bg-slate-900 py-20 lg:py-32 relative overflow-hidden">
        {/* Dekorasi Background Gelap Glowing */}
        <div className="absolute top-0 right-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-blue-600/30 blur-[120px] sm:blur-[150px] rounded-full pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-indigo-600/20 blur-[120px] sm:blur-[150px] rounded-full pointer-events-none animate-pulse duration-[6000ms]"></div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Semudah 1, 2, 3
            </h2>
            <p className="mt-4 text-sm sm:text-lg text-slate-400">Hanya butuh hitungan detik untuk mencatat kehadiran harian Anda.</p>
          </div>

          <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-4 relative">
            {/* Garis penghubung untuk desktop */}
            <div className="hidden lg:block absolute top-1/2 left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-blue-500/0 via-blue-500/50 to-blue-500/0 -translate-y-1/2 z-0"></div>

            {[
              { num: "1", title: "Login Akun", desc: "Masuk dengan kredensial yang telah terdaftar di perusahaan." },
              { num: "2", title: "Ambil foto", desc: "Sistem mendeteksi dan memvalidasi wajah Anda secara presisi." },
              { num: "3", title: "Validasi GPS", desc: "Sistem otomatis mengunci lokasi perangkat saat itu juga." },
              { num: "4", title: "Sukses!", desc: "Kehadiran tercatat aman secara real-time di server cloud." },
            ].map((step, idx) => (
              <div key={idx} className="group relative z-10 rounded-3xl bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 p-6 sm:p-8 text-center transition-all duration-300 hover:bg-slate-800 hover:-translate-y-3 hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 border border-slate-700 text-2xl font-bold text-slate-300 transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-blue-500 group-hover:to-indigo-600 group-hover:text-white group-hover:border-transparent group-hover:shadow-lg group-hover:shadow-blue-600/50 group-hover:scale-110">
                  {step.num}
                </div>
                <h3 className="font-bold text-white text-lg transition-colors group-hover:text-blue-400">{step.title}</h3>
                <p className="mt-3 text-sm text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= Footer ================= */}
      <footer className="bg-[#020617] py-12 border-t border-slate-800/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h3 className="text-xl font-extrabold tracking-tight text-white">
              Company<span className="text-blue-500">Attendance</span>
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              © {new Date().getFullYear()} Hak Cipta Dilindungi. Sistem Cerdas Masa Depan.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}