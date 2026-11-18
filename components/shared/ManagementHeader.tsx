
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface ManagementHeaderProps {
  subtitle?: string;
  userName?: string;
  role?: "Owner" | "Admin";
  backHref?: string;
  backLabel?: string;
}

export default function ManagementHeader({
  subtitle = "Dashboard",
  userName = "Management",
  role = "Owner",
  backHref,
  backLabel,
}: ManagementHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isOwner = role === "Owner";

  const dashboardHref = isOwner
    ? "/owner/dashboard"
    : "/admin/dashboard";

  // Deteksi halaman dashboard berdasarkan URL.
  const isDashboardPage =
    pathname === "/owner/dashboard" ||
    pathname === "/admin/dashboard";

  // Deteksi halaman detail rekap.
  const isRekapDetail =
    pathname.startsWith("/rekap/") &&
    pathname !== "/rekap/";

  // Tentukan tujuan tombol kembali.
  // Tombol kembali tidak ditampilkan pada halaman dashboard.
  const resolvedBackHref = isDashboardPage
    ? undefined
    : backHref !== undefined
      ? backHref
      : isRekapDetail
        ? "/rekap"
        : dashboardHref;

  const resolvedBackLabel =
    backLabel ?? (isRekapDetail ? "Rekap" : "Dasbor");

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

            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                isOwner
                  ? "bg-violet-50 text-violet-700 ring-violet-200"
                  : "bg-sky-50 text-sky-700 ring-sky-200"
              }`}
            >
              {role}
            </span>
          </div>

          {resolvedBackHref && (
            <Link
              href={resolvedBackHref}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <span aria-hidden="true">←</span>
              <span>{resolvedBackLabel}</span>
            </Link>
          )}

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
