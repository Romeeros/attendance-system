"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bricolage_Grotesque, Figtree } from "next/font/google";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";

import { supabase } from "@/lib/supabase";

// =========================================================
// FONT & TOKEN DESAIN (sama dengan Owner Dashboard)
// =========================================================

const fontDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});

const fontBody = Figtree({
  subsets: ["latin"],
  variable: "--font-body",
});

const FONT_VARS = `${fontDisplay.variable} ${fontBody.variable}`;
const D = "font-[family-name:var(--font-display)]";
const BASE = `${FONT_VARS} font-[family-name:var(--font-body)]`;

const card = "rounded-2xl border border-slate-200/70 bg-white";

const badgeBase =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset";

const META = {
  present: {
    label: "Tepat waktu",
    color: "#10B981",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  late: {
    label: "Terlambat",
    color: "#EAB308",
    badge: "bg-yellow-50 text-yellow-700 ring-yellow-200",
  },
  sakit: {
    label: "Sakit",
    color: "#F97316",
    badge: "bg-orange-50 text-orange-700 ring-orange-200",
  },
  izin: {
    label: "Izin",
    color: "#8B5CF6",
    badge: "bg-violet-50 text-violet-700 ring-violet-200",
  },
  belum: {
    label: "Belum absen",
    color: "#F43F5E",
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
  },
} as const;

type SeriesKey = keyof typeof META;

const SERIES_KEYS: SeriesKey[] = ["present", "late", "sakit", "izin", "belum"];

const ICONS = {
  back: "M19 12H5m7-7-7 7 7 7",
  chevL: "m15 18-6-6 6-6",
  chevR: "m9 18 6-6-6-6",
  refresh:
    "M20 11a8.1 8.1 0 0 0-14.9-4M4 5v4h4M4 13a8.1 8.1 0 0 0 14.9 4M20 19v-4h-4",
  print:
    "M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M6 14h12v7H6z",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
  close: "M18 6 6 18M6 6l12 12",
  next: "m9 18 6-6-6-6",
};

// =========================================================
// TIPE
// =========================================================

interface Profile {
  id: string;
  full_name: string;
  division: string | null;
  created_at: string;
}

interface Attendance {
  profile_id: string;
  created_at: string;
  status: string | null;
  check_in: string | null;
}

interface Member {
  profile: Profile;
  att: Attendance | null;
}

interface DivisionData {
  name: string;
  present: Member[];
  absent: Member[];
  total: number;
  presentCount: number;
  absentCount: number;
  percentage: number;
  counts: Record<SeriesKey, number>;
}

// =========================================================
// HELPER
// =========================================================

const toDateString = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const getTodayString = () => toDateString(new Date());

const createLocalDate = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const getDashboardPath = (role: string) => {
  if (role === "owner") return "/owner/dashboard";
  if (role === "admin") return "/admin/dashboard";
  return "/dashboard";
};

const bucketOf = (status: string | null): SeriesKey =>
  status === "late"
    ? "late"
    : status === "sakit"
    ? "sakit"
    : status === "izin"
    ? "izin"
    : "present";

const formatTime = (value: string | null): string =>
  value
    ? new Date(value).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";

const initial = (name: string | null | undefined): string =>
  name?.trim()?.charAt(0)?.toUpperCase() || "?";

function Icon({
  d,
  className = "h-4 w-4",
}: {
  d: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

function DivisionTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;

  const row = payload[0].payload;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-slate-800">{row.name}</p>

      {SERIES_KEYS.map((key) => (
        <div
          key={key}
          className="flex items-center justify-between gap-6 py-0.5"
        >
          <span className="flex items-center gap-2 text-slate-500">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: META[key].color }}
            />
            {META[key].label}
          </span>

          <span className="font-semibold text-slate-800">{row[key]}</span>
        </div>
      ))}
    </div>
  );
}

