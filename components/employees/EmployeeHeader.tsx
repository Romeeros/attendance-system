
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface EmployeeHeaderProps {
  subtitle?: string;
  userName?: string;
  backHref?: string;
  backLabel?: string;
}

export default function EmployeeHeader({
  subtitle = "Dashboard",
  userName = "Employee",
  backHref,
  backLabel = "Dasbor",
}: EmployeeHeaderProps) {
  const router = useRouter();

  // Otomatis tampilkan tombol Dasbor di halaman selain Dashboard.
  const resolvedBackHref =
    backHref !== undefined
      ? backHref
      : subtitle.toLowerCase() === "dashboard"
        ? undefined
        : "/dashboard";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-8">

        {/* Logo dan nama perusahaan */}
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/svara.png"
            alt="SVARA"
            className="h-10 w-10 shrink-0 object-contain"
          />

          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold leading-tight text-slate-900">
              SVARA INNOVATION
            </h1>

            <p className="text-xs text-slate-500">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Navigasi dan akun */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">

          {/* Informasi pengguna */}
          <div className="hidden items-center gap-2.5 sm:flex">
            <span className="max-w-40 truncate text-sm font-semibold capitalize text-slate-700">
              {userName}
            </span>

            <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-200">
              Employee
            </span>
          </div>

          {/* Tombol kembali ke Dashboard */}
          {resolvedBackHref && (
            <Link
              href={resolvedBackHref}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              ← <span>{backLabel}</span>
            </Link>
          )}

          {/* Tombol Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="h-10 rounded-xl border border-slate-200 px-3.5 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          >
            Logout
          </button>

        </div>
      </div>
    </header>
  );
}
