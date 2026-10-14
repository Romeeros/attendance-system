"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Bricolage_Grotesque, Figtree } from "next/font/google";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/lib/supabase";

// =========================================================
// FONT & TOKEN DESAIN (sama dengan Rekap bulanan & Log absensi)
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
  "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset";

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

// Minimal hari masuk sebelum arah naik atau turun dibaca
const MIN_TREND_DAYS = 4;

const NOT_FOUND_MESSAGE = "Karyawan tidak ditemukan.";

const ATTENDANCE_COLUMNS =
  "id, status, created_at, check_in, check_out, reason, approval_status, rejection_reason, task_list, latitude, longitude, latitude_out, longitude_out";

type DayKey = "present" | "late" | "sick" | "leave" | "absent";

const DAY_KEYS: DayKey[] = ["present", "late", "sick", "leave", "absent"];

const META: Record<
  DayKey,
  { label: string; color: string; text: string; badge: string }
> = {
  present: {
    label: "Tepat waktu",
    color: "#10B981",
    text: "text-emerald-600",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  late: {
    label: "Terlambat",
    color: "#EAB308",
    text: "text-yellow-600",
    badge: "bg-yellow-50 text-yellow-700 ring-yellow-200",
  },
  sick: {
    label: "Sakit",
    color: "#F97316",
    text: "text-orange-600",
    badge: "bg-orange-50 text-orange-700 ring-orange-200",
  },
  leave: {
    label: "Izin",
    color: "#8B5CF6",
    text: "text-violet-600",
    badge: "bg-violet-50 text-violet-700 ring-violet-200",
  },
  absent: {
    label: "Alpa",
    color: "#F43F5E",
    text: "text-rose-600",
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
  },
};

const NEUTRAL_BADGE = "bg-slate-50 text-slate-600 ring-slate-200";

const APPROVAL = {
  pending: {
    label: "Menunggu",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  approved: {
    label: "Disetujui",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
} as const;

type TrendState = "up" | "down" | "flat" | "short" | "none";

const ICONS = {
  back: "M19 12H5m7-7-7 7 7 7",
  chevL: "m15 18-6-6 6-6",
  chevR: "m9 18 6-6-6-6",
  chevDown: "m6 9 6 6 6-6",
  print:
    "M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M6 14h12v7H6z",
  close: "M18 6 6 18M6 6l12 12",
  pin: "M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12ZM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  up: "M7 7h10v10M7 17 17 7",
  down: "m7 7 10 10M17 7v10H7",
  flat: "M5 12h14",
};

const TREND_UI: Record<
  TrendState,
  { label: string; badge: string; icon: string }
> = {
  up: {
    label: "Naik",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    icon: ICONS.up,
  },
  down: {
    label: "Turun",
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
    icon: ICONS.down,
  },
  flat: {
    label: "Stabil",
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    icon: ICONS.flat,
  },
  short: {
    label: "Data belum cukup",
    badge: NEUTRAL_BADGE,
    icon: ICONS.flat,
  },
  none: {
    label: "Belum ada laporan",
    badge: NEUTRAL_BADGE,
    icon: ICONS.flat,
  },
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
  status: string | null;
  created_at: string;
  check_in: string | null;
  check_out: string | null;
  reason: string | null;
  approval_status: string | null;
  rejection_reason: string | null;
  task_list: string[] | null;
  latitude: number | null;
  longitude: number | null;
  latitude_out: number | null;
  longitude_out: number | null;
}

interface Holiday {
  id: string;
  date: string;
  description: string | null;
}

interface DayRow {
  key: string;
  weekday: string;
  dayNumber: number;
  full: string;

  // Hari kerja yang ikut dihitung di rekap
  counted: boolean;
  // Alasan hari ini tidak dihitung (akhir pekan, libur, sebelum akun dibuat)
  note: string | null;

  bucket: DayKey | null;
  // Hari ini belum absen. Belum dihitung alpa.
  awaiting: boolean;

  primary: Attendance | null;
  rejected: Attendance[];
  tasks: string[];
}

interface ChartRow {
  key: string;
  label: string;
  full: string;
  status: DayKey | null;
  tasks: number | null;
  trend: number | null;
}

interface TrendInfo {
  state: TrendState;
  start: number;
  end: number;
  total: number;
  activeDays: number;
  reportDays: number;
  average: number;
  best: { full: string; count: number } | null;
}

// =========================================================
// HELPER
// =========================================================

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

// Format tanggal dari kunci YYYY-MM-DD tanpa bergeser zona waktu
function formatKey(key: string, options: Intl.DateTimeFormatOptions) {
  return new Date(`${key}T12:00:00+07:00`).toLocaleDateString("id-ID", {
    timeZone: TIME_ZONE,
    ...options,
  });
}

const FULL_DATE: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
};

function formatCreatedDate(date: string) {
  return new Date(date).toLocaleDateString("id-ID", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(value: string | null) {
  if (!value) return "--:--";

  return new Date(value).toLocaleTimeString("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

const fmt = (n: number) =>
  n.toLocaleString("id-ID", { maximumFractionDigits: 1 });

const round2 = (n: number) => Math.round(n * 100) / 100;

const normalizeApproval = (value: string | null): "pending" | "approved" =>
  value === "approved" ? "approved" : "pending";

const bucketOf = (status: string | null): DayKey =>
  status === "present"
    ? "present"
    : status === "late"
    ? "late"
    : status === "sakit"
    ? "sick"
    : status === "izin"
    ? "leave"
    : "absent";

const taskListOf = (item: Attendance | null): string[] =>
  item && Array.isArray(item.task_list)
    ? item.task_list
        .filter((task) => typeof task === "string" && task.trim().length > 0)
        .map((task) => task.trim())
    : [];

const hasCoords = (lat: number | null, lng: number | null) =>
  typeof lat === "number" && typeof lng === "number";

// Bulan awal bisa dikirim lewat ?bulan=YYYY-MM dari halaman Rekap
function getInitialMonth() {
  const fallback = getTodayKey().slice(0, 7);

  if (typeof window === "undefined") return fallback;

  const value = new URLSearchParams(window.location.search).get("bulan");

  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return fallback;

  const year = Number(value.slice(0, 4));
  const currentYear = Number(fallback.slice(0, 4));

  return year >= currentYear - 3 && year <= currentYear + 1 ? value : fallback;
}

// Garis tren (regresi linear) dari jumlah pekerjaan per hari masuk
function analyzeTrend(chartRows: ChartRow[]): TrendInfo {
  const points = chartRows
    .filter((row) => row.tasks !== null)
    .map((row) => ({ row, x: Number(row.label), y: row.tasks as number }));

  const activeDays = points.length;
  const total = points.reduce((sum, p) => sum + p.y, 0);
  const reportDays = points.filter((p) => p.y > 0).length;
  const average = activeDays ? total / activeDays : 0;

  let best: TrendInfo["best"] = null;

  for (const p of points) {
    if (p.y > 0 && (!best || p.y > best.count)) {
      best = { full: p.row.full, count: p.y };
    }
  }

  const base: TrendInfo = {
    state: "none",
    start: 0,
    end: 0,
    total,
    activeDays,
    reportDays,
    average,
    best,
  };

  if (total === 0) return base;
  if (activeDays < MIN_TREND_DAYS) return { ...base, state: "short" };

  const meanX = points.reduce((sum, p) => sum + p.x, 0) / activeDays;

  let numerator = 0;
  let denominator = 0;

  for (const p of points) {
    numerator += (p.x - meanX) * (p.y - average);
    denominator += (p.x - meanX) ** 2;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = average - slope * meanX;

  const start = Math.max(0, intercept + slope * points[0].x);
  const end = Math.max(0, intercept + slope * points[points.length - 1].x);
  const change = end - start;
  const threshold = Math.max(0.5, average * 0.1);

  const state: TrendState =
    Math.abs(change) < threshold ? "flat" : change > 0 ? "up" : "down";

  points.forEach((p) => {
    p.row.trend = round2(Math.max(0, intercept + slope * p.x));
  });

  return { ...base, state, start, end };
}

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

function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  return (
    <div
      className={`${D} flex shrink-0 items-center justify-center bg-slate-100 font-semibold text-slate-600 ${
        large
          ? "h-14 w-14 rounded-2xl text-2xl sm:h-16 sm:w-16"
          : "h-10 w-10 rounded-xl text-sm"
      }`}
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

function TrendBadge({ state }: { state: TrendState }) {
  const ui = TREND_UI[state];

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${ui.badge}`}
    >
      <Icon d={ui.icon} className="h-3.5 w-3.5" />
      {ui.label}
    </span>
  );
}

function MiniStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 p-3.5">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`${D} mt-0.5 text-3xl font-semibold text-slate-900`}>
        {value}
      </dd>
      {sub && <p className="mt-0.5 truncate text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function TimeItem({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="font-semibold tabular-nums text-slate-900">{value}</span>
    </span>
  );
}

function TaskTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;

  const row = payload[0].payload as ChartRow;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-slate-800">{row.full}</p>

      <div className="flex items-center justify-between gap-6 py-0.5">
        <span className="text-slate-500">Status</span>
        <span className="font-semibold text-slate-800">
          {row.status ? META[row.status].label : "Belum absen"}
        </span>
      </div>

      <div className="flex items-center justify-between gap-6 py-0.5">
        <span className="text-slate-500">Pekerjaan</span>
        <span className="font-semibold text-slate-800">{row.tasks ?? "-"}</span>
      </div>
    </div>
  );
}

// =========================================================
// BARIS RIWAYAT HARIAN
// =========================================================

function DayRowCard({
  row,
  onOpen,
}: {
  row: DayRow;
  onOpen: (row: DayRow) => void;
}) {
  const { primary } = row;

  const shownBucket = row.bucket ?? (primary ? bucketOf(primary.status) : null);
  const approval = primary ? normalizeApproval(primary.approval_status) : null;
  const noClock = primary?.status === "sakit" || primary?.status === "izin";
  const taskCount = row.tasks.length;
  const reason = primary?.reason?.trim();

  const hasDetail =
    !!primary &&
    (taskCount > 0 ||
      hasCoords(primary.latitude, primary.longitude) ||
      hasCoords(primary.latitude_out, primary.longitude_out));

  return (
    <div className="p-4 transition-colors hover:bg-slate-50/60 sm:p-5 print:break-inside-avoid">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-100">
          <span className="text-[10px] font-semibold text-slate-400">
            {row.weekday}
          </span>
          <span
            className={`${D} text-lg font-semibold leading-none text-slate-800`}
          >
            {row.dayNumber}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h4 className="break-words text-sm font-semibold text-slate-900 sm:text-[15px]">
                {row.full}
              </h4>

              {primary && (
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <TimeItem
                    label={noClock ? "Laporan" : "Masuk"}
                    value={formatTime(primary.check_in)}
                  />

                  {!noClock && (
                    <TimeItem
                      label="Pulang"
                      value={formatTime(primary.check_out)}
                    />
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {shownBucket && (
                <span className={`${badgeBase} ${META[shownBucket].badge}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {META[shownBucket].label}
                </span>
              )}

              {row.awaiting && (
                <span className={`${badgeBase} ${NEUTRAL_BADGE}`}>
                  Belum absen
                </span>
              )}

              {approval && (
                <span className={`${badgeBase} ${APPROVAL[approval].badge}`}>
                  {APPROVAL[approval].label}
                </span>
              )}

              {row.note && (
                <span className={`${badgeBase} ${NEUTRAL_BADGE}`}>
                  {row.note}
                </span>
              )}
            </div>
          </div>

          {row.note && primary && (
            <p className="mt-2 text-xs text-slate-400">
              Hari ini tidak dihitung di rekap.
            </p>
          )}

          {row.bucket === "absent" && !primary && row.rejected.length === 0 && (
            <p className="mt-2 text-xs italic text-slate-400">
              Tidak ada catatan absensi pada hari ini.
            </p>
          )}

          {row.rejected.map((record) => (
            <div
              key={record.id}
              className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs leading-relaxed text-rose-700"
            >
              <span className="font-semibold">
                Absensi ditolak ({formatTime(record.check_in)}):{" "}
              </span>
              {record.rejection_reason?.trim() ||
                "Admin menolak absensi tanpa menuliskan alasan."}
            </div>
          ))}

          {reason && (
            <div className="mt-3 rounded-xl bg-slate-50 px-3.5 py-2.5">
              <p className="text-xs text-slate-400">Keterangan</p>
              <p className="mt-0.5 break-words text-sm italic leading-relaxed text-slate-600">
                {reason}
              </p>
            </div>
          )}

          {taskCount > 0 && (
            <div className="mt-3 rounded-xl bg-emerald-50/70 px-3.5 py-2.5">
              <p className="text-xs font-semibold text-emerald-700">
                Laporan pekerjaan ({taskCount})
              </p>

              <p className="mt-0.5 line-clamp-2 break-words text-sm leading-relaxed text-slate-700 print:hidden">
                {row.tasks[0]}
                {taskCount > 1 ? `, dan ${taskCount - 1} lainnya` : ""}
              </p>

              <ol className="mt-1 hidden list-decimal space-y-0.5 pl-5 text-sm leading-relaxed text-slate-700 print:block">
                {row.tasks.map((task, index) => (
                  <li key={index}>{task}</li>
                ))}
              </ol>
            </div>
          )}

          {hasDetail && (
            <button
              type="button"
              onClick={() => onOpen(row)}
              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto sm:px-4 print:hidden"
            >
              Lihat detail
              <Icon d={ICONS.chevR} className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================
// MODAL DETAIL HARIAN
// =========================================================

function LocationCard({
  title,
  lat,
  lng,
}: {
  title: string;
  lat: number | null;
  lng: number | null;
}) {
  if (typeof lat !== "number" || typeof lng !== "number") {
    return (
      <div className="flex items-center rounded-xl bg-white p-4 text-xs italic text-slate-400 ring-1 ring-slate-100">
        {title} tidak tersedia.
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <p className="text-xs text-slate-400">{title}</p>

      <p className="mt-1.5 break-all text-sm font-semibold tabular-nums text-slate-800">
        {lat.toFixed(6)}, {lng.toFixed(6)}
      </p>

      <a
        href={`https://www.google.com/maps?q=${lat},${lng}`}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#0E1A3A] px-4 text-xs font-semibold text-white transition hover:bg-[#1a2a5a]"
      >
        <Icon d={ICONS.pin} className="h-3.5 w-3.5" />
        Buka Google Maps
      </a>
    </div>
  );
}

function DetailModal({
  row,
  employee,
  onClose,
  onDownload,
}: {
  row: DayRow;
  employee: Employee;
  onClose: () => void;
  onDownload: (row: DayRow) => void;
}) {
  // Kunci scroll body dan tutup dengan Esc
  useEffect(() => {
    const previous = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const item = row.primary;

  if (!item) return null;

  const noClock = item.status === "sakit" || item.status === "izin";
  const hasLocation =
    hasCoords(item.latitude, item.longitude) ||
    hasCoords(item.latitude_out, item.longitude_out);
  const reason = item.reason?.trim();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4 print:hidden"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 bg-[#0E1A3A] px-5 py-4 text-white sm:px-6 sm:py-5">
          <div className="min-w-0">
            <p className="text-xs text-slate-300">Laporan pekerjaan harian</p>

            <h3
              id="detail-title"
              className={`${D} mt-0.5 break-words text-xl font-semibold`}
            >
              {employee.full_name}
            </h3>

            <p className="text-sm text-slate-300">
              {employee.division?.trim() || "Belum ada divisi"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/20"
          >
            <Icon d={ICONS.close} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs text-slate-400">Tanggal</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatKey(row.key, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs text-slate-400">
                {noClock ? "Waktu laporan" : "Jam kerja"}
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-slate-800">
                {noClock
                  ? formatTime(item.check_in)
                  : `${formatTime(item.check_in)} – ${formatTime(
                      item.check_out
                    )}`}
              </p>
            </div>

            <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:col-span-1">
              <p className="text-xs text-slate-400">Total pekerjaan</p>
              <p className={`${D} mt-1 text-2xl font-semibold text-slate-900`}>
                {row.tasks.length}
                <span className="ml-1 text-sm font-medium text-slate-400">
                  tugas
                </span>
              </p>
            </div>
          </div>

          {!noClock && (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5">
                <h4 className="text-sm font-semibold text-slate-800">
                  Pekerjaan yang diselesaikan
                </h4>
                <p className="mt-0.5 text-xs text-slate-500">
                  Dilaporkan karyawan saat absen pulang.
                </p>
              </div>

              <ol className="divide-y divide-slate-100">
                {row.tasks.length > 0 ? (
                  row.tasks.map((task, index) => (
                    <li
                      key={`${item.id}-${index}`}
                      className="flex gap-3.5 px-5 py-3.5"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                        {index + 1}
                      </span>

                      <p className="min-w-0 break-words text-sm leading-relaxed text-slate-700">
                        {task}
                      </p>
                    </li>
                  ))
                ) : (
                  <li className="px-5 py-10 text-center text-sm text-slate-400">
                    Belum ada pekerjaan yang dilaporkan.
                  </li>
                )}
              </ol>
            </div>
          )}

          {hasLocation && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
              <h4 className="text-sm font-semibold text-slate-800">
                Lokasi absensi
              </h4>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <LocationCard
                  title="Lokasi masuk"
                  lat={item.latitude}
                  lng={item.longitude}
                />
                <LocationCard
                  title="Lokasi pulang"
                  lat={item.latitude_out}
                  lng={item.longitude_out}
                />
              </div>
            </div>
          )}

          {reason && (
            <div className="mt-5 rounded-xl bg-slate-50 p-4 sm:p-5">
              <p className="text-xs text-slate-400">Keterangan</p>
              <p className="mt-1 break-words text-sm italic leading-relaxed text-slate-600">
                {reason}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Tutup
          </button>

          {row.tasks.length > 0 && (
            <button
              type="button"
              onClick={() => onDownload(row)}
              className="h-11 rounded-xl bg-[#0E1A3A] px-5 text-sm font-semibold text-white transition hover:bg-[#1a2a5a]"
            >
              Simpan sebagai .txt
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================
// HALAMAN
// =========================================================

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams() as Record<string, string | string[] | undefined> | null;

  const rawId = params?.id;
  const employeeId = (Array.isArray(rawId) ? rawId[0] : rawId) ?? "";

  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [companyName, setCompanyName] = useState("Company Attendance");

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [pageError, setPageError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedMonth, setSelectedMonth] = useState(getInitialMonth);

  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  const [selectedRow, setSelectedRow] = useState<DayRow | null>(null);

  const closeModal = useCallback(() => setSelectedRow(null), []);

  // =========================================================
  // LOAD KARYAWAN
  // =========================================================

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setDataLoaded(false);
      setPageError("");
      setEmployee(null);

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

        // Hanya owner dan admin yang boleh melihat detail
        if (profile.role !== "owner" && profile.role !== "admin") {
          router.replace("/dashboard");
          return;
        }

        const company: any = (profile as any).companies;
        const cName = Array.isArray(company) ? company[0]?.name : company?.name;

        // Owner tidak dihitung sebagai karyawan (sama seperti halaman Rekap)
        const { data: employeeData, error: employeeError } = await supabase
          .from("profiles")
          .select("id, full_name, created_at, division")
          .eq("id", employeeId)
          .eq("company_id", profile.company_id)
          .neq("role", "owner")
          .single();

        if (employeeError || !employeeData) {
          throw new Error(NOT_FOUND_MESSAGE);
        }

        if (cancelled) return;

        setUserRole(profile.role);
        setUserName(profile.full_name || user.email?.split("@")[0] || "User");
        if (cName) setCompanyName(cName);

        setEmployee(employeeData as Employee);
      } catch (error: any) {
        if (cancelled) return;

        console.error(error);

        setPageError(
          error?.message || "Terjadi kesalahan saat mengambil data."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [employeeId, router]);

  // =========================================================
  // LOAD ABSENSI & HARI LIBUR PER BULAN
  // =========================================================

  useEffect(() => {
    if (!employee) return;

    let cancelled = false;

    const run = async () => {
      setFetching(true);
      setErrorMessage("");

      try {
        const [yearString, monthString] = selectedMonth.split("-");
        const range = getMonthRange(Number(yearString), Number(monthString));

        const [attendanceResult, holidayResult] = await Promise.all([
          supabase
            .from("attendance")
            .select(ATTENDANCE_COLUMNS)
            .eq("profile_id", employee.id)
            .gte("created_at", range.startIso)
            .lt("created_at", range.endIso)
            .order("created_at", { ascending: true })
            .order("id", { ascending: true }),

          // Hari libur yang dibatalkan owner tidak dihitung libur
          supabase
            .from("holidays")
            .select("id, date, description")
            .eq("is_cancelled", false)
            .gte("date", range.startDate)
            .lt("date", range.endDate)
            .order("date", { ascending: true }),
        ]);

        if (attendanceResult.error) {
          throw new Error(attendanceResult.error.message);
        }

        if (holidayResult.error) {
          console.warn("Gagal mengambil hari libur:", holidayResult.error.message);
        }

        if (cancelled) return;

        setAttendances((attendanceResult.data ?? []) as Attendance[]);
        setHolidays((holidayResult.data ?? []) as Holiday[]);
      } catch (error: any) {
        if (cancelled) return;

        console.error(error);

        setErrorMessage(
          error?.message || "Terjadi kesalahan saat mengambil data."
        );

        setAttendances([]);
        setHolidays([]);
      } finally {
        if (!cancelled) {
          setFetching(false);
          setDataLoaded(true);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [employee, selectedMonth]);

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

  // =========================================================
  // PERHITUNGAN REKAP (aturan sama dengan halaman Rekap)
  // =========================================================

  const report = useMemo(() => {
    if (!employee) return null;

    const today = getTodayKey();
    const range = getMonthRange(monthInfo.year, monthInfo.month);
    const createdKey = getDateKey(employee.created_at);

    const accountAfterMonth = createdKey >= range.endDate;
    const accountCreatedInMonth =
      createdKey >= range.startDate && createdKey < range.endDate;
    const noData = monthInfo.isFuture || accountAfterMonth;

    const holidayNames = new Map<string, string>();

    holidays.forEach((holiday) => {
      holidayNames.set(
        String(holiday.date).slice(0, 10),
        holiday.description?.trim() || ""
      );
    });

    const isHoliday = (key: string) => holidayNames.has(key);
    const isWorking = (key: string) => !isWeekendKey(key) && !isHoliday(key);

    // Tanggal yang sudah terjadi pada bulan terpilih
    const elapsed = monthInfo.isFuture
      ? []
      : getDatesInMonth(monthInfo.year, monthInfo.month).filter(
          (item) => !monthInfo.isCurrentMonth || item.key <= today
        );

    const workingDayCount = elapsed.filter((d) => isWorking(d.key)).length;
    const weekendCount = elapsed.filter((d) => isWeekendKey(d.key)).length;
    const holidayCount = elapsed.filter(
      (d) => isHoliday(d.key) && !isWeekendKey(d.key)
    ).length;

    // Kelompokkan absensi per tanggal
    const byDate = new Map<string, Attendance[]>();

    attendances.forEach((record) => {
      const key = getDateKey(record.check_in || record.created_at);
      const list = byDate.get(key);

      if (list) list.push(record);
      else byDate.set(key, [record]);
    });

    const totals: Record<DayKey, number> = {
      present: 0,
      late: 0,
      sick: 0,
      leave: 0,
      absent: 0,
    };

    let rejected = 0;
    let activeDays = 0;

    const dayRows: DayRow[] = [];
    const chartRows: ChartRow[] = [];

    if (!noData) {
      elapsed.forEach(({ day, key }) => {
        const records = byDate.get(key) ?? [];
        const working = isWorking(key);
        const counted = working && key >= createdKey;

        // Hari yang tidak dihitung dan tanpa absensi tidak ditampilkan
        if (!counted && records.length === 0) return;

        const rejectedRecords = records.filter(
          (record) => record.approval_status === "rejected"
        );

        // Absensi yang ditolak Admin dianggap tidak valid
        const primary =
          records.find((record) => record.approval_status !== "rejected") ??
          null;

        let bucket: DayKey | null = null;
        let awaiting = false;
        let note: string | null = null;

        if (counted) {
          activeDays++;
          rejected += rejectedRecords.length;

          if (primary) {
            bucket = bucketOf(primary.status);
          } else if (key !== today) {
            // Tidak ada absensi valid = alpa.
            // Hari ini belum dihitung agar karyawan masih bisa absen.
            bucket = "absent";
          } else {
            awaiting = true;
          }

          if (bucket) totals[bucket]++;
        } else if (isWeekendKey(key)) {
          note = "Akhir pekan";
        } else if (isHoliday(key)) {
          const name = holidayNames.get(key);
          note = name ? `Hari libur: ${name}` : "Hari libur";
        } else {
          note = "Sebelum akun dibuat";
        }

        const tasks = taskListOf(primary);

        dayRows.push({
          key,
          weekday: formatKey(key, { weekday: "short" }),
          dayNumber: day,
          full: formatKey(key, FULL_DATE),
          counted,
          note,
          bucket,
          awaiting,
          primary,
          rejected: rejectedRecords,
          tasks,
        });

        // Grafik pekerjaan: hanya hari kerja yang dihitung.
        // Hari masuk (tepat waktu atau terlambat) berisi jumlah pekerjaan,
        // hari sakit, izin, dan alpa dikosongkan agar tren tidak miring.
        if (counted) {
          chartRows.push({
            key,
            label: String(day),
            full: formatKey(key, {
              weekday: "long",
              day: "numeric",
              month: "long",
            }),
            status: bucket,
            tasks: bucket === "present" || bucket === "late" ? tasks.length : null,
            trend: null,
          });
        }
      });
    }

    const trend = analyzeTrend(chartRows);

    const accounted =
      totals.present + totals.late + totals.sick + totals.leave + totals.absent;
    const masuk = totals.present + totals.late;

    return {
      noData,
      accountCreatedInMonth,
      totals,
      rejected,
      activeDays,
      accounted,
      masuk,
      rate: accounted ? Math.round((masuk / accounted) * 100) : 0,
      workingDayCount,
      weekendCount,
      holidayCount,
      // Hari terbaru di atas
      dayRows: [...dayRows].reverse(),
      chartRows,
      trend,
    };
  }, [employee, attendances, holidays, monthInfo]);

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
  // UNDUH LAPORAN PEKERJAAN HARIAN (.TXT)
  // =========================================================

  const handleDownload = (row: DayRow) => {
    if (!employee || !row.primary) return;

    const item = row.primary;
    const approval = normalizeApproval(item.approval_status);

    const content = [
      "============================================================",
      "                 LAPORAN PEKERJAAN HARIAN",
      "============================================================",
      "",
      `Nama        : ${employee.full_name || "-"}`,
      `Divisi      : ${employee.division?.trim() || "-"}`,
      `Tanggal     : ${row.full}`,
      `Jam Masuk   : ${formatTime(item.check_in)}`,
      `Jam Pulang  : ${formatTime(item.check_out)}`,
      `Status      : ${META[bucketOf(item.status)].label}`,
      `Approval    : ${APPROVAL[approval].label}`,
      "",
      "------------------------------------------------------------",
      "PEKERJAAN YANG DISELESAIKAN",
      "------------------------------------------------------------",
      "",
      ...(row.tasks.length
        ? row.tasks.map(
            (task, index) => `[${String(index + 1).padStart(2, "0")}] ${task}`
          )
        : ["Belum ada laporan pekerjaan."]),
      "",
      "------------------------------------------------------------",
      "RINGKASAN",
      "------------------------------------------------------------",
      "",
      `Total pekerjaan : ${row.tasks.length} pekerjaan`,
      "",
      "============================================================",
      "          Company Attendance Management System",
      "============================================================",
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const safeName = (employee.full_name || "karyawan")
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .replace(/_+/g, "_");

    link.href = url;
    link.download = `Laporan_Pekerjaan_${safeName}_${row.key}.txt`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // =========================================================
  // LOADING & ERROR
  // =========================================================

  if (loading) {
    return (
      <main
        className={`${BASE} flex min-h-screen items-center justify-center bg-[#F2F4F9]`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-slate-200 border-t-[#0E1A3A]" />
          <p className="text-sm font-medium text-slate-500">
            Membuka detail karyawan...
          </p>
        </div>
      </main>
    );
  }

  if (pageError || !employee || !report) {
    const notFound = !pageError || pageError === NOT_FOUND_MESSAGE;

    return (
      <main
        className={`${BASE} flex min-h-screen items-center justify-center bg-[#F2F4F9] px-4`}
      >
        <div
          className={`${card} w-full max-w-md border-dashed p-8 text-center`}
        >
          <h1 className={`${D} text-xl font-semibold text-slate-800`}>
            {notFound ? "Karyawan tidak ditemukan" : "Terjadi kesalahan"}
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {notFound
              ? "Data karyawan tidak tersedia atau bukan bagian dari perusahaan ini."
              : pageError}
          </p>

          <Link
            href="/rekap"
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0E1A3A] px-5 text-sm font-semibold text-white transition hover:bg-[#1a2a5a]"
          >
            <Icon d={ICONS.back} />
            Kembali ke rekap
          </Link>
        </div>
      </main>
    );
  }

  if (!dataLoaded) {
    return (
      <main
        className={`${BASE} flex min-h-screen items-center justify-center bg-[#F2F4F9]`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-slate-200 border-t-[#0E1A3A]" />
          <p className="text-sm font-medium text-slate-500">
            Menyiapkan rekap karyawan...
          </p>
        </div>
      </main>
    );
  }

  const roleLabel =
    userRole === "owner" ? "Owner" : userRole === "admin" ? "Admin" : userRole;

  const { trend } = report;

  const summary =
    report.accounted === 0
      ? "Belum ada hari kerja yang dihitung pada bulan ini."
      : `Masuk ${report.masuk} kali, sakit atau izin ${
          report.totals.sick + report.totals.leave
        } kali, dan alpa ${report.totals.absent} kali dari ${
          report.accounted
        } hari kerja.`;

  const trendText =
    trend.state === "up"
      ? `Jumlah pekerjaan cenderung naik sepanjang ${formattedMonth}. Garis tren bergerak dari sekitar ${fmt(
          trend.start
        )} ke ${fmt(trend.end)} pekerjaan per hari.`
      : trend.state === "down"
      ? `Jumlah pekerjaan cenderung turun sepanjang ${formattedMonth}. Garis tren bergerak dari sekitar ${fmt(
          trend.start
        )} ke ${fmt(trend.end)} pekerjaan per hari.`
      : trend.state === "flat"
      ? `Jumlah pekerjaan relatif stabil, sekitar ${fmt(
          trend.average
        )} pekerjaan per hari.`
      : trend.state === "short"
      ? `Baru ${trend.activeDays} hari masuk. Arah naik atau turun bisa dibaca setelah minimal ${MIN_TREND_DAYS} hari masuk.`
      : "Belum ada pekerjaan yang dilaporkan pada bulan ini.";

  const showTrendLine =
    trend.state === "up" || trend.state === "down" || trend.state === "flat";

  const hasChartData = trend.activeDays > 0;

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
              <p className="text-xs text-slate-500">Detail karyawan</p>
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
              href="/rekap"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <Icon d={ICONS.back} />
              <span className="hidden sm:inline">Rekap</span>
              <span className="sr-only sm:hidden">Kembali ke rekap</span>
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
              Laporan kehadiran {employee.full_name}, {formattedMonth}
            </p>
            <p className="mt-1 text-xs">
              Divisi: {employee.division?.trim() || "Belum ada divisi"}. Hari
              kerja: {report.accounted}. Total masuk: {report.masuk}. Total
              alpa: {report.totals.absent}. Total ditolak: {report.rejected}.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-8 sm:pt-8 print:p-0">
        {/* ================= JUDUL & KONTROL BULAN ================= */}

        <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between print:hidden">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={employee.full_name} large />

            <div className="min-w-0">
              <h2
                className={`${D} break-words text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl`}
              >
                {employee.full_name || "Tanpa Nama"}
              </h2>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <DivisionTag division={employee.division} />
                <span className="text-xs text-slate-500">
                  Akun dibuat {formatCreatedDate(employee.created_at)}
                </span>
              </div>
            </div>
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
                <label htmlFor="detail-month" className="sr-only">
                  Bulan
                </label>
                <select
                  id="detail-month"
                  value={monthInfo.month}
                  onChange={(e) =>
                    setSelectedMonth(
                      `${monthInfo.year}-${pad(Number(e.target.value))}`
                    )
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
                <label htmlFor="detail-year" className="sr-only">
                  Tahun
                </label>
                <select
                  id="detail-year"
                  value={monthInfo.year}
                  onChange={(e) =>
                    setSelectedMonth(
                      `${e.target.value}-${pad(monthInfo.month)}`
                    )
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

          {report.accountCreatedInMonth && !report.noData && (
            <p className="mb-5 rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-700 print:hidden">
              Karyawan baru. Dihitung sejak{" "}
              {formatCreatedDate(employee.created_at)}.
            </p>
          )}

          {report.noData ? (
            <section
              className={`${card} flex min-h-[260px] items-center justify-center border-dashed p-8 text-center`}
            >
              <div>
                <h3 className={`${D} text-xl font-semibold text-slate-800`}>
                  {monthInfo.isFuture
                    ? "Bulan ini belum dimulai"
                    : "Akun belum ada pada bulan ini"}
                </h3>

                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                  {monthInfo.isFuture
                    ? `Belum ada data yang bisa ditampilkan untuk ${formattedMonth}.`
                    : `Akun baru dibuat ${formatCreatedDate(
                        employee.created_at
                      )}, jadi belum dihitung pada ${formattedMonth}.`}
                </p>
              </div>
            </section>
          ) : (
            <>
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

                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
                        {report.workingDayCount} hari kerja
                      </span>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
                        {report.weekendCount} akhir pekan
                      </span>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
                        {report.holidayCount} hari libur
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

                  {report.accounted > 0 && (
                    <div className="relative mx-auto h-52 w-52 shrink-0 sm:h-56 sm:w-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart
                          data={[{ name: "Kehadiran", value: report.rate }]}
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
                          {report.rate}
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
                      report.totals[key] > 0 && (
                        <div
                          key={key}
                          title={`${META[key].label}: ${report.totals[key]}`}
                          style={{
                            width: `${
                              (report.totals[key] / report.accounted) * 100
                            }%`,
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
                        {report.totals[key]}
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
                      {report.rejected}
                    </dd>
                  </div>
                </dl>
              </section>

              {/* ================= GRAFIK PEKERJAAN ================= */}

              <section className={`${card} mt-6 p-5 sm:p-7 print:hidden`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3
                      className={`${D} text-xl font-semibold text-slate-900`}
                    >
                      Grafik pekerjaan
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Jumlah pekerjaan yang dilaporkan di setiap hari masuk.
                    </p>
                  </div>

                  <TrendBadge state={trend.state} />
                </div>

                <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
                  {trendText}
                </p>

                <dl className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
                  <MiniStat
                    label="Total pekerjaan"
                    value={String(trend.total)}
                    sub="bulan ini"
                  />
                  <MiniStat
                    label="Rata-rata"
                    value={fmt(trend.average)}
                    sub="per hari masuk"
                  />
                  <MiniStat
                    label="Hari ada laporan"
                    value={String(trend.reportDays)}
                    sub={`dari ${trend.activeDays} hari masuk`}
                  />
                  <MiniStat
                    label="Terbanyak"
                    value={trend.best ? String(trend.best.count) : "-"}
                    sub={trend.best?.full ?? "belum ada"}
                  />
                </dl>

                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
                  <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-sm bg-[#0E1A3A]" />
                    Pekerjaan per hari
                  </span>

                  {showTrendLine && (
                    <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
                      <span className="h-0.5 w-4 rounded-full bg-emerald-500" />
                      Garis tren
                    </span>
                  )}
                </div>

                {hasChartData ? (
                  <div className="mt-4 h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={report.chartRows}
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
                          content={<TaskTooltip />}
                          cursor={{ fill: "rgba(14,26,58,0.05)" }}
                        />
                        <Bar
                          dataKey="tasks"
                          fill="#0E1A3A"
                          maxBarSize={22}
                          radius={[6, 6, 0, 0] as any}
                        />
                        {showTrendLine && (
                          <Line
                            dataKey="trend"
                            type="linear"
                            stroke="#10B981"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={false}
                            connectNulls
                            isAnimationActive={false}
                          />
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="mt-4 flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm text-slate-500">
                    Belum ada hari masuk pada bulan ini.
                  </div>
                )}
              </section>

              {/* ================= CATATAN PERHITUNGAN ================= */}

              <section className="mt-6 rounded-2xl border border-slate-200/70 bg-white/60 p-4 sm:p-5 print:hidden">
                <h3 className="text-sm font-semibold text-slate-700">
                  Cara menghitung
                </h3>

                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                  Hari kerja adalah Senin sampai Jumat yang bukan hari libur
                  perusahaan. Alpa hanya dihitung pada hari kerja yang sudah
                  lewat, jadi hari ini belum dihitung. Absensi yang ditolak
                  tidak dihitung sebagai masuk. Grafik pekerjaan hanya memuat
                  hari masuk (tepat waktu atau terlambat), sedangkan hari sakit,
                  izin, dan alpa tidak ikut. Arah naik atau turun dibaca dari
                  garis tren dan butuh minimal {MIN_TREND_DAYS} hari masuk.
                </p>
              </section>

              {/* ================= RIWAYAT HARIAN ================= */}

              <section className="mt-8 print:mt-4">
                <div className="mb-4 flex items-center gap-3">
                  <h3
                    className={`${D} text-xl font-semibold text-slate-900 sm:text-2xl`}
                  >
                    Riwayat harian
                  </h3>

                  <span className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200 print:hidden">
                    {formattedMonth}
                  </span>
                </div>

                {report.dayRows.length === 0 ? (
                  <div
                    className={`${card} flex min-h-[200px] items-center justify-center border-dashed p-8 text-center`}
                  >
                    <p className="max-w-sm text-sm leading-relaxed text-slate-500">
                      Belum ada hari kerja yang tercatat pada {formattedMonth}.
                    </p>
                  </div>
                ) : (
                  <div
                    className={`${card} divide-y divide-slate-100 overflow-hidden`}
                  >
                    {report.dayRows.map((row) => (
                      <DayRowCard
                        key={row.key}
                        row={row}
                        onOpen={setSelectedRow}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>

      {/* ================= MODAL DETAIL HARIAN ================= */}

      {selectedRow && (
        <DetailModal
          row={selectedRow}
          employee={employee}
          onClose={closeModal}
          onDownload={handleDownload}
        />
      )}

      {/* Cetak */}

      <style jsx global>{`
        @media print {
          @page {
            size: portrait;
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