function MemberRow({ member }: { member: Member }) {
  const att = member.att;
  const bucket: SeriesKey = att ? bucketOf(att.status) : "belum";

  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3">
      <div
        className={`${D} flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-600`}
      >
        {initial(member.profile.full_name)}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">
          {member.profile.full_name}
        </p>

        {att && (
          <p className="text-xs tabular-nums text-slate-500">
            {bucket === "sakit" || bucket === "izin" ? "Laporan" : "Masuk"}{" "}
            {formatTime(att.check_in ?? att.created_at)}
          </p>
        )}
      </div>

      {att && (
        <span className={`${badgeBase} ${META[bucket].badge}`}>
          {META[bucket].label}
        </span>
      )}
    </li>
  );
}

// =========================================================
// HALAMAN
// =========================================================

export default function LaporanTidakHadirPage() {
  const router = useRouter();
  const today = getTodayString();

  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [companyName, setCompanyName] = useState("Company Attendance");

  const [selectedDate, setSelectedDate] = useState(today);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [holiday, setHoliday] = useState<string | null>(null);

  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Mencegah respons lama menimpa respons terbaru saat tanggal diganti cepat
  const requestId = useRef(0);

  const formattedDate = useMemo(
    () =>
      createLocalDate(selectedDate).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [selectedDate]
  );

  const isWeekend = useMemo(() => {
    const day = createLocalDate(selectedDate).getDay();
    return day === 0 || day === 6;
  }, [selectedDate]);

  // =========================================================
  // FETCH
  // =========================================================

  const fetchData = async () => {
    const id = ++requestId.current;

    setFetching(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, role, company_id, full_name, companies(name)")
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        throw new Error("Data profile tidak ditemukan.");
      }

      // Employee tidak boleh membuka laporan
      if (profile.role === "employee") {
        router.replace("/dashboard");
        return;
      }

      const company: any = (profile as any).companies;
      const cName = Array.isArray(company) ? company[0]?.name : company?.name;

      const date = createLocalDate(selectedDate);
      const start = new Date(date);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      // ---- karyawan (owner tidak dihitung)
      const { data: employeeData, error: employeeError } = await supabase
        .from("profiles")
        .select("id, full_name, division, created_at")
        .eq("company_id", profile.company_id)
        .neq("role", "owner")
        .order("division", { ascending: true })
        .order("full_name", { ascending: true });

      if (employeeError) throw new Error(employeeError.message);

      // Hanya karyawan yang sudah terdaftar pada tanggal tsb
      const activeEmployees = (employeeData || []).filter(
        (employee) => new Date(employee.created_at) <= end
      );

      // ---- hari libur pada tanggal tsb
      const { data: holidayData, error: holidayError } = await supabase
        .from("holidays")
        .select("description")
        .eq("date", selectedDate)
        .eq("is_cancelled", false)
        .maybeSingle();

      if (holidayError) console.error("Holiday error:", holidayError);

      // ---- absensi
      let attendanceList: Attendance[] = [];

      if (activeEmployees.length) {
        const { data: attendanceData, error: attendanceError } = await supabase
          .from("attendance")
          .select("profile_id, created_at, status, check_in")
          .in(
            "profile_id",
            activeEmployees.map((employee) => employee.id)
          )
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString())
          .order("created_at", { ascending: true });

        if (attendanceError) throw new Error(attendanceError.message);

        attendanceList = attendanceData || [];
      }

      if (id !== requestId.current) return;

      setUserRole(profile.role);
      setUserName(profile.full_name || user.email?.split("@")[0] || "User");
      if (cName) setCompanyName(cName);

      setEmployees(activeEmployees);
      setAttendances(attendanceList);
      setHoliday(holidayData?.description ?? null);
    } catch (error: any) {
      if (id !== requestId.current) return;

      console.error("Fetch attendance error:", error);

      setErrorMessage(
        error?.message || "Terjadi kesalahan ketika mengambil data."
      );

      setEmployees([]);
      setAttendances([]);
    } finally {
      if (id === requestId.current) setFetching(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // =========================================================
  // TOAST OTOMATIS HILANG
  // =========================================================

  useEffect(() => {
    if (!notice) return;

    const timer = setTimeout(() => setNotice(null), 3500);

    return () => clearTimeout(timer);
  }, [notice]);

  // =========================================================
  // DATA PER DIVISI
  // =========================================================

  const divisionData = useMemo<DivisionData[]>(() => {
    const byId = new Map<string, Attendance>();

    attendances.forEach((item) => {
      if (!byId.has(item.profile_id)) byId.set(item.profile_id, item);
    });

    const groups: Record<string, Member[]> = {};

    employees.forEach((employee) => {
      const name = employee.division?.trim() || "Tanpa Divisi";
      const att = byId.get(employee.id) ?? null;

      // Record berstatus "absent" dianggap belum absen
      (groups[name] ||= []).push({
        profile: employee,
        att: att && att.status !== "absent" ? att : null,
      });
    });

    return Object.entries(groups)
      .map(([name, list]) => {
        const present = list.filter((m) => m.att);
        const absent = list.filter((m) => !m.att);

        const counts: Record<SeriesKey, number> = {
          present: 0,
          late: 0,
          sakit: 0,
          izin: 0,
          belum: absent.length,
        };

        present.forEach((m) => {
          counts[bucketOf(m.att!.status)]++;
        });

        return {
          name,
          present,
          absent,
          total: list.length,
          presentCount: present.length,
          absentCount: absent.length,
          percentage: list.length
            ? Math.round((present.length / list.length) * 100)
            : 0,
          counts,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, attendances]);

  const totalEmployees = employees.length;

  const totals = useMemo(() => {
    const result: Record<SeriesKey, number> = {
      present: 0,
      late: 0,
      sakit: 0,
      izin: 0,
      belum: 0,
    };

    divisionData.forEach((d) => {
      SERIES_KEYS.forEach((key) => {
        result[key] += d.counts[key];
      });
    });

    return result;
  }, [divisionData]);

  const totalPresent = totalEmployees - totals.belum;

  const attendancePercentage = totalEmployees
    ? Math.round((totalPresent / totalEmployees) * 100)
    : 0;

  const chartData = divisionData.map((d) => ({
    name: d.name,
    ...d.counts,
  }));

  const selectedDivision =
    divisionData.find((d) => d.name === selectedName) ?? null;

  const nonWorkday = isWeekend || !!holiday;

  // =========================================================
  // MODAL: KUNCI SCROLL & ESC
  // =========================================================

  useEffect(() => {
    if (!selectedName) return;

    const previous = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedName(null);
    };

    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [selectedName]);

  // =========================================================
  // AKSI
  // =========================================================

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const shiftDate = (delta: number) => {
    const d = createLocalDate(selectedDate);
    d.setDate(d.getDate() + delta);

    const next = toDateString(d);

    if (next <= getTodayString()) setSelectedDate(next);
  };

  const copyAbsent = async (division: DivisionData) => {
    const text =
      `Belum absen, ${formattedDate} (${division.name}):\n` +
      division.absent
        .map((m, i) => `${i + 1}. ${m.profile.full_name}`)
        .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setNotice({ type: "success", text: "Daftar nama disalin." });
    } catch {
      setNotice({
        type: "error",
        text: "Gagal menyalin. Salin manual dari daftar.",
      });
    }
  };

  // =========================================================
  // LOADING AWAL
  // =========================================================

  if (loading) {
    return (
      <main
        className={`${BASE} flex min-h-screen items-center justify-center bg-[#F2F4F9]`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-slate-200 border-t-[#0E1A3A]" />
          <p className="text-sm font-medium text-slate-500">
            Memuat rekap kehadiran...
          </p>
        </div>
      </main>
    );
  }

  const roleLabel =
    userRole === "owner" ? "Owner" : userRole === "admin" ? "Admin" : userRole;

  const summary =
    totals.belum === 0
      ? `Semua ${totalEmployees} karyawan sudah absen.`
      : `${totalPresent} dari ${totalEmployees} karyawan sudah absen. ${totals.belum} lainnya belum.`;

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main
      className={`${BASE} min-h-screen bg-[#F2F4F9] pb-16 text-slate-800 print:bg-white print:pb-0`}
    >
      {/* ================= TOAST ================= */}

      {notice && (
        <div
          role="status"
          className={`fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 z-[120] max-w-[90vw] -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg print:hidden ${
            notice.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* ================= HEADER ================= */}

      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`${D} flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0E1A3A] text-lg font-bold text-white`}
            >
              {companyName.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <h1
                className={`${D} truncate text-lg font-semibold leading-tight text-slate-900`}
              >
                {companyName}
              </h1>
              <p className="text-xs text-slate-500">Rekap kehadiran</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2.5 md:flex">
              <span className="max-w-[10rem] truncate text-sm font-semibold capitalize text-slate-700">
                {userName}
              </span>

              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                  userRole === "owner"
                    ? "bg-violet-50 text-violet-700 ring-violet-200"
                    : "bg-sky-50 text-sky-700 ring-sky-200"
                }`}
              >
                {roleLabel}
              </span>
            </div>

            <Link
              href={getDashboardPath(userRole)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <Icon d={ICONS.back} />
              <span className="hidden sm:inline">Dasbor</span>
            </Link>

            <button
              onClick={handleLogout}
              className="h-10 rounded-xl border border-slate-200 px-3.5 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ================= KONTEN ================= */}

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-8 sm:pt-8 print:hidden">
        {/* JUDUL & KONTROL TANGGAL */}

        <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2
              className={`${D} text-3xl font-semibold text-slate-900 sm:text-4xl`}
            >
              Rekap kehadiran
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500">
              Lihat siapa yang sudah dan belum absen pada tanggal tertentu.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white">
              <button
                onClick={() => shiftDate(-1)}
                aria-label="Hari sebelumnya"
                className="flex h-11 w-11 items-center justify-center rounded-l-xl text-slate-500 transition hover:bg-slate-50"
              >
                <Icon d={ICONS.chevL} />
              </button>

              <input
                type="date"
                value={selectedDate}
                max={today}
                aria-label="Pilih tanggal"
                onChange={(e) => {
                  const value = e.target.value;

                  if (!value) return;

                  setSelectedDate(value > getTodayString() ? getTodayString() : value);
                }}
                className="h-11 border-x border-slate-200 bg-transparent px-3 text-base font-semibold text-slate-700 focus:outline-none sm:text-sm"
              />

              <button
                onClick={() => shiftDate(1)}
                disabled={selectedDate >= today}
                aria-label="Hari berikutnya"
                className="flex h-11 w-11 items-center justify-center rounded-r-xl text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <Icon d={ICONS.chevR} />
              </button>
            </div>

            {selectedDate !== today && (
              <button
                onClick={() => setSelectedDate(getTodayString())}
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Hari ini
              </button>
            )}

            <button
              onClick={fetchData}
              disabled={fetching}
              aria-label="Muat ulang"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0E1A3A] px-4 text-sm font-semibold text-white transition hover:bg-[#1a2a5a] disabled:opacity-60"
            >
              <Icon
                d={ICONS.refresh}
                className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Muat ulang</span>
            </button>

            {totalEmployees > 0 && (
              <button
                onClick={() => window.print()}
                aria-label="Cetak laporan"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Icon d={ICONS.print} />
                <span className="hidden sm:inline">Cetak</span>
              </button>
            )}
          </div>
        </section>

        <div
          aria-busy={fetching}
          className={`transition-opacity ${fetching ? "opacity-60" : ""}`}
        >
          {/* ERROR */}

          {errorMessage && (
            <div
              role="alert"
              className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4"
            >
              <p className="text-sm font-semibold text-rose-800">
                Gagal mengambil data
              </p>
              <p className="mt-1 text-sm text-rose-600">{errorMessage}</p>
            </div>
          )}

          {totalEmployees === 0 ? (
            <section
              className={`${card} flex min-h-[320px] items-center justify-center border-dashed p-8 text-center`}
            >
              <div>
                <h3 className={`${D} text-xl font-semibold text-slate-800`}>
                  Belum ada karyawan
                </h3>

                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                  Tidak ada karyawan yang terdaftar pada {formattedDate}.
                </p>

                {selectedDate !== today && (
                  <button
                    onClick={() => setSelectedDate(getTodayString())}
                    className="mt-5 rounded-xl bg-[#0E1A3A] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a2a5a]"
                  >
                    Kembali ke hari ini
                  </button>
                )}
              </div>
            </section>
          ) : (
            <>
              {/* ================= HERO ================= */}

              <section className="rounded-[28px] bg-[#0E1A3A] p-6 text-white sm:p-10">
                <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedDate === today && (
                        <span className="rounded-full bg-[#5EEAD4] px-3 py-1 text-xs font-semibold text-[#0E1A3A]">
                          Hari ini
                        </span>
                      )}

                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
                        {holiday
                          ? `Libur: ${holiday}`
                          : isWeekend
                          ? "Akhir pekan"
                          : "Hari kerja"}
                      </span>
                    </div>

                    <h3
                      className={`${D} mt-4 text-3xl font-semibold capitalize leading-tight sm:text-5xl`}
                    >
                      {formattedDate}
                    </h3>

                    <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-300">
                      {summary}
                    </p>

                    {nonWorkday && (
                      <p className="mt-2 max-w-md text-sm leading-relaxed text-amber-200">
                        Tanggal ini bukan hari kerja, jadi karyawan yang belum
                        absen tidak dihitung alpa.
                      </p>
                    )}
                  </div>

                  {/* GAUGE */}

                  <div className="relative mx-auto h-52 w-52 shrink-0 sm:h-56 sm:w-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        data={[{ name: "Sudah absen", value: attendancePercentage }]}
                        innerRadius="80%"
                        outerRadius="100%"
                        startAngle={90}
                        endAngle={-270}
                      >
                        <PolarAngleAxis
                          type="number"
                          domain={[0, 100]}
                          tick={false}
                          angleAxisId={0}
                        />
                        <RadialBar
                          dataKey="value"
                          cornerRadius={50}
                          fill="#5EEAD4"
                          background={{ fill: "rgba(255,255,255,0.12)" }}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>

                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`${D} text-5xl font-semibold`}>
                        {attendancePercentage}
                        <span className="text-2xl text-slate-400">%</span>
                      </span>
                      <span className="mt-1 text-xs text-slate-300">
                        sudah absen
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* ================= RINGKASAN ANGKA ================= */}

              <section className={`${card} mt-6 p-5 sm:p-6`}>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  {SERIES_KEYS.map(
                    (key) =>
                      totals[key] > 0 && (
                        <div
                          key={key}
                          title={`${META[key].label}: ${totals[key]}`}
                          style={{
                            width: `${(totals[key] / totalEmployees) * 100}%`,
                            backgroundColor: META[key].color,
                          }}
                        />
                      )
                  )}
                </div>

                <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-6 lg:gap-x-0 lg:divide-x lg:divide-slate-100">
                  <div className="lg:pr-5">
                    <dt className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-800" />
                      Total karyawan
                    </dt>
                    <dd
                      className={`${D} mt-1 text-4xl font-semibold text-slate-900`}
                    >
                      {totalEmployees}
                    </dd>
                  </div>

                  {SERIES_KEYS.map((key) => (
                    <div key={key} className="lg:px-5">
                      <dt className="flex items-center gap-2 text-sm text-slate-500">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: META[key].color }}
                        />
                        {META[key].label}
                      </dt>
                      <dd
                        className={`${D} mt-1 text-4xl font-semibold text-slate-900`}
                      >
                        {totals[key]}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>

              {/* ================= GRAFIK PER DIVISI ================= */}

              <section className={`${card} mt-6 p-5 sm:p-7`}>
                <h3 className={`${D} text-xl font-semibold text-slate-900`}>
                  Kehadiran per divisi
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Jumlah karyawan per status di setiap divisi.
                </p>

                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                  {SERIES_KEYS.map((key) => (
                    <span
                      key={key}
                      className="flex items-center gap-2 text-xs font-medium text-slate-600"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: META[key].color }}
                      />
                      {META[key].label}
                    </span>
                  ))}
                </div>

                <div
                  className="mt-4 w-full"
                  style={{ height: Math.max(200, chartData.length * 52 + 40) }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
                      barCategoryGap="28%"
                    >
                      <CartesianGrid
                        horizontal={false}
                        stroke="#EEF1F6"
                        strokeDasharray="4 4"
                      />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#94A3B8" }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={96}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#475569" }}
                        tickFormatter={(value: string) =>
                          value.length > 14 ? `${value.slice(0, 13)}…` : value
                        }
                      />
                      <Tooltip
                        content={<DivisionTooltip />}
                        cursor={{ fill: "rgba(14,26,58,0.05)" }}
                      />
                      {SERIES_KEYS.map((key, i) => (
                        <Bar
                          key={key}
                          dataKey={key}
                          stackId="division"
                          fill={META[key].color}
                          barSize={24}
                          radius={
                            (i === SERIES_KEYS.length - 1
                              ? [0, 8, 8, 0]
                              : 0) as any
                          }
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* ================= KARTU DIVISI ================= */}

              <section className="mt-8">
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <h3
                      className={`${D} text-xl font-semibold text-slate-900`}
                    >
                      Detail per divisi
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Pilih divisi untuk melihat siapa saja yang belum absen.
                    </p>
                  </div>

                  <span className="hidden rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200 sm:block">
                    {divisionData.length} divisi
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {divisionData.map((division) => {
                    const complete = division.absentCount === 0;

                    return (
                      <button
                        key={division.name}
                        onClick={() => setSelectedName(division.name)}
                        className={`${card} group p-5 text-left transition hover:border-slate-300 hover:bg-slate-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E1A3A]/30`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className={`${D} flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0E1A3A] text-base font-semibold text-white`}
                            >
                              {initial(division.name)}
                            </div>

                            <div className="min-w-0">
                              <h4 className="truncate text-[15px] font-semibold text-slate-900">
                                {division.name}
                              </h4>
                              <p className="text-xs text-slate-500">
                                {division.total} karyawan
                              </p>
                            </div>
                          </div>

                          <span
                            className={`${badgeBase} ${
                              complete
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : "bg-rose-50 text-rose-700 ring-rose-200"
                            }`}
                          >
                            {complete
                              ? "Lengkap"
                              : `${division.absentCount} belum`}
                          </span>
                        </div>

                        <div className="mt-5 flex items-baseline gap-2">
                          <span
                            className={`${D} text-4xl font-semibold text-slate-900`}
                          >
                            {division.percentage}
                            <span className="text-xl text-slate-400">%</span>
                          </span>
                          <span className="text-sm text-slate-500">
                            {division.presentCount} dari {division.total} sudah
                            absen
                          </span>
                        </div>

                        <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          {SERIES_KEYS.map(
                            (key) =>
                              division.counts[key] > 0 && (
                                <div
                                  key={key}
                                  style={{
                                    width: `${
                                      (division.counts[key] / division.total) *
                                      100
                                    }%`,
                                    backgroundColor: META[key].color,
                                  }}
                                />
                              )
                          )}
                        </div>

                        <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-400 transition group-hover:text-slate-700">
                          <span>Lihat detail</span>
                          <Icon d={ICONS.next} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      {/* ================= MODAL DETAIL DIVISI ================= */}

      {selectedDivision && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4 print:hidden"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedName(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="division-title"
            className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-4 bg-[#0E1A3A] px-5 py-4 text-white sm:px-6 sm:py-5">
              <div className="min-w-0">
                <p className="text-xs capitalize text-slate-300">
                  {formattedDate}
                </p>

                <h3
                  id="division-title"
                  className={`${D} mt-0.5 break-words text-xl font-semibold`}
                >
                  {selectedDivision.name}
                </h3>
              </div>

              <button
                onClick={() => setSelectedName(null)}
                aria-label="Tutup"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/20"
              >
                <Icon d={ICONS.close} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#F2F4F9] p-5 sm:p-6">
              <div className="mb-5 grid grid-cols-3 gap-3">
                {[
                  {
                    label: "Total",
                    value: selectedDivision.total,
                    cls: "text-slate-900",
                  },
                  {
                    label: "Sudah absen",
                    value: selectedDivision.presentCount,
                    cls: "text-emerald-600",
                  },
                  {
                    label: "Belum absen",
                    value: selectedDivision.absentCount,
                    cls: "text-rose-600",
                  },
                ].map((tile) => (
                  <div
                    key={tile.label}
                    className="rounded-xl border border-slate-200/70 bg-white p-3.5 sm:p-4"
                  >
                    <p className="text-xs text-slate-500">{tile.label}</p>
                    <p
                      className={`${D} mt-1 text-2xl font-semibold sm:text-3xl ${tile.cls}`}
                    >
                      {tile.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-slate-800">
                      Belum absen ({selectedDivision.absentCount})
                    </h4>

                    {selectedDivision.absentCount > 0 && (
                      <button
                        onClick={() => copyAbsent(selectedDivision)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                      >
                        <Icon d={ICONS.copy} className="h-3.5 w-3.5" />
                        Salin nama
                      </button>
                    )}
                  </div>

                  {selectedDivision.absent.length === 0 ? (
                    <div className="rounded-xl bg-emerald-50 p-5 text-center text-sm font-semibold text-emerald-700">
                      Semua sudah absen
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {selectedDivision.absent.map((member) => (
                        <MemberRow key={member.profile.id} member={member} />
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h4 className="mb-3 text-sm font-semibold text-slate-800">
                    Sudah absen ({selectedDivision.presentCount})
                  </h4>

                  {selectedDivision.present.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-400">
                      Belum ada yang absen.
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {selectedDivision.present.map((member) => (
                        <MemberRow key={member.profile.id} member={member} />
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                onClick={() => setSelectedName(null)}
                className="h-11 w-full rounded-xl bg-[#0E1A3A] px-6 text-sm font-semibold text-white transition hover:bg-[#1a2a5a] sm:w-auto"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= VERSI CETAK ================= */}

      <section className="hidden text-slate-900 print:block">
        <h1 className="text-xl font-bold">{companyName}</h1>

        <p className="mt-0.5 text-sm">Rekap kehadiran, {formattedDate}</p>

        <p className="mt-1 text-sm">
          {totalPresent} dari {totalEmployees} karyawan sudah absen (
          {attendancePercentage}%)
          {holiday ? `. Libur: ${holiday}` : isWeekend ? ". Akhir pekan" : ""}
        </p>

        {divisionData.map((division) => (
          <div key={division.name} className="mt-5 break-inside-avoid">
            <h2 className="border-b border-slate-400 pb-1 text-sm font-bold">
              {division.name}: {division.presentCount} dari {division.total}{" "}
              sudah absen
            </h2>

            <div className="mt-2 grid grid-cols-2 gap-6 text-xs">
              <div>
                <p className="mb-1 font-semibold">
                  Belum absen ({division.absentCount})
                </p>

                {division.absent.length ? (
                  <ol className="list-inside list-decimal space-y-0.5">
                    {division.absent.map((m) => (
                      <li key={m.profile.id}>{m.profile.full_name}</li>
                    ))}
                  </ol>
                ) : (
                  <p>Semua sudah absen.</p>
                )}
              </div>

              <div>
                <p className="mb-1 font-semibold">
                  Sudah absen ({division.presentCount})
                </p>

                {division.present.length ? (
                  <ol className="list-inside list-decimal space-y-0.5">
                    {division.present.map((m) => (
                      <li key={m.profile.id}>
                        {m.profile.full_name} (
                        {META[bucketOf(m.att!.status)].label},{" "}
                        {formatTime(m.att!.check_in ?? m.att!.created_at)})
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>Belum ada yang absen.</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </section>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }

          body,
          main {
            background: white !important;
          }
        }
      `}</style>
    </main>
  );
}
