"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Employee {
  id: string;
  full_name: string;
  created_at: string;
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

interface EmployeeSummary {
  id: string;
  name: string;
  createdAt: string;

  present: number;
  late: number;
  sick: number;
  leave: number;
  absent: number;

  totalAttendances: number;
  activeDays: number;

  accountBeforeMonth: boolean;
  accountCreatedInMonth: boolean;
  accountAfterMonth: boolean;
  monthNotStarted: boolean;
  hasAttendance: boolean;
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

export default function MonthlyReportPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("Company Attendance");

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();

    return `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}`;
  });

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);

  const [errorMessage, setErrorMessage] = useState("");

  /**
   * ============================
   * LOAD DATA
   * ============================
   */
  useEffect(() => {
    const fetchData = async () => {
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
       * Ambil profile admin/owner
       */
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, company_id, companies(name)")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        setErrorMessage("Profile tidak ditemukan.");
        setLoading(false);
        return;
      }

      /**
       * Employee tidak boleh membuka rekap
       */
      if (profile.role === "employee") {
        router.push("/dashboard");
        return;
      }

      /**
       * Nama perusahaan
       */
      if (profile.companies) {
        const company = profile.companies as any;

        setCompanyName(
          company?.name || "Company Attendance"
        );
      }

      /**
       * Ambil semua user perusahaan
       *
       * Owner tidak ditampilkan.
       */
      const { data: employeeData, error: employeeError } =
        await supabase
          .from("profiles")
          .select("id, full_name, created_at")
          .eq("company_id", profile.company_id)
          .neq("role", "owner")
          .order("created_at", { ascending: true });

      if (employeeError) {
        setErrorMessage(employeeError.message);
        setLoading(false);
        return;
      }

      const employeeList = employeeData || [];

      setEmployees(employeeList);

      /**
       * ============================
       * PERIODE BULAN
       * ============================
       */
      const [yearString, monthString] =
        selectedMonth.split("-");

      const year = Number(yearString);
      const month = Number(monthString);

      /**
       * Gunakan batas bulan dalam UTC.
       *
       * Attendance created_at diasumsikan timestamp
       * dari database Supabase.
       */
      const startDate = new Date(
        Date.UTC(year, month - 1, 1, 0, 0, 0)
      );

      const endDate = new Date(
        Date.UTC(year, month, 1, 0, 0, 0)
      );

      /**
       * Ambil attendance bulan tersebut.
       */
      if (employeeList.length > 0) {
        const employeeIds = employeeList.map(
          (employee) => employee.id
        );

        const { data: attendanceData, error: attendanceError } =
          await supabase
            .from("attendance")
            .select(
              "id, profile_id, status, created_at, check_in, check_out, reason"
            )
            .in("profile_id", employeeIds)
            .gte(
              "created_at",
              startDate.toISOString()
            )
            .lt(
              "created_at",
              endDate.toISOString()
            )
            .order("created_at", {
              ascending: false,
            });

        if (attendanceError) {
          setErrorMessage(attendanceError.message);
          setLoading(false);
          return;
        }

        setAttendances(attendanceData || []);
      } else {
        setAttendances([]);
      }

      setLoading(false);
    };

    fetchData();
  }, [selectedMonth, router]);

  /**
   * ============================
   * DATE INFORMATION
   * ============================
   */
  const monthInfo = useMemo(() => {
    const [yearString, monthString] =
      selectedMonth.split("-");

    const year = Number(yearString);
    const month = Number(monthString);

    const today = new Date();

    const selectedStart = new Date(
      year,
      month - 1,
      1
    );

    const nextMonthStart = new Date(
      year,
      month,
      1
    );

    const isFuture =
      selectedStart > today;

    const isCurrentMonth =
      selectedStart.getFullYear() === today.getFullYear() &&
      selectedStart.getMonth() === today.getMonth();

    const daysInMonth = new Date(
      year,
      month,
      0
    ).getDate();

    return {
      year,
      month,
      monthName: MONTHS[month - 1],
      isFuture,
      isCurrentMonth,
      daysInMonth,
      nextMonthStart,
    };
  }, [selectedMonth]);

  /**
   * ============================
   * SUMMARY
   * ============================
   */
  const reportData = useMemo(() => {
    const {
      year,
      month,
      isFuture,
      isCurrentMonth,
    } = monthInfo;

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

    const today = new Date();

    return employees.map((employee) => {
      const createdDate = new Date(
        employee.created_at
      );

      /**
       * Akun dibuat setelah bulan yang dipilih.
       *
       * Contoh:
       * User dibuat September
       * Lihat Agustus
       * => USER BELUM ADA
       */
      const accountAfterMonth =
        createdDate >= nextMonth;

      /**
       * User sudah ada sebelum bulan dimulai.
       */
      const accountBeforeMonth =
        createdDate < monthStart;

      /**
       * User dibuat di bulan yang sedang dipilih.
       */
      const accountCreatedInMonth =
        createdDate >= monthStart &&
        createdDate < nextMonth;

      /**
       * Attendance milik user ini.
       */
      const employeeAttendances =
        attendances.filter(
          (attendance) =>
            attendance.profile_id === employee.id
        );

      const present =
        employeeAttendances.filter(
          (attendance) =>
            attendance.status === "present"
        ).length;

      const late =
        employeeAttendances.filter(
          (attendance) =>
            attendance.status === "late"
        ).length;

      const sick =
        employeeAttendances.filter(
          (attendance) =>
            attendance.status === "sakit"
        ).length;

      const leave =
        employeeAttendances.filter(
          (attendance) =>
            attendance.status === "izin"
        ).length;

      const absent =
        employeeAttendances.filter(
          (attendance) =>
            attendance.status === "absent"
        ).length;

      const totalAttendances =
        present + late;

      /**
       * Berapa hari user aktif pada bulan tersebut.
       *
       * Jika user dibuat 26 Agustus:
       * aktif mulai 26 Agustus.
       */
      let activeDays = monthInfo.daysInMonth;

      if (accountCreatedInMonth) {
        activeDays =
          Math.max(
            0,
            monthInfo.daysInMonth -
              createdDate.getDate() +
              1
          );
      }

      /**
       * Kalau bulan sekarang:
       * hanya hitung sampai hari ini.
       *
       * Misalnya sekarang 27 Agustus,
       * jangan bilang sudah aktif 31 hari.
       */
      if (isCurrentMonth) {
        const currentDay =
          today.getDate();

        if (accountBeforeMonth) {
          activeDays = currentDay;
        }

        if (accountCreatedInMonth) {
          activeDays =
            Math.max(
              0,
              currentDay -
                createdDate.getDate() +
                1
            );
        }
      }

      const hasAttendance =
        employeeAttendances.length > 0;

      return {
        id: employee.id,
        name:
          employee.full_name || "Tanpa Nama",
        createdAt: employee.created_at,

        present,
        late,
        sick,
        leave,
        absent,

        totalAttendances,
        activeDays,

        accountBeforeMonth,
        accountCreatedInMonth,
        accountAfterMonth,

        monthNotStarted: isFuture,

        hasAttendance,
      };
    });
  }, [
    employees,
    attendances,
    monthInfo,
  ]);

  /**
   * ============================
   * COMPANY TOTAL
   * ============================
   */
  const companyStats = useMemo(() => {
    const activeEmployees =
      reportData.filter(
        (employee) =>
          !employee.accountAfterMonth
      );

    return {
      employees: activeEmployees.length,

      attendance: activeEmployees.reduce(
        (total, employee) =>
          total +
          employee.totalAttendances,
        0
      ),

      late: activeEmployees.reduce(
        (total, employee) =>
          total + employee.late,
        0
      ),

      sick: activeEmployees.reduce(
        (total, employee) =>
          total + employee.sick,
        0
      ),

      leave: activeEmployees.reduce(
        (total, employee) =>
          total + employee.leave,
        0
      ),
    };
  }, [reportData]);

  /**
   * ============================
   * FORMAT DATE
   * ============================
   */
  const formatCreatedDate = (
    date: string
  ) => {
    return new Date(date).toLocaleDateString(
      "id-ID",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );
  };

  const formattedMonth =
    `${monthInfo.monthName} ${monthInfo.year}`;

  /**
   * ============================
   * PRINT
   * ============================
   */
  const handlePrint = () => {
    window.print();
  };

  /**
   * ============================
   * LOADING
   * ============================
   */
  if (loading && employees.length === 0) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-white/10 border-t-blue-500" />

          <h2 className="text-xl font-black text-white">
            Menyiapkan Rekap
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Sedang mengambil data kehadiran...
          </p>
        </div>
      </main>
    );
  }

  /**
   * ============================
   * ERROR
   * ============================
   */
  if (errorMessage) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
        <div className="max-w-md rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <div className="mb-4 text-5xl">
            ⚠️
          </div>

          <h2 className="text-xl font-black text-white">
            Terjadi Kesalahan
          </h2>

          <p className="mt-3 text-sm text-red-200">
            {errorMessage}
          </p>

          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-900"
          >
            Kembali
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900 print:bg-white">
      {/* =====================================
          BACKGROUND DECORATION
      ===================================== */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden print:hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -right-32 top-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      {/* =====================================
          HEADER
      ===================================== */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 p-1.5 shadow-lg shadow-blue-100">
              <img
                src="/svara.png"
                alt="SVARA"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-base font-black text-slate-900 sm:text-xl">
                {companyName}
              </h1>

              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500 sm:text-xs">
                Attendance Analytics
              </p>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="group flex shrink-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 sm:px-5 sm:text-sm"
          >
            <span className="transition-transform group-hover:-translate-x-1">
              ←
            </span>

            <span className="hidden sm:inline">
              Dashboard
            </span>

            <span className="sm:hidden">
              Kembali
            </span>
          </Link>
        </div>
      </header>

      <div className="relative mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        {/* =====================================
            HERO
        ===================================== */}
        <section className="mb-7 overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 p-6 text-white shadow-2xl shadow-blue-200/40 sm:p-8 lg:p-10 print:hidden">
          <div className="relative">
            <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full bg-blue-400/10 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-blue-200">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  Monthly Report
                </div>

                <h2 className="max-w-3xl text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                  Rekap Kehadiran
                  <span className="block text-blue-300">
                    {formattedMonth}
                  </span>
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  Pantau performa kehadiran setiap karyawan
                  berdasarkan bulan, termasuk kapan akun dibuat,
                  jumlah hari hadir, keterlambatan, sakit, dan izin.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Pilih Bulan
                  </label>

                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(event) =>
                      setSelectedMonth(
                        event.target.value
                      )
                    }
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-black text-white outline-none backdrop-blur transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 sm:w-52"
                  />
                </div>

                <button
                  onClick={handlePrint}
                  className="h-12 rounded-xl bg-white px-5 text-sm font-black text-slate-900 shadow-xl transition hover:-translate-y-0.5 hover:bg-blue-50 active:scale-95"
                >
                  🖨️ Cetak
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================
            FUTURE MONTH NOTICE
        ===================================== */}
        {monthInfo.isFuture && (
          <div className="mb-7 flex items-start gap-4 rounded-3xl border border-indigo-100 bg-indigo-50 p-5 text-indigo-900 shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
              🗓️
            </div>

            <div>
              <h3 className="font-black">
                Bulan belum dimulai
              </h3>

              <p className="mt-1 text-sm font-medium text-indigo-700">
                {formattedMonth} belum dimulai.
                Data kehadiran akan muncul ketika bulan
                tersebut sudah berjalan.
              </p>
            </div>
          </div>
        )}

        {/* =====================================
            STATS
        ===================================== */}
        <section className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <span className="text-2xl">
                👥
              </span>

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-500">
                Aktif
              </span>
            </div>

            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Karyawan
            </p>

            <p className="mt-1 text-3xl font-black text-slate-900 sm:text-4xl">
              {companyStats.employees}
            </p>
          </div>

          <div className="group rounded-3xl border border-blue-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <span className="text-2xl">
                📊
              </span>

              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-blue-600">
                Hadir
              </span>
            </div>

            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Total Masuk
            </p>

            <p className="mt-1 text-3xl font-black text-blue-600 sm:text-4xl">
              {companyStats.attendance}
            </p>
          </div>

          <div className="group rounded-3xl border border-yellow-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <span className="text-2xl">
                ⏰
              </span>

              <span className="rounded-full bg-yellow-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-yellow-600">
                Late
              </span>
            </div>

            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Terlambat
            </p>

            <p className="mt-1 text-3xl font-black text-yellow-600 sm:text-4xl">
              {companyStats.late}
            </p>
          </div>

          <div className="group rounded-3xl border border-purple-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <span className="text-2xl">
                📝
              </span>

              <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-purple-600">
                Izin
              </span>
            </div>

            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Sakit + Izin
            </p>

            <p className="mt-1 text-3xl font-black text-purple-600 sm:text-4xl">
              {companyStats.sick +
                companyStats.leave}
            </p>
          </div>
        </section>

        {/* =====================================
            TABLE CARD
        ===================================== */}
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          {/* Table header */}
          <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-lg font-black text-slate-900 sm:text-xl">
                  Daftar Karyawan
                </h3>

                <p className="mt-1 text-xs font-medium text-slate-400 sm:text-sm">
                  Klik nama karyawan untuk melihat detail harian.
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 px-4 py-2 text-xs font-black text-slate-500">
                {formattedMonth}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-blue-600" />

              <p className="mt-4 text-sm font-bold text-slate-400">
                Menghitung rekap...
              </p>
            </div>
          ) : reportData.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-slate-50 text-5xl">
                👥
              </div>

              <h3 className="text-xl font-black text-slate-800">
                Belum ada karyawan
              </h3>

              <p className="mt-2 max-w-md text-sm font-medium leading-6 text-slate-400">
                Belum terdapat karyawan di perusahaan ini.
              </p>
            </div>
          ) : (
            <>
              {/* MOBILE CARD VIEW */}
              <div className="space-y-3 p-4 md:hidden">
                {reportData.map((employee) => {
                  return (
                    <Link
                      href={`/rekap/${employee.id}`}
                      key={employee.id}
                      className="block rounded-3xl border border-slate-200 bg-slate-50/60 p-4 transition active:scale-[0.99] hover:border-blue-200 hover:bg-blue-50/40"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-black text-white shadow-lg shadow-blue-200">
                          {employee.name
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="truncate font-black text-slate-900">
                                {employee.name}
                              </h4>

                              <p className="mt-0.5 text-[10px] font-bold text-slate-400">
                                Dibuat{" "}
                                {formatCreatedDate(
                                  employee.createdAt
                                )}
                              </p>
                            </div>

                            <span className="text-lg text-slate-300">
                              →
                            </span>
                          </div>

                          {/* STATUS BULAN */}
                          {employee.accountAfterMonth ? (
                            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Status
                              </p>

                              <p className="mt-1 text-sm font-black text-slate-600">
                                USER BELUM ADA
                              </p>

                              <p className="mt-1 text-xs font-medium text-slate-400">
                                Akun baru dibuat pada{" "}
                                {formatCreatedDate(
                                  employee.createdAt
                                )}
                              </p>
                            </div>
                          ) : employee.monthNotStarted ? (
                            <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-3">
                              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                                Status
                              </p>

                              <p className="mt-1 text-sm font-black text-indigo-700">
                                BULAN BELUM DIMULAI
                              </p>
                            </div>
                          ) : (
                            <>
                              {employee.accountCreatedInMonth && (
                                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-3">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                                    Karyawan Baru
                                  </p>

                                  <p className="mt-1 text-xs font-bold leading-5 text-blue-700">
                                    Akun dibuat{" "}
                                    {formatCreatedDate(
                                      employee.createdAt
                                    )}
                                    . Aktif sekitar{" "}
                                    {employee.activeDays} hari
                                    pada periode ini.
                                  </p>
                                </div>
                              )}

                              <div className="mt-4 grid grid-cols-2 gap-2">
                                <div className="rounded-2xl bg-white p-3">
                                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                    Total Masuk
                                  </p>

                                  <p className="mt-1 text-2xl font-black text-blue-600">
                                    {
                                      employee.totalAttendances
                                    }
                                    <span className="ml-1 text-xs">
                                      hari
                                    </span>
                                  </p>
                                </div>

                                <div className="rounded-2xl bg-white p-3">
                                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                    Aktif
                                  </p>

                                  <p className="mt-1 text-2xl font-black text-slate-800">
                                    {
                                      employee.activeDays
                                    }
                                    <span className="ml-1 text-xs">
                                      hari
                                    </span>
                                  </p>
                                </div>
                              </div>

                              <div className="mt-2 grid grid-cols-4 gap-2">
                                <MiniStat
                                  label="Hadir"
                                  value={
                                    employee.present
                                  }
                                  className="text-emerald-600 bg-emerald-50"
                                />

                                <MiniStat
                                  label="Telat"
                                  value={
                                    employee.late
                                  }
                                  className="text-yellow-600 bg-yellow-50"
                                />

                                <MiniStat
                                  label="Sakit"
                                  value={
                                    employee.sick
                                  }
                                  className="text-orange-600 bg-orange-50"
                                />

                                <MiniStat
                                  label="Izin"
                                  value={
                                    employee.leave
                                  }
                                  className="text-purple-600 bg-purple-50"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* DESKTOP TABLE */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1050px] text-left">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                        #
                      </th>

                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                        Karyawan
                      </th>

                      <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-[0.15em] text-emerald-500">
                        Hadir
                      </th>

                      <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-[0.15em] text-yellow-500">
                        Telat
                      </th>

                      <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-[0.15em] text-orange-500">
                        Sakit
                      </th>

                      <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-[0.15em] text-purple-500">
                        Izin
                      </th>

                      <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-[0.15em] text-red-500">
                        Alpa
                      </th>

                      <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-[0.15em] text-blue-500">
                        Total Masuk
                      </th>

                      <th className="px-6 py-5 text-center text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                        Detail
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {reportData.map(
                      (employee, index) => (
                        <tr
                          key={employee.id}
                          className="group transition hover:bg-blue-50/30"
                        >
                          {/* NUMBER */}
                          <td className="px-6 py-5">
                            <span className="text-xs font-black text-slate-300">
                              {String(
                                index + 1
                              ).padStart(2, "0")}
                            </span>
                          </td>

                          {/* NAME */}
                          <td className="px-6 py-5">
                            <Link
                              href={`/rekap/${employee.id}`}
                              className="group/name flex items-center gap-3"
                            >
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-black text-white shadow-lg shadow-blue-100 transition group-hover/name:scale-105">
                                {employee.name
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div className="min-w-0">
                                <p className="font-black text-slate-900 transition group-hover/name:text-blue-600">
                                  {employee.name}
                                </p>

                                <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                                  Dibuat{" "}
                                  {formatCreatedDate(
                                    employee.createdAt
                                  )}
                                </p>
                              </div>
                            </Link>
                          </td>

                          {/* HADIR */}
                          <td className="px-4 py-5 text-center">
                            <NumberBadge
                              value={
                                employee.present
                              }
                              className="bg-emerald-50 text-emerald-600 border-emerald-100"
                            />
                          </td>

                          {/* TELAT */}
                          <td className="px-4 py-5 text-center">
                            <NumberBadge
                              value={
                                employee.late
                              }
                              className="bg-yellow-50 text-yellow-600 border-yellow-100"
                            />
                          </td>

                          {/* SAKIT */}
                          <td className="px-4 py-5 text-center">
                            <NumberBadge
                              value={
                                employee.sick
                              }
                              className="bg-orange-50 text-orange-600 border-orange-100"
                            />
                          </td>

                          {/* IZIN */}
                          <td className="px-4 py-5 text-center">
                            <NumberBadge
                              value={
                                employee.leave
                              }
                              className="bg-purple-50 text-purple-600 border-purple-100"
                            />
                          </td>

                          {/* ALPA */}
                          <td className="px-4 py-5 text-center">
                            <NumberBadge
                              value={
                                employee.absent
                              }
                              className="bg-red-50 text-red-500 border-red-100"
                            />
                          </td>

                          {/* TOTAL */}
                          <td className="px-4 py-5 text-center">
                            {employee.accountAfterMonth ? (
                              <StatusBadge>
                                USER BELUM ADA
                              </StatusBadge>
                            ) : employee.monthNotStarted ? (
                              <StatusBadge>
                                BULAN BELUM DIMULAI
                              </StatusBadge>
                            ) : (
                              <div className="inline-flex flex-col items-center rounded-2xl bg-blue-50 px-4 py-2.5">
                                <span className="text-xl font-black text-blue-600">
                                  {
                                    employee.totalAttendances
                                  }
                                </span>

                                <span className="text-[9px] font-black uppercase tracking-wider text-blue-400">
                                  hari
                                </span>
                              </div>
                            )}
                          </td>

                          {/* DETAIL */}
                          <td className="px-6 py-5 text-center">
                            <Link
                              href={`/rekap/${employee.id}`}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                            >
                              Lihat Detail
                              <span>→</span>
                            </Link>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* =====================================
            LEGEND
        ===================================== */}
        <div className="mt-5 flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-400 print:hidden">
          <span className="font-black uppercase tracking-widest">
            Keterangan:
          </span>

          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-600">
            Total Masuk = Hadir + Telat
          </span>

          <span className="rounded-full bg-slate-100 px-3 py-1.5">
            Aktif = Hari sejak akun dibuat
          </span>

          <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-indigo-600">
            User belum ada = akun dibuat setelah bulan
          </span>
        </div>
      </div>

      {/* =====================================
          PRINT HEADER
      ===================================== */}
      <div className="hidden print:block">
        <div className="mx-auto max-w-6xl px-8 py-8">
          <div className="flex items-center gap-4 border-b-2 border-black pb-5">
            <img
              src="/svara.png"
              alt="SVARA"
              className="h-16 w-32 object-contain"
            />

            <div>
              <h1 className="text-2xl font-black">
                {companyName}
              </h1>

              <p className="text-sm font-bold">
                Laporan Rekapitulasi Kehadiran
              </p>

              <p className="text-xs">
                Periode: {formattedMonth}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * ==========================================
 * COMPONENTS
 * ==========================================
 */

function NumberBadge({
  value,
  className,
}: {
  value: number;
  className: string;
}) {
  return (
    <span
      className={`inline-flex min-w-[42px] items-center justify-center rounded-xl border px-3 py-2 text-sm font-black ${className}`}
    >
      {value}
    </span>
  );
}

function StatusBadge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex max-w-[140px] items-center justify-center rounded-xl bg-slate-100 px-3 py-2 text-[9px] font-black uppercase leading-4 tracking-wide text-slate-500">
      {children}
    </span>
  );
}

function MiniStat({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div
      className={`rounded-xl p-2 text-center ${className}`}
    >
      <p className="text-[8px] font-black uppercase tracking-wider opacity-70">
        {label}
      </p>

      <p className="mt-0.5 text-sm font-black">
        {value}
      </p>
    </div>
  );
}