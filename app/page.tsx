
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f3f8fc] text-[#10243a]">
      <section className="mx-auto grid min-h-[80vh] max-w-6xl items-center gap-8 px-5 py-12 sm:px-6 sm:py-16 md:grid-cols-2 md:gap-10 md:py-20">
        <div>
          <span className="inline-block rounded-full bg-blue-100 px-4 py-2 text-xs font-bold text-blue-600">
            SMART ATTENDANCE SYSTEM
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-tight sm:mt-7 sm:text-5xl lg:text-6xl">
            Pantau Kehadiran
            <span className="block text-blue-600">
              Lebih Cerdas.
            </span>
            Lebih Cepat.
          </h1>

          <p className="mt-5 max-w-lg text-sm leading-7 text-slate-500 sm:text-base">
            Tingkatkan disiplin dan produktivitas dengan verifikasi
            wajah, GPS, approval, dan monitoring dalam satu platform.
          </p>

          <div className="mt-7">
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-7 py-3 font-bold text-white transition hover:bg-blue-700 sm:w-auto"
            >
              Mulai Sekarang
            </Link>
          </div>
        </div>

        <div className="w-full">
          <Image
            src="/hero.png"
            alt="SVARA Dashboard"
            width={650}
            height={650}
            priority
            className="h-auto w-full rounded-2xl shadow-xl sm:rounded-3xl"
          />
        </div>
      </section>

      <footer className="border-t border-slate-200 px-5 py-7 text-center text-xs text-slate-500 sm:px-6">
        © {new Date().getFullYear()} SVARA INNOVATION. Hak Cipta Dilindungi.
      </footer>
    </main>
  );
}
