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
   HELPERS
============================================================ */

const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
};

const createLocalDate = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const isFutureDate = (value: string) =>
  value > getTodayString();

const getDashboardPath = (role: string) => {
  if (role === "owner") return "/owner/dashboard";
  if (role === "admin") return "/admin/dashboard";
  return "/dashboard";
};

/* ============================================================
   PAGE
============================================================ */

export default function LaporanTidakHadirPage() {
  const router = useRouter();
  const today = getTodayString();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState("");

  const [companyName, setCompanyName] = useState(
    "Company Attendance"
  );

  const [selectedDate, setSelectedDate] = useState(today);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);

  const [selectedDivision, setSelectedDivision] =
    useState<DivisionData | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedDateIsFuture = isFutureDate(selectedDate);

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

  /* ============================================================
     FETCH
  ============================================================ */

  const fetchData = async (refresh = false) => {
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      setErrorMessage("");

      if (isFutureDate(selectedDate)) {
        setEmployees([]);
        setAttendances([]);
        setSelectedDivision(null);
        setShowModal(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, role, company_id, companies(name)")
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        throw new Error("Data profile tidak ditemukan.");
      }

      setUserRole(profile.role);

      /* Employee tidak boleh membuka laporan */
      if (profile.role === "employee") {
        router.replace("/dashboard");
        return;
      }

      /* Company */
      if (profile.companies) {
        const company = profile.companies as any;
        setCompanyName(company.name || "Company Attendance");
      }

      const date = createLocalDate(selectedDate);
      const start = new Date(date);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      /* Employees */
      const { data: employeeData, error: employeeError } =
        await supabase
          .from("profiles")
          .select("id, full_name, division, created_at")
          .eq("company_id", profile.company_id)
          .neq("role", "owner")
          .order("division", { ascending: true })
          .order("full_name", { ascending: true });

      if (employeeError) throw new Error(employeeError.message);

      const activeEmployees = (employeeData || []).filter(
        (employee) => new Date(employee.created_at) <= end
      );

      setEmployees(activeEmployees);

      if (!activeEmployees.length) {
        setAttendances([]);
        return;
      }

      /* Attendance */
      const ids = activeEmployees.map((employee) => employee.id);

      const { data: attendanceData, error: attendanceError } =
        await supabase
          .from("attendance")
          .select("profile_id, created_at")
          .in("profile_id", ids)
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString());

      if (attendanceError) {
        throw new Error(attendanceError.message);
      }

      setAttendances(attendanceData || []);
    } catch (error: any) {
      console.error("Fetch attendance error:", error);

      setErrorMessage(
        error?.message || "Terjadi kesalahan ketika mengambil data."
      );

      setEmployees([]);
      setAttendances([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  /* ============================================================
     DIVISION
  ============================================================ */

  const divisionData = useMemo(() => {
    const groups: Record<string, Profile[]> = {};

    employees.forEach((employee) => {
      const division =
        employee.division?.trim() || "Tanpa Divisi";

      (groups[division] ||= []).push(employee);
    });

    const attendanceIds = new Set(
      attendances.map((item) => item.profile_id)
    );

    return Object.entries(groups)
      .map(([name, list]) => {
        const present = list.filter((e) =>
          attendanceIds.has(e.id)
        );

        const absent = list.filter(
          (e) => !attendanceIds.has(e.id)
        );

        const total = list.length;

        return {
          name,
          employees: list,
          present,
          absent,
          total,
          presentCount: present.length,
          absentCount: absent.length,
          percentage:
            total > 0
              ? Math.round((present.length / total) * 100)
              : 0,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, attendances]);

  const totalEmployees = employees.length;

  const totalPresent = divisionData.reduce(
    (sum, d) => sum + d.presentCount,
    0
  );

  const totalAbsent = divisionData.reduce(
    (sum, d) => sum + d.absentCount,
    0
  );

  const attendancePercentage =
    totalEmployees > 0
      ? Math.round((totalPresent / totalEmployees) * 100)
      : 0;

  const goToToday = () => setSelectedDate(getTodayString());

  const openDivisionModal = (division: DivisionData) => {
    setSelectedDivision(division);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => setSelectedDivision(null), 150);
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
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1450px] items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">
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
            href={getDashboardPath(userRole)}
            className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 sm:px-4 sm:text-sm"
          >
            <span className="transition-transform group-hover:-translate-x-0.5">
              ←
            </span>
            Dashboard
          </Link>
        </div>
      </header>

      {/* CONTENT */}
      <div className="mx-auto max-w-[1450px] px-5 py-7 sm:px-8 sm:py-9">
        {/* TITLE */}
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
                Pantau karyawan yang sudah dan belum melakukan
                absensi pada hari tertentu.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div>
                <label className="mb-1.5 ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Tanggal
                </label>

                <input
                  type="date"
                  value={selectedDate}
                  max={today}
                  onChange={(e) =>
                    setSelectedDate(
                      e.target.value > getTodayString()
                        ? getTodayString()
                        : e.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 sm:w-auto"
                />
              </div>

              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
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

        {/* DATE */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <span className="text-sm font-bold text-slate-700">
              {formattedDate}
            </span>
          </div>

          <span
            className={`rounded-xl px-3.5 py-2.5 text-xs font-bold ${
              selectedDateIsFuture
                ? "bg-violet-50 text-violet-700"
                : isWeekend
                ? "bg-amber-50 text-amber-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {selectedDateIsFuture
              ? "◷ Belum dimulai"
              : isWeekend
              ? "☕ Hari libur"
              : "● Hari kerja"}
          </span>
        </div>

        {/* FUTURE */}
        {selectedDateIsFuture ? (
          <EmptyState
            icon="🗓️"
            title="Tanggal Belum Dimulai"
            text={
              <>
                Data absensi untuk{" "}
                <b className="text-slate-600">
                  {formattedDate}
                </b>{" "}
                belum tersedia.
              </>
            }
            button="Kembali ke Hari Ini"
            onClick={goToToday}
            violet
          />
        ) : (
          <>
            {/* ERROR */}
            {errorMessage && (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100">
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

            {/* EMPTY */}
            {employees.length === 0 ? (
              <EmptyState
                icon="📭"
                title="Belum Ada Karyawan"
                text={
                  <>
                    Tidak ada karyawan yang terdaftar pada tanggal{" "}
                    <b className="text-slate-600">
                      {formattedDate}
                    </b>
                    .
                  </>
                }
                button="Kembali ke Hari Ini"
                onClick={goToToday}
              />
            ) : (
              <>
                {/* STATS */}
                <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    title="Total"
                    value={totalEmployees}
                    subtitle="Karyawan aktif"
                    icon="👥"
                  />

                  <StatCard
                    title="Hadir"
                    value={totalPresent}
                    subtitle="Sudah melakukan absensi"
                    icon="✓"
                    color="emerald"
                  />

                  <StatCard
                    title="Belum"
                    value={totalAbsent}
                    subtitle="Belum melakukan absensi"
                    icon="!"
                    color="rose"
                  />

                  <StatCard
                    title="Persentase"
                    value={`${attendancePercentage}%`}
                    subtitle="Tingkat kehadiran"
                    icon="%"
                    color="indigo"
                  />
                </section>

                {/* PROGRESS */}
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
                      <div className="mb-2 flex justify-between">
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

                {/* DIVISION */}
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

                  {!divisionData.length ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center">
                      <p className="text-sm font-bold text-slate-400">
                        Belum ada data divisi.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {divisionData.map((division) => {
                        const perfect =
                          division.absentCount === 0;

                        return (
                          <button
                            key={division.name}
                            onClick={() =>
                              openDivisionModal(division)
                            }
                            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
                          >
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
                                  perfect
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "bg-rose-50 text-rose-600"
                                }`}
                              >
                                {perfect
                                  ? "LENGKAP"
                                  : `${division.absentCount} BELUM`}
                              </span>
                            </div>

                            <div className="my-5 h-px bg-slate-100" />

                            <div className="grid grid-cols-2 gap-3">
                              <MiniBox
                                title="Sudah Absen"
                                value={division.presentCount}
                                color="emerald"
                              />

                              <MiniBox
                                title="Belum Absen"
                                value={division.absentCount}
                                color="rose"
                              />
                            </div>

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
                                  className={`h-full rounded-full ${
                                    perfect
                                      ? "bg-emerald-500"
                                      : "bg-indigo-500"
                                  }`}
                                  style={{
                                    width: `${division.percentage}%`,
                                  }}
                                />
                              </div>
                            </div>

                            <div className="mt-5 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400">
                                Lihat detail
                              </span>

                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 transition group-hover:bg-indigo-600 group-hover:text-white">
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

      {/* ============================================================
         MODAL
      ============================================================ */}

      {showModal && selectedDivision && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
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

              <div className="mt-5 grid grid-cols-3 gap-2.5">
                <ModalStat
                  title="Total"
                  value={selectedDivision.total}
                />

                <ModalStat
                  title="Hadir"
                  value={selectedDivision.presentCount}
                  color="emerald"
                />

                <ModalStat
                  title="Belum"
                  value={selectedDivision.absentCount}
                  color="rose"
                />
              </div>
            </div>

            <div className="max-h-[55vh] overflow-y-auto bg-[#f8fafc] p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <EmployeeList
                  title="Sudah Absen"
                  count={selectedDivision.presentCount}
                  employees={selectedDivision.present}
                  present
                />

                <EmployeeList
                  title="Belum Absen"
                  count={selectedDivision.absentCount}
                  employees={selectedDivision.absent}
                />
              </div>
            </div>

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

      {/* PRINT */}
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

/* ============================================================
   COMPONENTS
============================================================ */

function EmptyState({
  icon,
  title,
  text,
  button,
  onClick,
  violet = false,
}: {
  icon: string;
  title: string;
  text: React.ReactNode;
  button: string;
  onClick: () => void;
  violet?: boolean;
}) {
  return (
    <section
      className={`flex min-h-[430px] items-center justify-center rounded-3xl border border-dashed bg-white ${
        violet
          ? "border-violet-200"
          : "border-slate-300"
      }`}
    >
      <div className="max-w-md px-6 text-center">
        <div
          className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl text-4xl ${
            violet ? "bg-violet-50" : "bg-slate-50"
          }`}
        >
          {icon}
        </div>

        <h3 className="text-xl font-black text-slate-900">
          {title}
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          {text}
        </p>

        <button
          onClick={onClick}
          className="mt-6 rounded-xl bg-slate-950 px-5 py-3 text-xs font-black text-white transition hover:bg-indigo-600"
        >
          {button}
        </button>
      </div>
    </section>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = "slate",
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  color?: "slate" | "emerald" | "rose" | "indigo";
}) {
  const styles = {
    slate: "border-slate-200 text-slate-950 bg-slate-100",
    emerald: "border-emerald-100 text-emerald-600 bg-emerald-50",
    rose: "border-rose-100 text-rose-600 bg-rose-50",
    indigo: "border-indigo-100 text-indigo-600 bg-indigo-50",
  };

  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm ${styles[color].split(" ")[0]}`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-[10px] font-black uppercase tracking-widest ${styles[
            color
          ].split(" ")[1]}`}
        >
          {title}
        </span>

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm ${styles[
            color
          ]
            .split(" ")
            .slice(2)
            .join(" ")}`}
        >
          {icon}
        </div>
      </div>

      <p
        className={`mt-5 text-3xl font-black ${styles[color].split(" ")[1]}`}
      >
        {value}
      </p>

      <p className="mt-1 text-xs font-semibold text-slate-400">
        {subtitle}
      </p>
    </div>
  );
}

function MiniBox({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: "emerald" | "rose";
}) {
  const green = color === "emerald";

  return (
    <div
      className={`rounded-xl p-3.5 ${
        green ? "bg-emerald-50" : "bg-rose-50"
      }`}
    >
      <p
        className={`text-[10px] font-bold ${
          green ? "text-emerald-500" : "text-rose-500"
        }`}
      >
        {title}
      </p>

      <p
        className={`mt-1 text-xl font-black ${
          green ? "text-emerald-700" : "text-rose-700"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ModalStat({
  title,
  value,
  color = "slate",
}: {
  title: string;
  value: number;
  color?: "slate" | "emerald" | "rose";
}) {
  const styles = {
    slate: "bg-slate-50 text-slate-900 text-slate-400",
    emerald: "bg-emerald-50 text-emerald-700 text-emerald-500",
    rose: "bg-rose-50 text-rose-700 text-rose-500",
  };

  const [bg, valueColor, labelColor] =
    styles[color].split(" ");

  return (
    <div className={`rounded-xl p-3 ${bg}`}>
      <p
        className={`text-[9px] font-black uppercase tracking-wider ${labelColor}`}
      >
        {title}
      </p>

      <p className={`mt-1 text-xl font-black ${valueColor}`}>
        {value}
      </p>
    </div>
  );
}

function EmployeeList({
  title,
  count,
  employees,
  present = false,
}: {
  title: string;
  count: number;
  employees: Profile[];
  present?: boolean;
}) {
  const green = present;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-black text-slate-800">
            {title}
          </h4>

          <p
            className={`text-[10px] font-semibold ${
              green ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {count} orang
          </p>
        </div>

        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            green
              ? "bg-emerald-100 text-emerald-600"
              : "bg-rose-100 text-rose-600"
          }`}
        >
          {green ? "✓" : "!"}
        </div>
      </div>

      {!employees.length ? (
        <div
          className={`rounded-xl border p-5 text-center ${
            green
              ? "border-slate-200 bg-white"
              : "border-emerald-100 bg-emerald-50"
          }`}
        >
          <p
            className={`text-xs font-bold ${
              green
                ? "text-slate-400"
                : "text-emerald-600"
            }`}
          >
            {green
              ? "Belum ada yang absen."
              : "🎉 Semua sudah absen!"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {employees.map((employee) => (
            <div
              key={employee.id}
              className={`flex items-center gap-3 rounded-xl border bg-white p-3 ${
                green
                  ? "border-emerald-100"
                  : "border-rose-100"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                  green
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-rose-50 text-rose-600"
                }`}
              >
                {employee.full_name
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="truncate text-xs font-black text-slate-800">
                  {employee.full_name}
                </p>

                <p
                  className={`mt-0.5 text-[10px] font-semibold ${
                    green
                      ? "text-emerald-500"
                      : "text-rose-500"
                  }`}
                >
                  {green
                    ? "Sudah melakukan absensi"
                    : "Belum melakukan absensi"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}