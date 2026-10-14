"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
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
// FONT & TOKEN DESAIN (sama dengan halaman lainnya)
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

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const TIME_ZONE = "Asia/Jakarta";

type DayKey = "present" | "late" | "sick" | "leave" | "absent";

const DAY_KEYS: DayKey[] = ["present", "late", "sick", "leave", "absent"];

const META: Record<DayKey, { label: string; color: string; text: string }> = {
  present: { label: "Tepat waktu", color: "#10B981", text: "text-emerald-600" },
  late: { label: "Terlambat", color: "#EAB308", text: "text-yellow-600" },
  sick: { label: "Sakit", color: "#F97316", text: "text-orange-600" },
  leave: { label: "Izin", color: "#8B5CF6", text: "text-violet-600" },
  absent: { label: "Alpa", color: "#F43F5E", text: "text-rose-600" },
};

type SortKey = "absent" | "present" | "division" | "name";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "absent", label: "Tidak hadir terbanyak" },
  { key: "present", label: "Hadir terbanyak" },
  { key: "division", label: "Divisi" },
  { key: "name", label: "Nama A–Z" },
];

const ICONS = {
  back: "M19 12H5m7-7-7 7 7 7",
  chevL: "m15 18-6-6 6-6",
  chevR: "m9 18 6-6-6-6",
  print:
    "M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M6 14h12v7H6z",
  chevDown: "m6 9 6 6 6-6",
};

// =========================================================
// TIPE
// =========================================================

interface Employee {
  id: string;
  full_name: string;
  created_at: string;
  division: string | null;
}

interface Attendance {
  id: string;
  profile_id: string;
  status: string;
  created_at: string;
  check_in: string | null;
  approval_status: string | null;
  rejection_reason: string | null;
}

interface Holiday {
  id: string;
  date: string;
  description: string | null;
}

interface EmployeeSummary {
  id: string;
  name: string;
  division: string | null;
  createdAt: string;

  present: number;
  late: number;
  sick: number;
  leave: number;
  absent: number;
  rejected: number;
  rejectionReasons: string[];

  // Total masuk = Tepat waktu + Terlambat (yang tidak ditolak)
  totalAttendances: number;
  activeDays: number;

  accountCreatedInMonth: boolean;
  accountAfterMonth: boolean;
  monthNotStarted: boolean;
}

interface DailyRow {
  key: string;
  label: string;
  full: string;
  present: number;
  late: number;
  sick: number;
  leave: number;
  absent: number;
}

// =========================================================
// HELPER TANGGAL
// =========================================================

const getDashboardPath = (role: string) => {
  if (role === "owner") return "/owner/dashboard";
  if (role === "admin") return "/admin/dashboard";
  return "/dashboard";
};

function getDateKey(date: string | Date) {
  const value = typeof date === "string" ? new Date(date) : date;

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

const getTodayKey = () => getDateKey(new Date());

const createLocalDate = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day);

const pad = (n: number) => String(n).padStart(2, "0");

function isWeekendKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const dayOfWeek = createLocalDate(year, month, day).getDay();

  return dayOfWeek === 0 || dayOfWeek === 6;
}

function formatCreatedDate(date: string) {
  return new Date(date).toLocaleDateString("id-ID", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getDatesInMonth(year: number, month: number) {
  const daysInMonth = new Date(year, month, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;

    return { day, key: `${year}-${pad(month)}-${pad(day)}` };
  });
}

// Batas bulan menurut Asia/Jakarta, dikonversi ke ISO UTC untuk query
function getMonthRange(year: number, month: number) {
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  return {
    startIso: new Date(`${year}-${pad(month)}-01T00:00:00+07:00`).toISOString(),
    endIso: new Date(
      `${nextYear}-${pad(nextMonth)}-01T00:00:00+07:00`
    ).toISOString(),
    startDate: `${year}-${pad(month)}-01`,
    endDate: `${nextYear}-${pad(nextMonth)}-01`,
  };
}

// Supabase membatasi 1000 baris per query, jadi ambil bertahap
async function fetchAllAttendance(
  ids: string[],
  startIso: string,
  endIso: string
): Promise<Attendance[]> {
  const pageSize = 1000;
  const all: Attendance[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("attendance")
      .select(
        "id, profile_id, status, created_at, check_in, approval_status, rejection_reason"
      )
      .in("profile_id", ids)
      .gte("created_at", startIso)
      .lt("created_at", endIso)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);

    all.push(...((data ?? []) as Attendance[]));

    if (!data || data.length < pageSize) break;
  }

  return all;
}

const divisionLabel = (division: string | null) =>
  division?.trim() || "Belum ada divisi";

