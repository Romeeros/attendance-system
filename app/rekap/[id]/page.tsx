"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Employee {
  id: string;
  full_name: string;
  created_at: string;
  role: string;
}

interface Attendance {
  id: string;
  profile_id: string;
  status: string;
  created_at: string;
  check_in: string | null;
  check_out: string | null;
  reason: string | null;
}

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

export default function EmployeeAttendanceDetail() {
  const router = useRouter();
  const params = useParams();

  const employeeId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] =
    useState<Employee | null>(null);

  const [attendance, setAttendance] =
    useState<Attendance[]>([]);

  const [selectedMonth, setSelectedMonth] =
    useState(() => {
      const today = new Date();

      return `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}`;
    });

  const [companyName, setCompanyName] =
    useState("Company Attendance");

  const [errorMessage, setErrorMessage] =
    useState("");

  /**
   * ====================================
   * LOAD EMPLOYEE
   * ====================================
   */
  useEffect(() => {
    const fetchEmployee = async () => {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      /**
       * Cek admin / owner
       */
      const { data: currentProfile } =
        await supabase
          .from("profiles")
          .select(
            "id, role, company_id, companies(name)"
          )
          .eq("id", user.id)
          .single();

      if (!currentProfile) {
        router.push("/login");
        return;
      }

      if (
        currentProfile.role !== "owner" &&
        currentProfile.role !== "admin"
      ) {
        router.push("/dashboard");
        return;
      }

      if (currentProfile.companies) {
        const company =
          currentProfile.companies as any;

        setCompanyName(
          company?.name ||
            "Company Attendance"
        );
      }

      /**
       * Ambil employee
       */
      const { data: employeeData, error } =
        await supabase
          .from("profiles")
          .select(
            "id, full_name, created_at, role"
          )
          .eq("id", employeeId)
          .eq(
            "company_id",
            currentProfile.company_id
          )
          .single();

      if (error || !employeeData) {
        setErrorMessage(
          "Karyawan tidak ditemukan."
        );
        setLoading(false);
        return;
      }

      setEmployee(employeeData);
      setLoading(false);
    };

    fetchEmployee();
  }, [employeeId, router]);

  /**
   * ====================================
   * LOAD ATTENDANCE
   * ====================================
   */
  useEffect(() => {
    const fetchAttendance = async () => {
      if (!employee) return;

      const [yearString, monthString] =
        selectedMonth.split("-");

      const year = Number(yearString);
      const month = Number(monthString);

      const startDate = new Date(
        Date.UTC(
          year,
          month - 1,
          1,
          0,
          0,
          0
        )
      );

      const endDate = new Date(
        Date.UTC(
          year,
          month,
          1,
          0,
          0,
          0
        )
      );

      const { data, error } =
        await supabase
          .from("attendance")
          .select(
            "id, profile_id, status, created_at, check_in, check_out, reason"
          )
          .eq(
            "profile_id",
            employee.id
          )
          .gte(
            "created_at",
            startDate.toISOString()
          )
          .lt(
            "created_at",
            endDate.toISOString()
          )
          .order("created_at", {
            ascending: true,
          });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setAttendance(data || []);
    };

    fetchAttendance();
  }, [employee, selectedMonth]);

  /**
   * ====================================
   * MONTH INFO
   * ====================================
   */
  const monthInfo = useMemo(() => {
    const [yearString, monthString] =
      selectedMonth.split("-");

    const year = Number(yearString);
    const month = Number(monthString);

    const today = new Date();

    const monthStart = new Date(
      year,
      month - 1,
      1
    );

    const nextMonth = new Date(
      year,
      month,
      1
    );

    return {
      year,
      month,
      monthName: MONTHS[month - 1],

      isFuture:
        monthStart > today,

      isCurrentMonth:
        year === today.getFullYear() &&
        month - 1 === today.getMonth(),

      daysInMonth:
        new Date(
          year,
          month,
          0
        ).getDate(),

      monthStart,
      nextMonth,
    };
  }, [selectedMonth]);

  /**
   * ====================================
   * ACCOUNT STATUS
   * ====================================
   */
  const accountStatus = useMemo(() => {
    if (!employee) return null;

    const createdDate = new Date(
      employee.created_at
    );

    if (
      createdDate >= monthInfo.nextMonth
    ) {
      return "not-exist";
    }

    if (
      createdDate >=
        monthInfo.monthStart &&
      createdDate <
        monthInfo.nextMonth
    ) {
      return "new";
    }

    return "active";
  }, [employee, monthInfo]);

  /**
   * ====================================
   * SUMMARY
   * ====================================
   */
  const stats = useMemo(() => {
    return {
      present: attendance.filter(
        (item) =>
          item.status === "present"
      ).length,

      late: attendance.filter(
        (item) =>
          item.status === "late"
      ).length,

      sick: attendance.filter(
        (item) =>
          item.status === "sakit"
      ).length,

      leave: attendance.filter(
        (item) =>
          item.status === "izin"
      ).length,

      absent: attendance.filter(
        (item) =>
          item.status === "absent"
      ).length,
    };
  }, [attendance]);

  /**
   * ====================================
   * FORMAT DATE
   * ====================================
   */
  const formatDate = (
    date: string
  ) => {
    return new Date(
      date
    ).toLocaleDateString(
      "id-ID",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );
  };

  /**
   * ====================================
   * FORMAT TIME
   * ====================================
   */
  const formatTime = (
    value: string | null
  ) => {
    if (!value) return "--:--";

    return new Date(
      value
    ).toLocaleTimeString(
      "id-ID",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  const createdDate =
    employee
      ? new Date(
          employee.created_at
        ).toLocaleDateString(
          "id-ID",
          {
            day: "numeric",
            month: "long",
            year: "numeric",
          }
        )
      : "";

  /**
   * ====================================
   * LOADING
   * ====================================
   */
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-white/10 border-t-blue-500" />

          <p className="mt-5 text-sm font-bold text-slate-400">
            Membuka detail karyawan...
          </p>
        </div>
      </main>
    );
  }

  /**
   * ====================================
   * ERROR
   * ====================================
   */
  if (errorMessage || !employee) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
        <div className="max-w-md rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <div className="text-5xl">
            🔍
          </div>

          <h2 className="mt-4 text-xl font-black text-white">
            Karyawan tidak ditemukan
          </h2>

          <p className="mt-2 text-sm text-red-200">
            {errorMessage ||
              "Data karyawan tidak tersedia."}
          </p>

          <Link
            href="/rekap"
            className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-900"
          >
            ← Kembali ke Rekap
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb]">
      {/* BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-3xl" />

        <div className="absolute -right-40 top-40 h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 p-1.5 shadow-lg">
              <img
                src="/svara.png"
                alt="SVARA"
                className="h-full w-full object-contain"
              />
            </div>

            <div>
              <p className="text-sm font-black text-slate-900 sm:text-base">
                {companyName}
              </p>

              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500 sm:text-[10px]">
                Employee Attendance Detail
              </p>
            </div>
          </div>

          <Link
            href="/rekap"
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-600 sm:px-5 sm:text-sm"
          >
            <span>←</span>

            <span className="hidden sm:inline">
              Kembali ke Rekap
            </span>

            <span className="sm:hidden">
              Kembali
            </span>
          </Link>
        </div>
      </header>

      <div className="relative mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        {/* ====================================
            EMPLOYEE HERO
        ==================================== */}
        <section className="mb-7 overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 p-6 text-white shadow-2xl shadow-blue-200/40 sm:p-8">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-blue-400 to-indigo-500 text-3xl font-black shadow-2xl shadow-blue-500/30 sm:h-24 sm:w-24 sm:text-4xl">
                {employee.full_name
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                  Detail Karyawan
                </p>

                <h1 className="truncate text-2xl font-black sm:text-4xl">
                  {employee.full_name}
                </h1>

                <p className="mt-2 text-xs font-medium text-slate-300 sm:text-sm">
                  Akun dibuat pada{" "}
                  <span className="font-bold text-white">
                    {createdDate}
                  </span>
                </p>
              </div>
            </div>

            <div className="w-full lg:w-auto">
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                Pilih Periode
              </label>

              <input
                type="month"
                value={selectedMonth}
                onChange={(event) =>
                  setSelectedMonth(
                    event.target.value
                  )
                }
                className="h-12 w-full rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-black text-white outline-none backdrop-blur focus:border-blue-400 sm:w-56"
              />
            </div>
          </div>
        </section>

        {/* ====================================
            NEW USER NOTICE
        ==================================== */}
        {accountStatus ===
          "not-exist" && (
          <div className="mb-7 flex gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xl">
              👤
            </div>

            <div>
              <h2 className="font-black text-slate-800">
                User belum ada pada bulan ini
              </h2>

              <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                {employee.full_name} baru dibuat
                pada{" "}
                <strong>
                  {createdDate}
                </strong>
                . Karena akun belum tersedia
                pada {monthInfo.monthName}{" "}
                {monthInfo.year}, maka data bulan
                ini dikosongkan.
              </p>
            </div>
          </div>
        )}

        {accountStatus === "new" && (
          <div className="mb-7 flex gap-4 rounded-3xl border border-blue-100 bg-blue-50 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
              ✨
            </div>

            <div>
              <h2 className="font-black text-blue-900">
                Karyawan baru pada bulan ini
              </h2>

              <p className="mt-1 text-sm font-medium leading-6 text-blue-700">
                User dibuat pada{" "}
                <strong>
                  {createdDate}
                </strong>
                . Rekap hanya dihitung mulai
                dari tanggal user dibuat.
              </p>
            </div>
          </div>
        )}

        {monthInfo.isFuture && (
          <div className="mb-7 flex gap-4 rounded-3xl border border-indigo-100 bg-indigo-50 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-xl">
              🗓️
            </div>

            <div>
              <h2 className="font-black text-indigo-900">
                Bulan belum dimulai
              </h2>

              <p className="mt-1 text-sm font-medium text-indigo-700">
                {monthInfo.monthName}{" "}
                {monthInfo.year} belum dimulai.
              </p>
            </div>
          </div>
        )}

        {/* ====================================
            STATS
        ==================================== */}
        <section className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <DetailStat
            icon="✅"
            label="Hadir"
            value={stats.present}
            className="text-emerald-600 bg-emerald-50"
          />

          <DetailStat
            icon="⏰"
            label="Telat"
            value={stats.late}
            className="text-yellow-600 bg-yellow-50"
          />

          <DetailStat
            icon="🤒"
            label="Sakit"
            value={stats.sick}
            className="text-orange-600 bg-orange-50"
          />

          <DetailStat
            icon="📝"
            label="Izin"
            value={stats.leave}
            className="text-purple-600 bg-purple-50"
          />

          <DetailStat
            icon="❌"
            label="Alpa"
            value={stats.absent}
            className="text-red-600 bg-red-50"
          />
        </section>

        {/* ====================================
            ATTENDANCE TIMELINE
        ==================================== */}
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Riwayat Harian
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-400 sm:text-sm">
                  {monthInfo.monthName}{" "}
                  {monthInfo.year}
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 px-4 py-2 text-xs font-black text-blue-600">
                {attendance.length} catatan
              </div>
            </div>
          </div>

          {accountStatus ===
            "not-exist" ||
          monthInfo.isFuture ? (
            <EmptyState
              icon="📭"
              title={
                monthInfo.isFuture
                  ? "Bulan belum dimulai"
                  : "User belum ada"
              }
              description={
                monthInfo.isFuture
                  ? "Belum ada data yang dapat ditampilkan untuk bulan ini."
                  : "User ini belum dibuat pada periode yang dipilih."
              }
            />
          ) : attendance.length === 0 ? (
            <EmptyState
              icon="📭"
              title="Belum ada absensi"
              description={`Belum ada catatan absensi ${employee.full_name} pada ${monthInfo.monthName} ${monthInfo.year}.`}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {attendance.map(
                (item, index) => (
                  <AttendanceRow
                    key={item.id}
                    item={item}
                    index={index}
                    formatDate={formatDate}
                    formatTime={formatTime}
                  />
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/**
 * ==========================================
 * COMPONENTS
 * ==========================================
 */

function DetailStat({
  icon,
  label,
  value,
  className,
}: {
  icon: string;
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${className}`}
      >
        {icon}
      </div>

      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-3xl font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[350px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-slate-50 text-5xl">
        {icon}
      </div>

      <h3 className="text-xl font-black text-slate-800">
        {title}
      </h3>

      <p className="mt-2 max-w-md text-sm font-medium leading-6 text-slate-400">
        {description}
      </p>
    </div>
  );
}

function AttendanceRow({
  item,
  index,
  formatDate,
  formatTime,
}: {
  item: Attendance;
  index: number;
  formatDate: (
    value: string
  ) => string;
  formatTime: (
    value: string | null
  ) => string;
}) {
  const statusConfig =
    item.status === "present"
      ? {
          label: "Hadir",
          icon: "✓",
          className:
            "bg-emerald-50 text-emerald-600 border-emerald-100",
        }
      : item.status === "late"
      ? {
          label: "Terlambat",
          icon: "⏰",
          className:
            "bg-yellow-50 text-yellow-600 border-yellow-100",
        }
      : item.status === "sakit"
      ? {
          label: "Sakit",
          icon: "🤒",
          className:
            "bg-orange-50 text-orange-600 border-orange-100",
        }
      : item.status === "izin"
      ? {
          label: "Izin",
          icon: "📝",
          className:
            "bg-purple-50 text-purple-600 border-purple-100",
        }
      : {
          label: item.status,
          icon: "•",
          className:
            "bg-slate-50 text-slate-600 border-slate-200",
        };

  return (
    <div className="group px-5 py-5 transition hover:bg-slate-50/70 sm:px-7">
      <div className="flex gap-4">
        {/* NUMBER */}
        <div className="hidden pt-1 sm:block">
          <span className="text-[10px] font-black text-slate-300">
            {String(index + 1).padStart(
              2,
              "0"
            )}
          </span>
        </div>

        {/* DATE ICON */}
        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-slate-100">
          <span className="text-[9px] font-black uppercase text-slate-400">
            {new Date(
              item.created_at
            ).toLocaleDateString(
              "id-ID",
              {
                weekday: "short",
              }
            )}
          </span>

          <span className="text-lg font-black text-slate-800">
            {new Date(
              item.created_at
            ).getDate()}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <h3 className="font-black text-slate-900">
                {formatDate(
                  item.created_at
                )}
              </h3>

              <div className="mt-2 flex flex-wrap gap-2">
                <TimeBadge
                  label="Masuk"
                  value={formatTime(
                    item.check_in
                  )}
                  className="bg-blue-50 text-blue-600"
                />

                <TimeBadge
                  label="Pulang"
                  value={formatTime(
                    item.check_out
                  )}
                  className="bg-orange-50 text-orange-600"
                />
              </div>
            </div>

            <span
              className={`inline-flex w-fit items-center gap-1.5 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-wider ${statusConfig.className}`}
            >
              {statusConfig.icon}
              {statusConfig.label}
            </span>
          </div>

          {item.reason && (
            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Keterangan
              </p>

              <p className="mt-1 text-xs font-medium italic leading-5 text-slate-600">
                "{item.reason}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TimeBadge({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className: string;
}) {
  return (
    <span
      className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${className}`}
    >
      {label}:{" "}
      <strong>{value}</strong>
    </span>
  );
}