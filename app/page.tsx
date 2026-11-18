
import Image from "next/image";
import Link from "next/link";

const features = [
  ["01", "Face Verification", "Verifikasi wajah untuk memastikan identitas pengguna."],
  ["02", "Geo-Tagging GPS", "Pastikan absensi dilakukan pada lokasi yang ditentukan."],
  ["03", "Smart Approval", "Kelola izin, cuti, dan lembur secara digital."],
  ["04", "Live Dashboard", "Pantau data kehadiran secara real-time."],
];

const steps = [
  "Login Akun",
  "Verifikasi Wajah",
  "Validasi GPS",
  "Absensi Berhasil",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f3f8fc] text-[#10243a]">
      {/* HERO */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 md:grid-cols-2">
        <div>
          <span className="rounded-full bg-blue-100 px-4 py-2 text-xs font-bold text-blue-600">
            SMART ATTENDANCE SYSTEM
          </span>
          <h1 className="mt-7 text-5xl font-extrabold leading-tight">
            Pantau Kehadiran
            <span className="block text-blue-600">Lebih Cerdas.</span>
            Lebih Cepat.
          </h1>
          <p className="mt-5 leading-7 text-slate-500">
            Tingkatkan disiplin dan produktivitas dengan verifikasi
            wajah, GPS, approval, dan monitoring dalam satu platform.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="rounded-xl bg-blue-600 px-7 py-3 font-bold text-white">
              Mulai Sekarang
            </Link>
            <a href="#fitur" className="rounded-xl border border-slate-300 px-7 py-3 font-bold">
              Lihat Fitur
            </a>
          </div>
          <div className="mt-10 flex gap-10">
            {["99.9%|Akurasi", "Live|Monitoring", "Cloud|Sistem"].map(x => {
              const [v, l] = x.split("|");
              return <div key={l}><b className="text-2xl">{v}</b><p className="text-xs text-slate-500">{l}</p></div>;
            })}
          </div>
        </div>
        <div className="relative">
          <Image src="/hero.png" alt="SVARA Dashboard" width={650} height={650} priority className="w-full rounded-3xl shadow-xl" />
        </div>
      </section>

      {/* FEATURES */}
      <section id="fitur" className="bg-white px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-extrabold">Fitur Unggulan</h2>
          <p className="mt-3 text-center text-slate-500">Teknologi untuk absensi modern.</p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(([n, t, d]) => (
              <div key={n} className="rounded-2xl border border-slate-100 bg-[#f7faff] p-6 transition hover:-translate-y-1 hover:shadow-lg">
                <span className="text-3xl font-extrabold text-blue-600">{n}</span>
                <h3 className="mt-5 font-bold">{t}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-[#071a2e] px-6 py-20 text-white">
        <h2 className="text-center text-3xl font-extrabold">Cara Kerja Sistem</h2>
        <div className="mx-auto mt-12 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s} className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-xl font-bold">{i + 1}</div>
              <h3 className="mt-4 font-bold">{s}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-r from-blue-700 to-teal-500 px-8 py-16 text-center text-white">
          <h2 className="text-3xl font-extrabold">Kelola Absensi Lebih Mudah Bersama SVARA.</h2>
          <p className="mt-4 text-sm text-white/80">Sistem absensi modern untuk meningkatkan produktivitas.</p>
          <Link href="/login" className="mt-8 inline-block rounded-xl bg-white px-8 py-3 font-bold text-blue-700">
            Mulai Sekarang
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 px-6 py-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} SVARA INNOVATION. Hak Cipta Dilindungi.
      </footer>
    </main>
  );
}