// =========================================================
// KOMPONEN KECIL
// =========================================================

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

function Avatar({ name }: { name: string }) {
  return (
    <div
      className={`${D} flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-600`}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </div>
  );
}

function DivisionTag({ division }: { division: string | null }) {
  if (!division?.trim()) {
    return (
      <span className="text-xs italic text-slate-400">Belum ada divisi</span>
    );
  }

  return (
    <span className="inline-flex max-w-full items-center rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
      <span className="truncate">{division}</span>
    </span>
  );
}

function DayTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;

  const row = payload[0].payload;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-slate-800">{row.full}</p>

      {DAY_KEYS.map((key) => (
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

function Num({ value, tone }: { value: number; tone: string }) {
  return (
    <span
      className={`text-sm font-semibold tabular-nums ${
        value === 0 ? "text-slate-300" : tone
      }`}
    >
      {value}
    </span>
  );
}

function noDataText(employee: EmployeeSummary) {
  return employee.monthNotStarted
    ? "Bulan ini belum dimulai."
    : `Akun baru dibuat ${formatCreatedDate(
        employee.createdAt
      )}, jadi belum dihitung bulan ini.`;
}

function EmployeeCard({ employee: e }: { employee: EmployeeSummary }) {
  const noData = e.monthNotStarted || e.accountAfterMonth;

  return (
    <div className={`${card} p-4 sm:p-5`}>
      <div className="flex items-start gap-3">
        <Avatar name={e.name} />

        <div className="min-w-0 flex-1">
          <p className="break-words text-[15px] font-semibold text-slate-900">
            {e.name}
          </p>

          <div className="mt-1.5">
            <DivisionTag division={e.division} />
          </div>
        </div>
      </div>

      {noData ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-500">
          {noDataText(e)}
        </p>
      ) : (
        <>
          {e.accountCreatedInMonth && (
            <p className="mt-3 rounded-xl bg-sky-50 px-3.5 py-2.5 text-xs leading-relaxed text-sky-700">
              Karyawan baru. Dihitung sejak {formatCreatedDate(e.createdAt)}.
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-slate-50 p-3.5">
              <p className="text-xs text-slate-500">Total masuk</p>
              <p
                className={`${D} mt-0.5 text-3xl font-semibold text-slate-900`}
              >
                {e.totalAttendances}
              </p>
              <p className="text-xs text-slate-400">dari {e.activeDays} hari</p>
            </div>

            <div className="rounded-xl bg-rose-50 p-3.5">
              <p className="text-xs text-rose-600">Alpa</p>
              <p
                className={`${D} mt-0.5 text-3xl font-semibold text-rose-600`}
              >
                {e.absent}
              </p>
              <p className="text-xs text-rose-400">hari</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ["present", e.present],
                ["late", e.late],
                ["sick", e.sick],
                ["leave", e.leave],
              ] as [DayKey, number][]
            ).map(([key, value]) => (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: META[key].color }}
                />
                {META[key].label}
                <span className="font-semibold text-slate-900">{value}</span>
              </span>
            ))}

            {e.rejected > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                Ditolak
                <span className="font-semibold text-slate-900">
                  {e.rejected}
                </span>
              </span>
            )}
          </div>

          {e.rejected > 0 && (
            <details className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
              <summary className="cursor-pointer font-semibold">
                Alasan penolakan
              </summary>

              <ul className="mt-2 list-disc space-y-1 pl-4 leading-relaxed">
                {e.rejectionReasons.length ? (
                  e.rejectionReasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))
                ) : (
                  <li>Admin menolak absensi tanpa menuliskan alasan.</li>
                )}
              </ul>
            </details>
          )}
        </>
      )}

      <Link
        href={`/rekap/${e.id}`}
        className="mt-4 flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        Lihat detail
        <Icon d={ICONS.chevR} className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

// =========================================================
// HALAMAN
// =========================================================

