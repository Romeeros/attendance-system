"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Profile {
  id: string;
  full_name: string;
  division: string | null;
  created_at: string;
}

interface Attendance {
  profile_id: string;
  created_at: string;
}

interface DivisionData {
  name: string;
  employees: Profile[];
  present: Profile[];
  absent: Profile[];
  total: number;
  presentCount: number;
  absentCount: number;
  percentage: number;
}

/* ============================================================
   DATE HELPERS
============================================================ */

const getTodayString = () => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const createLocalDate = (dateString: string) => {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(year, month - 1, day);
};

const isFutureDate = (dateString: string) => {
  return dateString > getTodayString();
};

export default function LaporanTidakHadirPage() {
  const router = useRouter();

  const todayString = getTodayString();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [companyName, setCompanyName] = useState(
    "Company Attendance"
  );

  const [selectedDate, setSelectedDate] = useState(todayString);

  const [employees, setEmployees] = useState<Profile[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);

  const [selectedDivision, setSelectedDivision] =
    useState<DivisionData | null>(null);

  const [showModal, setShowModal] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  /* ============================================================
     DATE STATE
  ============================================================ */

  const selectedDateIsFuture = isFutureDate(selectedDate);

  const formattedDate = useMemo(() => {
    const date = createLocalDate(selectedDate);

    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [selectedDate]);

  const isWeekend = useMemo(() => {
    const date = createLocalDate(selectedDate);
    const day = date.getDay();

    return day === 0 || day === 6;
  }, [selectedDate]);

  /* ============================================================
     FETCH DATA
  ============================================================ */

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");

      /* Future date */
      if (isFutureDate(selectedDate)) {
        setEmployees([]);
        setAttendances([]);
        setSelectedDivision(null);
        setShowModal(false);
        return;
      }

      /* Current user */
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      /* Profile */
      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("id, role, company_id, companies(name)")
          .eq("id", user.id)
          .single();

      if (profileError || !profile) {
        throw new Error("Data profile tidak ditemukan.");
      }

      /* Employee tidak boleh membuka laporan */
      if (profile.role === "employee") {
        router.push("/dashboard");
        return;
      }

      /* Company */
      if (profile.companies) {
        const companyData = profile.companies as any;

        setCompanyName(
          companyData.name || "Company Attendance"
        );
      }

      /* Selected date range */
      const selectedDateObject = createLocalDate(selectedDate);

      const selectedStart = new Date(selectedDateObject);

      const selectedEnd = new Date(selectedDateObject);
      selectedEnd.setHours(23, 59, 59, 999);

      /* Employees */
      const {
        data: employeeData,
        error: employeeError,
      } = await supabase
        .from("profiles")
        .select("id, full_name, division, created_at")
        .eq("company_id", profile.company_id)
        .neq("role", "owner")
        .order("division", {
          ascending: true,
        })
        .order("full_name", {
          ascending: true,
        });

      if (employeeError) {
        throw new Error(employeeError.message);
      }

      const allEmployees = employeeData || [];

      /*
       * Hanya employee yang sudah dibuat
       * sebelum / pada tanggal tersebut.
       */
      const activeEmployees = allEmployees.filter((employee) => {
        const employeeCreatedAt = new Date(employee.created_at);

        return employeeCreatedAt <= selectedEnd;
      });

      if (activeEmployees.length === 0) {
        setEmployees([]);
        setAttendances([]);
        return;
      }

      setEmployees(activeEmployees);

      /* Attendance */
      const employeeIds = activeEmployees.map(
        (employee) => employee.id
      );

      const {
        data: attendanceData,
        error: attendanceError,
      } = await supabase
        .from("attendance")
        .select("profile_id, created_at")
        .in("profile_id", employeeIds)
        .gte("created_at", selectedStart.toISOString())
        .lte("created_at", selectedEnd.toISOString());

      if (attendanceError) {
        throw new Error(attendanceError.message);
      }

      setAttendances(attendanceData || []);
    } catch (error: any) {
      console.error("Fetch attendance error:", error);

      setErrorMessage(
        error?.message ||
          "Terjadi kesalahan ketika mengambil data."
      );

      setEmployees([]);
      setAttendances([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* ============================================================
     LOAD
  ============================================================ */

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  /* ============================================================
     DIVISION DATA
  ============================================================ */

  const divisionData = useMemo(() => {
    const groups: Record<string, Profile[]> = {};

    employees.forEach((employee) => {
      const division =
        employee.division?.trim() || "Tanpa Divisi";

      if (!groups[division]) {
        groups[division] = [];
      }

      groups[division].push(employee);
    });

    const attendanceIds = new Set(
      attendances.map(
        (attendance) => attendance.profile_id
      )
    );

    const result: DivisionData[] = Object.entries(groups).map(
      ([divisionName, divisionEmployees]) => {
        const present = divisionEmployees.filter((employee) =>
          attendanceIds.has(employee.id)
        );

        const absent = divisionEmployees.filter(
          (employee) => !attendanceIds.has(employee.id)
        );

        const total = divisionEmployees.length;

        const percentage =
          total > 0
            ? Math.round((present.length / total) * 100)
            : 0;

        return {
          name: divisionName,
          employees: divisionEmployees,
          present,
          absent,
          total,
          presentCount: present.length,
          absentCount: absent.length,
          percentage,
        };
      }
    );

    result.sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return result;
  }, [employees, attendances]);

  /* ============================================================
     STATISTICS
  ============================================================ */

  const totalEmployees = employees.length;

  const totalPresent = divisionData.reduce(
    (total, division) =>
      total + division.presentCount,
    0
  );

  const totalAbsent = divisionData.reduce(
    (total, division) =>
      total + division.absentCount,
    0
  );

  const attendancePercentage =
    totalEmployees > 0
      ? Math.round(
          (totalPresent / totalEmployees) * 100
        )
      : 0;

  /* ============================================================
     MODAL
  ============================================================ */

  const openDivisionModal = (division: DivisionData) => {
    setSelectedDivision(division);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);

    setTimeout(() => {
      setSelectedDivision(null);
    }, 150);
  };

  const goToToday = () => {
    setSelectedDate(getTodayString());
  };

  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="text-center">
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-indigo-600" />

          <p className="text-sm font-bold text-slate-800">
            Memuat laporan
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Mengambil data kehadiran...
          </p>
        </div>
      </main>
    );
  }

  /* ============================================================
     MAIN
  ============================================================ */

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1450px] items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            {/* LOGO */}
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white shadow-sm">
              A
            </div>

            <div>
              <h1 className="text-sm font-black tracking-tight text-slate-950 sm:text-base">
                {companyName}
              </h1>

              <p className="text-[11px] font-medium text-slate-400">
                Attendance Management
              </p>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 sm:px-4 sm:text-sm"
          >
            <span className="transition-transform group-hover:-translate-x-0.5">
              ←
            </span>

            <span>Dashboard</span>
          </Link>
        </div>
      </header>

      {/* ======================================================
          CONTENT
      ====================================================== */}

      <div className="mx-auto max-w-[1450px] px-5 py-7 sm:px-8 sm:py-9">
        {/* ====================================================
            PAGE TITLE
        ==================================================== */}

        <section className="mb-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-indigo-600" />

                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">
                  Daily Attendance
                </span>
              </div>

              <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Rekap Kehadiran
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Pantau karyawan yang sudah dan belum
                melakukan absensi pada hari tertentu.
              </p>
            </div>

            {/* DATE CONTROL */}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div>
                <label className="mb-1.5 ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Tanggal
                </label>

                <input
                  type="date"
                  value={selectedDate}
                  max={todayString}
                  onChange={(event) => {
                    const newDate = event.target.value;

                    if (newDate > getTodayString()) {
                      setSelectedDate(getTodayString());
                      return;
                    }

                    setSelectedDate(newDate);
                  }}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 sm:w-auto"
                />
              </div>

              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg
                  className={`h-4 w-4 ${
                    refreshing ? "animate-spin" : ""
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 11a8.1 8.1 0 0 0-14.9-4M4 5v4h4" />
                  <path d="M4 13a8.1 8.1 0 0 0 14.9 4M20 19v-4h-4" />
                </svg>

                Refresh
              </button>
            </div>
          </div>
        </section>

        {/* ====================================================
            DATE BADGE
        ==================================================== */}

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <span className="text-sm font-bold text-slate-700">
              {formattedDate}
            </span>
          </div>

          {selectedDateIsFuture ? (
            <span className="rounded-xl bg-violet-50 px-3.5 py-2.5 text-xs font-bold text-violet-700">
              ◷ Belum dimulai
            </span>
          ) : isWeekend ? (
            <span className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-bold text-amber-700">
              ☕ Hari libur
            </span>
          ) : (
            <span className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-700">
              ● Hari kerja
            </span>
          )}
        </div>

        {/* ====================================================
            FUTURE
        ==================================================== */}

        {selectedDateIsFuture ? (
          <section className="flex min-h-[430px] items-center justify-center rounded-3xl border border-dashed border-violet-200 bg-white">
            <div className="max-w-md px-6 text-center">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-violet-50 text-4xl">
                🗓️
              </div>

              <h3 className="text-xl font-black text-slate-900">
                Tanggal Belum Dimulai
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Data absensi untuk{" "}
                <span className="font-bold text-slate-600">
                  {formattedDate}
                </span>{" "}
                belum tersedia.
              </p>

              <button
                onClick={goToToday}
                className="mt-6 rounded-xl bg-slate-950 px-5 py-3 text-xs font-black text-white transition hover:bg-indigo-600"
              >
                Kembali ke Hari Ini
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* ==================================================
                ERROR
            ================================================== */}

            {errorMessage && (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-sm">
                    !
                  </div>

                  <div>
                    <p className="text-sm font-black text-rose-800">
                      Gagal mengambil data
                    </p>

                    <p className="mt-1 text-xs font-medium text-rose-600">
                      {errorMessage}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ==================================================
                EMPTY
            ================================================== */}

            {employees.length === 0 ? (
              <section className="flex min-h-[430px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white">
                <div className="max-w-md px-6 text-center">
                  <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-50 text-4xl">
                    📭
                  </div>

                  <h3 className="text-xl font-black text-slate-900">
                    Belum Ada Karyawan
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Tidak ada karyawan yang terdaftar
                    pada tanggal{" "}
                    <span className="font-bold text-slate-600">
                      {formattedDate}
                    </span>
                    .
                  </p>

                  <button
                    onClick={goToToday}
                    className="mt-6 rounded-xl bg-slate-950 px-5 py-3 text-xs font-black text-white transition hover:bg-indigo-600"
                  >
                    Kembali ke Hari Ini
                  </button>
                </div>
              </section>
            ) : (
              <>
                {/* ==================================================
                    STATISTICS
                ================================================== */}

                <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {/* TOTAL */}

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Total
                      </span>

                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-sm">
                        👥
                      </div>
                    </div>

                    <p className="mt-5 text-3xl font-black text-slate-950">
                      {totalEmployees}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      Karyawan aktif
                    </p>
                  </div>

                  {/* HADIR */}

                  <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                        Hadir
                      </span>

                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-sm text-emerald-600">
                        ✓
                      </div>
                    </div>

                    <p className="mt-5 text-3xl font-black text-emerald-600">
                      {totalPresent}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      Sudah melakukan absensi
                    </p>
                  </div>

                  {/* BELUM */}

                  <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">
                        Belum
                      </span>

                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-sm text-rose-600">
                        !
                      </div>
                    </div>

                    <p className="mt-5 text-3xl font-black text-rose-600">
                      {totalAbsent}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      Belum melakukan absensi
                    </p>
                  </div>

                  {/* PERCENTAGE */}

                  <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                        Persentase
                      </span>

                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-sm font-black text-indigo-600">
                        %
                      </div>
                    </div>

                    <p className="mt-5 text-3xl font-black text-indigo-600">
                      {attendancePercentage}%
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      Tingkat kehadiran
                    </p>
                  </div>
                </section>

                {/* ==================================================
                    PROGRESS
                ================================================== */}

                <section className="mb-9 rounded-2xl bg-slate-950 p-6 shadow-sm sm:p-7">
                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">
                        Attendance Overview
                      </p>

                      <h3 className="mt-2 text-xl font-black text-white">
                        Progress Kehadiran
                      </h3>

                      <p className="mt-1 text-xs font-medium text-slate-400">
                        {totalPresent} dari {totalEmployees}{" "}
                        karyawan sudah absen.
                      </p>
                    </div>

                    <div className="w-full md:max-w-md">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500">
                          Progress
                        </span>

                        <span className="text-sm font-black text-white">
                          {attendancePercentage}%
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all duration-700"
                          style={{
                            width: `${attendancePercentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* ==================================================
                    DIVISION
                ================================================== */}

                <section>
                  <div className="mb-5 flex items-end justify-between">
                    <div>
                      <h3 className="text-xl font-black tracking-tight text-slate-950">
                        Kehadiran Per Divisi
                      </h3>

                      <p className="mt-1 text-xs font-medium text-slate-400">
                        Pilih divisi untuk melihat detail.
                      </p>
                    </div>

                    <span className="hidden rounded-lg bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 shadow-sm ring-1 ring-slate-200 sm:block">
                      {divisionData.length} Divisi
                    </span>
                  </div>

                  {divisionData.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center">
                      <p className="text-sm font-bold text-slate-400">
                        Belum ada data divisi.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {divisionData.map((division) => {
                        const isPerfect =
                          division.absentCount === 0;

                        return (
                          <button
                            key={division.name}
                            onClick={() =>
                              openDivisionModal(division)
                            }
                            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
                          >
                            {/* TOP */}

                            <div className="flex items-start justify-between gap-4">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">
                                  {division.name
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>

                                <div className="min-w-0">
                                  <h4 className="truncate text-sm font-black text-slate-900">
                                    {division.name}
                                  </h4>

                                  <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                                    {division.total} karyawan
                                  </p>
                                </div>
                              </div>

                              <span
                                className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black ${
                                  isPerfect
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "bg-rose-50 text-rose-600"
                                }`}
                              >
                                {isPerfect
                                  ? "LENGKAP"
                                  : `${division.absentCount} BELUM`}
                              </span>
                            </div>

                            {/* LINE */}

                            <div className="my-5 h-px bg-slate-100" />

                            {/* NUMBERS */}

                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-xl bg-emerald-50 p-3.5">
                                <p className="text-[10px] font-bold text-emerald-500">
                                  Sudah Absen
                                </p>

                                <p className="mt-1 text-xl font-black text-emerald-700">
                                  {division.presentCount}
                                </p>
                              </div>

                              <div className="rounded-xl bg-rose-50 p-3.5">
                                <p className="text-[10px] font-bold text-rose-500">
                                  Belum Absen
                                </p>

                                <p className="mt-1 text-xl font-black text-rose-700">
                                  {division.absentCount}
                                </p>
                              </div>
                            </div>

                            {/* PROGRESS */}

                            <div className="mt-5">
                              <div className="mb-2 flex justify-between">
                                <span className="text-[10px] font-bold text-slate-400">
                                  Kehadiran
                                </span>

                                <span className="text-[10px] font-black text-slate-700">
                                  {division.percentage}%
                                </span>
                              </div>

                              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className={`h-full rounded-full transition-all duration-700 ${
                                    isPerfect
                                      ? "bg-emerald-500"
                                      : "bg-indigo-500"
                                  }`}
                                  style={{
                                    width: `${division.percentage}%`,
                                  }}
                                />
                              </div>
                            </div>

                            {/* FOOTER */}

                            <div className="mt-5 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400">
                                Lihat detail
                              </span>

                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 transition-all group-hover:bg-indigo-600 group-hover:text-white">
                                →
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* PRINT */}

                <div className="mt-8 flex justify-end print:hidden">
                  <button
                    onClick={() => window.print()}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
                  >
                    🖨️ Cetak Laporan
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* ======================================================
          MODAL DETAIL DIVISION
      ====================================================== */}

      {showModal && selectedDivision && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            {/* HEADER */}

            <div className="border-b border-slate-100 px-6 py-5 sm:px-7">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">
                    {selectedDivision.name
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-indigo-500">
                      Detail Divisi
                    </p>

                    <h3 className="truncate text-lg font-black text-slate-950">
                      {selectedDivision.name}
                    </h3>

                    <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                      {formattedDate}
                    </p>
                  </div>
                </div>

                <button
                  onClick={closeModal}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                >
                  ×
                </button>
              </div>

              {/* SUMMARY */}

              <div className="mt-5 grid grid-cols-3 gap-2.5">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Total
                  </p>

                  <p className="mt-1 text-xl font-black text-slate-900">
                    {selectedDivision.total}
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-[9px] font-black uppercase tracking-wider text-emerald-500">
                    Hadir
                  </p>

                  <p className="mt-1 text-xl font-black text-emerald-700">
                    {selectedDivision.presentCount}
                  </p>
                </div>

                <div className="rounded-xl bg-rose-50 p-3">
                  <p className="text-[9px] font-black uppercase tracking-wider text-rose-500">
                    Belum
                  </p>

                  <p className="mt-1 text-xl font-black text-rose-700">
                    {selectedDivision.absentCount}
                  </p>
                </div>
              </div>
            </div>

            {/* BODY */}

            <div className="max-h-[55vh] overflow-y-auto bg-[#f8fafc] p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {/* HADIR */}

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-800">
                        Sudah Absen
                      </h4>

                      <p className="text-[10px] font-semibold text-emerald-500">
                        {selectedDivision.presentCount} orang
                      </p>
                    </div>

                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm text-emerald-600">
                      ✓
                    </div>
                  </div>

                  {selectedDivision.present.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center">
                      <p className="text-xs font-bold text-slate-400">
                        Belum ada yang absen.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedDivision.present.map(
                        (employee) => (
                          <div
                            key={employee.id}
                            className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-white p-3"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-black text-emerald-600">
                              {employee.full_name
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-xs font-black text-slate-800">
                                {employee.full_name}
                              </p>

                              <p className="mt-0.5 text-[10px] font-semibold text-emerald-500">
                                Sudah melakukan absensi
                              </p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* BELUM */}

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-800">
                        Belum Absen
                      </h4>

                      <p className="text-[10px] font-semibold text-rose-500">
                        {selectedDivision.absentCount} orang
                      </p>
                    </div>

                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-sm text-rose-600">
                      !
                    </div>
                  </div>

                  {selectedDivision.absent.length === 0 ? (
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5 text-center">
                      <p className="text-xs font-black text-emerald-600">
                        🎉 Semua sudah absen!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedDivision.absent.map(
                        (employee) => (
                          <div
                            key={employee.id}
                            className="flex items-center gap-3 rounded-xl border border-rose-100 bg-white p-3"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-xs font-black text-rose-600">
                              {employee.full_name
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-xs font-black text-slate-800">
                                {employee.full_name}
                              </p>

                              <p className="mt-0.5 text-[10px] font-semibold text-rose-500">
                                Belum melakukan absensi
                              </p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* FOOTER */}

            <div className="flex justify-end border-t border-slate-100 bg-white px-6 py-4">
              <button
                onClick={closeModal}
                className="rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-black text-white transition hover:bg-indigo-600"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          PRINT STYLE
      ====================================================== */}

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          header,
          button,
          input,
          .print\\:hidden {
            display: none !important;
          }

          main {
            background: white !important;
          }
        }
      `}</style>
    </main>
  );
}