export default function MonthlyReportPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [companyName, setCompanyName] = useState("Company Attendance");

  const [selectedMonth, setSelectedMonth] = useState(() =>
    getTodayKey().slice(0, 7)
  );

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const [sortKey, setSortKey] = useState<SortKey>("absent");

  // =========================================================
  // LOAD DATA
  // =========================================================

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
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

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, role, company_id, full_name, companies(name)")
          .eq("id", user.id)
          .single();

        if (profileError || !profile) {
          throw new Error("Profile tidak ditemukan.");
        }

        // Employee tidak boleh melihat rekap
        if (profile.role === "employee") {
          router.replace("/dashboard");
          return;
        }

        const company: any = (profile as any).companies;
        const cName = Array.isArray(company) ? company[0]?.name : company?.name;

        const [yearString, monthString] = selectedMonth.split("-");
        const year = Number(yearString);
        const month = Number(monthString);
        const range = getMonthRange(year, month);

        // ---- karyawan (owner tidak dihitung)
        const { data: employeeData, error: employeeError } = await supabase
          .from("profiles")
          .select("id, full_name, created_at, division")
          .eq("company_id", profile.company_id)
          .neq("role", "owner")
          .order("created_at", { ascending: true });

        if (employeeError) throw new Error(employeeError.message);

        const employeeList = (employeeData ?? []) as Employee[];

        // ---- absensi
        const attendanceList = employeeList.length
          ? await fetchAllAttendance(
              employeeList.map((employee) => employee.id),
              range.startIso,
              range.endIso
            )
          : [];

        // ---- hari libur (yang dibatalkan owner tidak dihitung libur)
        const { data: holidayData, error: holidayError } = await supabase
          .from("holidays")
          .select("id, date, description")
          .eq("is_cancelled", false)
          .gte("date", range.startDate)
          .lt("date", range.endDate)
          .order("date", { ascending: true });

        if (holidayError) {
          console.warn("Gagal mengambil hari libur:", holidayError.message);
        }

        if (cancelled) return;

        setUserRole(profile.role);
        setUserName(profile.full_name || user.email?.split("@")[0] || "User");
        if (cName) setCompanyName(cName);

        setEmployees(employeeList);
        setAttendances(attendanceList);
        setHolidays((holidayData ?? []) as Holiday[]);
      } catch (error: any) {
        if (cancelled) return;

        console.error(error);

        setErrorMessage(
          error?.message || "Terjadi kesalahan saat mengambil data."
        );

        setEmployees([]);
        setAttendances([]);
        setHolidays([]);
      } finally {
        if (!cancelled) setFetching(false);
        setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [selectedMonth, router]);

  // =========================================================
  // INFO BULAN
  // =========================================================

  const todayKey = getTodayKey();
  const currentMonthKey = todayKey.slice(0, 7);
  const currentYear = Number(todayKey.slice(0, 4));

  const monthInfo = useMemo(() => {
    const [yearString, monthString] = selectedMonth.split("-");
    const year = Number(yearString);
    const month = Number(monthString);

    return {
      year,
      month,
      monthName: MONTHS[month - 1],
      isFuture: `${year}-${pad(month)}-01` > getTodayKey(),
      isCurrentMonth: selectedMonth === getTodayKey().slice(0, 7),
    };
  }, [selectedMonth]);

  const formattedMonth = `${monthInfo.monthName} ${monthInfo.year}`;

  const holidayDateSet = useMemo(
    () => new Set(holidays.map((holiday) => String(holiday.date).slice(0, 10))),
    [holidays]
  );

  // Tanggal yang sudah terjadi pada bulan terpilih
  const elapsedDates = useMemo(() => {
    if (monthInfo.isFuture) return [];

    const today = getTodayKey();

    return getDatesInMonth(monthInfo.year, monthInfo.month).filter(
      (item) => !monthInfo.isCurrentMonth || item.key <= today
    );
  }, [monthInfo]);

  // Hari kerja = Senin-Jumat yang bukan hari libur perusahaan
  const workingDays = useMemo(
    () =>
      elapsedDates.filter(
        (item) => !isWeekendKey(item.key) && !holidayDateSet.has(item.key)
      ),
    [elapsedDates, holidayDateSet]
  );

  // =========================================================
  // PERHITUNGAN REKAP
  // =========================================================

  const { rows, daily } = useMemo(() => {
    const { isFuture } = monthInfo;
    const today = getTodayKey();

    const monthStart = createLocalDate(monthInfo.year, monthInfo.month, 1);
    const nextMonthStart = createLocalDate(
      monthInfo.year,
      monthInfo.month + 1,
      1
    );

    const dailyMap = new Map<string, DailyRow>();

    workingDays.forEach((day) => {
      const date = createLocalDate(monthInfo.year, monthInfo.month, day.day);

      dailyMap.set(day.key, {
        key: day.key,
        label: String(day.day),
        full: date.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }),
        present: 0,
        late: 0,
        sick: 0,
        leave: 0,
        absent: 0,
      });
    });

    const byEmployee = new Map<string, Attendance[]>();

    attendances.forEach((item) => {
      const list = byEmployee.get(item.profile_id);

      if (list) list.push(item);
      else byEmployee.set(item.profile_id, [item]);
    });

    const result: EmployeeSummary[] = employees.map((employee) => {
      const createdDate = new Date(employee.created_at);
      const createdKey = getDateKey(employee.created_at);

      const accountAfterMonth = createdDate >= nextMonthStart;
      const accountCreatedInMonth =
        createdDate >= monthStart && createdDate < nextMonthStart;

      // Kelompokkan absensi per tanggal
      const byDate = new Map<string, Attendance[]>();

      (byEmployee.get(employee.id) ?? []).forEach((record) => {
        const key = getDateKey(record.check_in || record.created_at);
        const list = byDate.get(key);

        if (list) list.push(record);
        else byDate.set(key, [record]);
      });

      let present = 0;
      let late = 0;
      let sick = 0;
      let leave = 0;
      let absent = 0;
      let rejected = 0;
      let activeDays = 0;
      const reasons: string[] = [];

      if (!accountAfterMonth && !isFuture) {
        workingDays.forEach((day) => {
          // Tanggal sebelum akun dibuat tidak dihitung
          if (day.key < createdKey) return;

          activeDays++;

          const records = byDate.get(day.key) ?? [];

          // Absensi yang ditolak Admin dianggap tidak valid
          records.forEach((record) => {
            if (record.approval_status !== "rejected") return;

            rejected++;

            const reason = record.rejection_reason?.trim();

            if (reason) reasons.push(reason);
          });

          const first = records.find(
            (record) => record.approval_status !== "rejected"
          );

          let bucket: DayKey | null = null;

          if (first) {
            bucket =
              first.status === "present"
                ? "present"
                : first.status === "late"
                ? "late"
                : first.status === "sakit"
                ? "sick"
                : first.status === "izin"
                ? "leave"
                : "absent";
          } else if (day.key !== today) {
            // Tidak ada absensi valid = alpa.
            // Hari ini belum dihitung agar karyawan masih bisa absen.
            bucket = "absent";
          }

          if (!bucket) return;

          if (bucket === "present") present++;
          if (bucket === "late") late++;
          if (bucket === "sick") sick++;
          if (bucket === "leave") leave++;
          if (bucket === "absent") absent++;

          const row = dailyMap.get(day.key);

          if (row) row[bucket]++;
        });
      }

      return {
        id: employee.id,
        name: employee.full_name || "Tanpa Nama",
        division: employee.division,
        createdAt: employee.created_at,

        present,
        late,
        sick,
        leave,
        absent,
        rejected,
        rejectionReasons: Array.from(new Set(reasons)),

        totalAttendances: present + late,
        activeDays,

        accountCreatedInMonth,
        accountAfterMonth,
        monthNotStarted: isFuture,
      };
    });

    return { rows: result, daily: Array.from(dailyMap.values()) };
  }, [employees, attendances, workingDays, monthInfo]);

  // =========================================================
  // URUTAN
  // =========================================================

  const sortedRows = useMemo(() => {
    const byName = (a: EmployeeSummary, b: EmployeeSummary) =>
      a.name.localeCompare(b.name, "id");

    return [...rows].sort((a, b) => {
      if (sortKey === "name") return byName(a, b);

      if (sortKey === "division") {
        const ad = a.division?.trim();
        const bd = b.division?.trim();

        // Yang belum punya divisi ditaruh paling bawah
        if (!ad !== !bd) return !ad ? 1 : -1;

        return (ad ?? "").localeCompare(bd ?? "", "id") || byName(a, b);
      }

      // Akun tanpa data bulan ini selalu di bawah
      const aEmpty = a.monthNotStarted || a.accountAfterMonth;
      const bEmpty = b.monthNotStarted || b.accountAfterMonth;

      if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;

      if (sortKey === "absent") {
        return (
          b.absent - a.absent ||
          a.totalAttendances - b.totalAttendances ||
          byName(a, b)
        );
      }

      return (
        b.totalAttendances - a.totalAttendances ||
        a.absent - b.absent ||
        byName(a, b)
      );
    });
  }, [rows, sortKey]);

  const divisionMeta = useMemo(() => {
    const map = new Map<
      string,
      { count: number; masuk: number; absent: number }
    >();

    rows.forEach((row) => {
      const key = divisionLabel(row.division);
      const meta = map.get(key) ?? { count: 0, masuk: 0, absent: 0 };

      meta.count++;
      meta.masuk += row.totalAttendances;
      meta.absent += row.absent;

      map.set(key, meta);
    });

    return map;
  }, [rows]);

  // =========================================================
  // STATISTIK PERUSAHAAN
  // =========================================================

  const stats = useMemo(() => {
    const active = rows.filter((row) => !row.accountAfterMonth);

    const sum = (pick: (row: EmployeeSummary) => number) =>
      active.reduce((total, row) => total + pick(row), 0);

    const present = sum((r) => r.present);
    const late = sum((r) => r.late);
    const sick = sum((r) => r.sick);
    const leave = sum((r) => r.leave);
    const absent = sum((r) => r.absent);
    const accounted = present + late + sick + leave + absent;
    const elapsedKeys = new Set(elapsedDates.map((d) => d.key));

    return {
      employees: active.length,
      totals: { present, late, sick, leave, absent } as Record<DayKey, number>,
      rejected: sum((r) => r.rejected),
      masuk: present + late,
      accounted,
      rate: accounted ? Math.round(((present + late) / accounted) * 100) : 0,
      workingDays: workingDays.length,
      weekends: elapsedDates.filter((d) => isWeekendKey(d.key)).length,
      holidays: holidays.filter((h) => {
        const key = String(h.date).slice(0, 10);

        return elapsedKeys.has(key) && !isWeekendKey(key);
      }).length,
    };
  }, [rows, workingDays, elapsedDates, holidays]);

  const hasDaily = daily.some(
    (d) => d.present + d.late + d.sick + d.leave + d.absent > 0
  );

  // =========================================================
  // NAVIGASI BULAN
  // =========================================================

  const minYear = currentYear - 3;
  const maxYear = currentYear + 1;
  const yearOptions = Array.from(
    { length: maxYear - minYear + 1 },
    (_, i) => minYear + i
  );

  const shiftMonth = (delta: number) => {
    let year = monthInfo.year;
    let month = monthInfo.month + delta;

    if (month < 1) {
      month = 12;
      year--;
    }

    if (month > 12) {
      month = 1;
      year++;
    }

    if (year >= minYear && year <= maxYear) {
      setSelectedMonth(`${year}-${pad(month)}`);
    }
  };

  const atMin = monthInfo.year === minYear && monthInfo.month === 1;
  const atMax = monthInfo.year === maxYear && monthInfo.month === 12;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
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
            Menyiapkan rekap bulanan...
          </p>
        </div>
      </main>
    );
  }

  const roleLabel =
    userRole === "owner" ? "Owner" : userRole === "admin" ? "Admin" : userRole;

  const sortLabel = SORTS.find((s) => s.key === sortKey)?.label ?? "";

  const summary = monthInfo.isFuture
    ? "Bulan ini belum dimulai, jadi kehadiran dan alpa belum dihitung."
    : stats.employees === 0
    ? "Belum ada karyawan yang terdaftar pada bulan ini."
    : `${stats.masuk} kali masuk, ${
        stats.totals.sick + stats.totals.leave
      } sakit atau izin, dan ${stats.totals.absent} alpa dari ${
        stats.accounted
      } hari kerja karyawan.`;

  const groupByDivision = sortKey === "division";

  const headerCell = "px-3 py-3.5 text-center";

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main
      className={`${BASE} min-h-screen bg-[#F2F4F9] pb-16 text-slate-800 print:bg-white print:pb-0`}
    >
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
              <p className="text-xs text-slate-500">Rekap bulanan</p>
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

      {/* ================= VERSI CETAK ================= */}

      <div className="mx-auto hidden max-w-6xl px-2 pb-6 text-slate-900 print:block">
        <div className="flex items-center gap-4 border-b-2 border-black pb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/svara.png"
            alt=""
            className="h-14 w-28 object-contain"
          />

          <div>
            <h1 className="text-xl font-bold">{companyName}</h1>
            <p className="text-sm font-semibold">
              Laporan rekapitulasi kehadiran, {formattedMonth}
            </p>
            <p className="mt-1 text-xs">
              Hari kerja: {stats.workingDays}. Total masuk: {stats.masuk}. Total
              alpa: {stats.totals.absent}. Total ditolak: {stats.rejected}.
            </p>
            <p className="text-xs">Urutan: {sortLabel}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-8 sm:pt-8 print:p-0">
        {/* ================= JUDUL & KONTROL BULAN ================= */}

        <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between print:hidden">
          <div>
            <h2
              className={`${D} text-3xl font-semibold text-slate-900 sm:text-4xl`}
            >
              Rekap bulanan
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500">
              Ringkasan kehadiran tiap karyawan berdasarkan hari kerja.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white">
              <button
                onClick={() => shiftMonth(-1)}
                disabled={atMin}
                aria-label="Bulan sebelumnya"
                className="flex h-11 w-11 items-center justify-center rounded-l-xl text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <Icon d={ICONS.chevL} />
              </button>

              <div className="relative border-x border-slate-200">
                <label htmlFor="rekap-month" className="sr-only">
                  Bulan
                </label>
                <select
                  id="rekap-month"
                  value={monthInfo.month}
                  onChange={(e) =>
                    setSelectedMonth(`${monthInfo.year}-${pad(Number(e.target.value))}`)
                  }
                  className="h-11 appearance-none bg-transparent pl-3 pr-8 text-base font-semibold text-slate-700 focus:outline-none sm:text-sm"
                >
                  {MONTHS.map((name, i) => (
                    <option key={name} value={i + 1}>
                      {name}
                    </option>
                  ))}
                </select>
                <Icon
                  d={ICONS.chevDown}
                  className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                />
              </div>

              <div className="relative border-r border-slate-200">
                <label htmlFor="rekap-year" className="sr-only">
                  Tahun
                </label>
                <select
                  id="rekap-year"
                  value={monthInfo.year}
                  onChange={(e) =>
                    setSelectedMonth(`${e.target.value}-${pad(monthInfo.month)}`)
                  }
                  className="h-11 appearance-none bg-transparent pl-3 pr-8 text-base font-semibold text-slate-700 focus:outline-none sm:text-sm"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <Icon
                  d={ICONS.chevDown}
                  className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                />
              </div>

              <button
                onClick={() => shiftMonth(1)}
                disabled={atMax}
                aria-label="Bulan berikutnya"
                className="flex h-11 w-11 items-center justify-center rounded-r-xl text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <Icon d={ICONS.chevR} />
              </button>
            </div>

            {selectedMonth !== currentMonthKey && (
              <button
                onClick={() => setSelectedMonth(currentMonthKey)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Bulan ini
              </button>
            )}

            <button
              onClick={() => window.print()}
              aria-label="Cetak laporan"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0E1A3A] px-4 text-sm font-semibold text-white transition hover:bg-[#1a2a5a]"
            >
              <Icon d={ICONS.print} />
              <span className="hidden sm:inline">Cetak</span>
            </button>
          </div>
        </section>

        <div
          aria-busy={fetching}
          className={`transition-opacity ${fetching ? "opacity-60" : ""}`}
        >
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 print:hidden"
            >
              <p className="text-sm font-semibold text-rose-800">
                Terjadi kesalahan
              </p>
              <p className="mt-1 text-sm text-rose-600">{errorMessage}</p>
            </div>
          )}

          {/* ================= HERO ================= */}

          <section className="rounded-[28px] bg-[#0E1A3A] p-6 text-white sm:p-10 print:hidden">
            <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {monthInfo.isCurrentMonth && (
                    <span className="rounded-full bg-[#5EEAD4] px-3 py-1 text-xs font-semibold text-[#0E1A3A]">
                      Bulan berjalan
                    </span>
                  )}

                  {!monthInfo.isFuture && (
                    <>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
                        {stats.workingDays} hari kerja
                      </span>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
                        {stats.weekends} akhir pekan
                      </span>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
                        {stats.holidays} hari libur
                      </span>
                    </>
                  )}

                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
                    {stats.employees} karyawan
                  </span>
                </div>

                <h3
                  className={`${D} mt-4 text-4xl font-semibold leading-tight sm:text-5xl`}
                >
                  {formattedMonth}
                </h3>

                <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-slate-300">
                  {summary}
                </p>
              </div>

              {!monthInfo.isFuture && (
                <div className="relative mx-auto h-52 w-52 shrink-0 sm:h-56 sm:w-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      data={[{ name: "Kehadiran", value: stats.rate }]}
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
                      {stats.rate}
                      <span className="text-2xl text-slate-400">%</span>
                    </span>
                    <span className="mt-1 text-xs text-slate-300">
                      tingkat kehadiran
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ================= RINGKASAN ANGKA ================= */}

          <section className={`${card} mt-6 p-5 sm:p-6 print:hidden`}>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              {DAY_KEYS.map(
                (key) =>
                  stats.totals[key] > 0 && (
                    <div
                      key={key}
                      title={`${META[key].label}: ${stats.totals[key]}`}
                      style={{
                        width: `${(stats.totals[key] / stats.accounted) * 100}%`,
                        backgroundColor: META[key].color,
                      }}
                    />
                  )
              )}
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-6 lg:gap-x-0 lg:divide-x lg:divide-slate-100">
              {DAY_KEYS.map((key, i) => (
                <div key={key} className={i === 0 ? "lg:pr-5" : "lg:px-5"}>
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
                    {stats.totals[key]}
                  </dd>
                </div>
              ))}

              <div className="lg:pl-5">
                <dt className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                  Ditolak
                </dt>
                <dd
                  className={`${D} mt-1 text-4xl font-semibold text-slate-900`}
                >
                  {stats.rejected}
                </dd>
              </div>
            </dl>
          </section>

          {/* ================= GRAFIK HARIAN ================= */}

          {!monthInfo.isFuture && (
            <section className={`${card} mt-6 p-5 sm:p-7 print:hidden`}>
              <h3 className={`${D} text-xl font-semibold text-slate-900`}>
                Kehadiran harian
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Jumlah karyawan per status di setiap hari kerja.
              </p>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                {DAY_KEYS.map((key) => (
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

              {hasDaily ? (
                <div className="mt-4 h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={daily}
                      margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        vertical={false}
                        stroke="#EEF1F6"
                        strokeDasharray="4 4"
                      />
                      <XAxis
                        dataKey="label"
                        interval="preserveStartEnd"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#64748B" }}
                      />
                      <YAxis
                        allowDecimals={false}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#94A3B8" }}
                      />
                      <Tooltip
                        content={<DayTooltip />}
                        cursor={{ fill: "rgba(14,26,58,0.05)" }}
                      />
                      {DAY_KEYS.map((key, i) => (
                        <Bar
                          key={key}
                          dataKey={key}
                          stackId="day"
                          fill={META[key].color}
                          maxBarSize={22}
                          radius={
                            (i === DAY_KEYS.length - 1
                              ? [6, 6, 0, 0]
                              : 0) as any
                          }
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="mt-4 flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                  Belum ada data kehadiran pada bulan ini.
                </div>
              )}
            </section>
          )}

          {/* ================= CATATAN PERHITUNGAN ================= */}

          <section className="mt-6 rounded-2xl border border-slate-200/70 bg-white/60 p-4 sm:p-5 print:hidden">
            <h3 className="text-sm font-semibold text-slate-700">
              Cara menghitung
            </h3>

            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
              Hari kerja adalah Senin sampai Jumat yang bukan hari libur
              perusahaan. Alpa hanya dihitung pada hari kerja yang sudah lewat,
              jadi hari ini belum dihitung. Akhir pekan, hari libur, tanggal
              sebelum akun dibuat, dan bulan yang belum dimulai tidak dihitung.
              Total masuk adalah tepat waktu ditambah terlambat. Absensi yang
              ditolak tidak dihitung sebagai masuk.
            </p>
          </section>

          {/* ================= DAFTAR ================= */}

          <section className="mt-8 print:mt-4">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between print:hidden">
              <div className="flex items-center gap-3">
                <h3
                  className={`${D} text-xl font-semibold text-slate-900 sm:text-2xl`}
                >
                  Daftar karyawan
                </h3>

                <span className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                  {formattedMonth}
                </span>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="text-sm font-semibold text-slate-600">
                  Urutkan
                </span>

                <div
                  role="group"
                  aria-label="Urutkan daftar karyawan"
                  className="grid grid-cols-2 gap-2 sm:flex"
                >
                  {SORTS.map((sort) => {
                    const active = sortKey === sort.key;

                    return (
                      <button
                        key={sort.key}
                        onClick={() => setSortKey(sort.key)}
                        aria-pressed={active}
                        className={`h-10 rounded-xl border px-3.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E1A3A]/30 ${
                          active
                            ? "border-[#0E1A3A] bg-[#0E1A3A] text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {sort.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {sortedRows.length === 0 ? (
              <div
                className={`${card} flex min-h-[260px] items-center justify-center border-dashed p-8 text-center`}
              >
                <div>
                  <h4 className={`${D} text-xl font-semibold text-slate-800`}>
                    Belum ada karyawan
                  </h4>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
                    Belum ada karyawan yang terdaftar di perusahaan ini.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* KARTU: HP & tablet */}

                <div className="rekap-cards grid gap-3 sm:grid-cols-2 lg:hidden">
                  {sortedRows.map((employee, index) => {
                    const label = divisionLabel(employee.division);
                    const showGroup =
                      groupByDivision &&
                      (index === 0 ||
                        divisionLabel(sortedRows[index - 1].division) !== label);
                    const meta = divisionMeta.get(label);

                    return (
                      <div key={employee.id} className="contents">
                        {showGroup && (
                          <div
                            className={`col-span-full flex items-baseline justify-between gap-3 ${
                              index === 0 ? "" : "pt-3"
                            }`}
                          >
                            <h4 className="text-sm font-semibold text-slate-800">
                              {label}
                            </h4>
                            <span className="text-xs text-slate-500">
                              {meta?.count} karyawan, {meta?.absent} alpa
                            </span>
                          </div>
                        )}

                        <EmployeeCard employee={employee} />
                      </div>
                    );
                  })}
                </div>

                {/* TABEL: layar lebar */}

                <div
                  className={`${card} rekap-table hidden overflow-hidden lg:block`}
                >
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold text-slate-400">
                        <th scope="col" className="px-6 py-3.5">
                          Karyawan
                        </th>
                        <th scope="col" className={headerCell}>
                          Tepat waktu
                        </th>
                        <th scope="col" className={headerCell}>
                          Terlambat
                        </th>
                        <th scope="col" className={headerCell}>
                          Sakit
                        </th>
                        <th scope="col" className={headerCell}>
                          Izin
                        </th>
                        <th scope="col" className={headerCell}>
                          Alpa
                        </th>
                        <th scope="col" className={headerCell}>
                          Ditolak
                        </th>
                        <th scope="col" className={headerCell}>
                          Total masuk
                        </th>
                        <th scope="col" className={headerCell}>
                          Hari kerja
                        </th>
                        <th scope="col" className="px-6 py-3.5 print:hidden">
                          <span className="sr-only">Detail</span>
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {sortedRows.map((employee, index) => {
                        const label = divisionLabel(employee.division);
                        const showGroup =
                          groupByDivision &&
                          (index === 0 ||
                            divisionLabel(sortedRows[index - 1].division) !==
                              label);
                        const meta = divisionMeta.get(label);
                        const noData =
                          employee.monthNotStarted || employee.accountAfterMonth;

                        return (
                          <Fragment key={employee.id}>
                            {showGroup && (
                              <tr className="bg-slate-50/80">
                                <td
                                  colSpan={10}
                                  className="px-6 py-2.5 text-sm font-semibold text-slate-700"
                                >
                                  {label}
                                  <span className="ml-3 text-xs font-medium text-slate-400">
                                    {meta?.count} karyawan, {meta?.absent} alpa
                                  </span>
                                </td>
                              </tr>
                            )}

                            <tr className="transition-colors hover:bg-slate-50/60 print:break-inside-avoid">
                              <td className="px-6 py-3.5">
                                <div className="flex items-center gap-3">
                                  <Avatar name={employee.name} />

                                  <div className="min-w-0">
                                    <Link
                                      href={`/rekap/${employee.id}`}
                                      className="block max-w-[14rem] truncate text-sm font-semibold text-slate-900 hover:underline"
                                    >
                                      {employee.name}
                                    </Link>

                                    {!groupByDivision && (
                                      <p className="max-w-[14rem] truncate text-xs text-slate-500">
                                        {label}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {noData ? (
                                <td
                                  colSpan={8}
                                  className="px-3 py-3.5 text-sm italic text-slate-400"
                                >
                                  {noDataText(employee)}
                                </td>
                              ) : (
                                <>
                                  <td className="px-3 py-3.5 text-center">
                                    <Num
                                      value={employee.present}
                                      tone={META.present.text}
                                    />
                                  </td>
                                  <td className="px-3 py-3.5 text-center">
                                    <Num
                                      value={employee.late}
                                      tone={META.late.text}
                                    />
                                  </td>
                                  <td className="px-3 py-3.5 text-center">
                                    <Num
                                      value={employee.sick}
                                      tone={META.sick.text}
                                    />
                                  </td>
                                  <td className="px-3 py-3.5 text-center">
                                    <Num
                                      value={employee.leave}
                                      tone={META.leave.text}
                                    />
                                  </td>
                                  <td className="px-3 py-3.5 text-center">
                                    <Num
                                      value={employee.absent}
                                      tone="text-rose-600"
                                    />
                                  </td>
                                  <td
                                    className="px-3 py-3.5 text-center"
                                    title={
                                      employee.rejected > 0
                                        ? employee.rejectionReasons.length
                                          ? employee.rejectionReasons.join("\n")
                                          : "Admin menolak tanpa menuliskan alasan."
                                        : undefined
                                    }
                                  >
                                    <Num
                                      value={employee.rejected}
                                      tone="text-slate-600"
                                    />
                                  </td>
                                  <td className="px-3 py-3.5 text-center">
                                    <span
                                      className={`${D} text-base font-semibold tabular-nums text-slate-900`}
                                    >
                                      {employee.totalAttendances}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3.5 text-center">
                                    <span className="text-sm tabular-nums text-slate-500">
                                      {employee.activeDays}
                                    </span>
                                  </td>
                                </>
                              )}

                              <td className="px-6 py-3.5 text-right print:hidden">
                                <Link
                                  href={`/rekap/${employee.id}`}
                                  aria-label={`Detail ${employee.name}`}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                                >
                                  <Icon d={ICONS.chevR} />
                                </Link>
                              </td>
                            </tr>
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {/* Cetak: paksa tabel tampil, kartu disembunyikan */}

      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 10mm;
          }

          body,
          main {
            background: white !important;
          }

          .rekap-table {
            display: block !important;
            border: none !important;
          }

          .rekap-cards {
            display: none !important;
          }
        }
      `}</style>
    </main>
  );
}
