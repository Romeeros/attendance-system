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

/*
 * ============================================================
 * HELPER DATE
 * ============================================================
 */

/**
 * Mengambil tanggal hari ini berdasarkan waktu lokal browser.
 *
 * Contoh:
 * 2026-08-26
 */
const getTodayString = () => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/**
 * Membuat Date dari string YYYY-MM-DD
 * tanpa masalah timezone UTC.
 */
const createLocalDate = (dateString: string) => {
  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  return new Date(
    year,
    month - 1,
    day,
    0,
    0,
    0,
    0
  );
};

/**
 * Mengecek apakah tanggal yang dipilih adalah
 * tanggal di masa depan.
 */
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

  /*
   * ============================================================
   * SELECTED DATE
   * ============================================================
   */

  const [selectedDate, setSelectedDate] = useState(
    todayString
  );

  const [employees, setEmployees] = useState<Profile[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>(
    []
  );

  const [selectedDivision, setSelectedDivision] =
    useState<DivisionData | null>(null);

  const [showModal, setShowModal] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  /*
   * ============================================================
   * FUTURE DATE
   * ============================================================
   */

  const selectedDateIsFuture = isFutureDate(selectedDate);

  /*
   * ============================================================
   * FETCH DATA
   * ============================================================
   */

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");

      /*
       * ========================================================
       * CEGAH TANGGAL MASA DEPAN
       * ========================================================
       *
       * Kalau tanggal yang dipilih belum dimulai,
       * jangan mengambil data employee maupun attendance.
       *
       * Contoh:
       *
       * Hari ini 26 Agustus
       * Pilih 27 Agustus
       *
       * Maka:
       * employees = []
       * attendances = []
       *
       * Tidak akan dianggap:
       * 16 karyawan belum absen.
       */

      if (isFutureDate(selectedDate)) {
        setEmployees([]);
        setAttendances([]);
        setSelectedDivision(null);
        setShowModal(false);

        return;
      }

      /*
       * ========================================================
       * USER LOGIN
       * ========================================================
       */

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      /*
       * ========================================================
       * PROFILE USER LOGIN
       * ========================================================
       */

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            "id, role, company_id, companies(name)"
          )
          .eq("id", user.id)
          .single();

      if (profileError || !profile) {
        throw new Error(
          "Data profile tidak ditemukan."
        );
      }

      /*
       * Employee tidak boleh membuka halaman laporan
       */

      if (profile.role === "employee") {
        router.push("/dashboard");
        return;
      }

      /*
       * ========================================================
       * NAMA PERUSAHAAN
       * ========================================================
       */

      if (profile.companies) {
        const companyData = profile.companies as any;

        setCompanyName(
          companyData.name || "Company Attendance"
        );
      }

      /*
       * ========================================================
       * TENTUKAN RANGE TANGGAL
       * ========================================================
       */

      const selectedDateObject =
        createLocalDate(selectedDate);

      const selectedStart = new Date(
        selectedDateObject
      );

      const selectedEnd = new Date(
        selectedDateObject
      );

      selectedEnd.setHours(
        23,
        59,
        59,
        999
      );

      /*
       * ========================================================
       * AMBIL SEMUA EMPLOYEE PERUSAHAAN
       * ========================================================
       */

      const {
        data: employeeData,
        error: employeeError,
      } = await supabase
        .from("profiles")
        .select(
          "id, full_name, division, created_at"
        )
        .eq(
          "company_id",
          profile.company_id
        )
        .neq("role", "owner")
        .order("division", {
          ascending: true,
        })
        .order("full_name", {
          ascending: true,
        });

      if (employeeError) {
        throw new Error(
          employeeError.message
        );
      }

      const allEmployees = employeeData || [];

      /*
       * ========================================================
       * FILTER EMPLOYEE BERDASARKAN CREATED_AT
       * ========================================================
       *
       * Hanya karyawan yang sudah dibuat pada atau
       * sebelum tanggal monitoring yang dihitung.
       *
       * Contoh:
       *
       * Employee dibuat 26 Agustus
       *
       * Monitoring 25 Agustus
       * -> Tidak dihitung
       *
       * Monitoring 26 Agustus
       * -> Dihitung
       *
       * Monitoring 27 Agustus
       * -> Tidak boleh karena tanggal future
       */

      const activeEmployees = allEmployees.filter(
        (employee) => {
          const employeeCreatedAt = new Date(
            employee.created_at
          );

          return employeeCreatedAt <= selectedEnd;
        }
      );

      /*
       * ========================================================
       * TIDAK ADA EMPLOYEE
       * ========================================================
       */

      if (activeEmployees.length === 0) {
        setEmployees([]);
        setAttendances([]);

        return;
      }

      /*
       * Simpan employee aktif
       */

      setEmployees(activeEmployees);

      /*
       * ========================================================
       * AMBIL DATA ABSENSI
       * ========================================================
       */

      const employeeIds = activeEmployees.map(
        (employee) => employee.id
      );

      const {
        data: attendanceData,
        error: attendanceError,
      } = await supabase
        .from("attendance")
        .select(
          "profile_id, created_at"
        )
        .in(
          "profile_id",
          employeeIds
        )
        .gte(
          "created_at",
          selectedStart.toISOString()
        )
        .lte(
          "created_at",
          selectedEnd.toISOString()
        );

      if (attendanceError) {
        throw new Error(
          attendanceError.message
        );
      }

      setAttendances(
        attendanceData || []
      );
    } catch (error: any) {
      console.error(
        "Fetch attendance error:",
        error
      );

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

  /*
   * ============================================================
   * LOAD DATA
   * ============================================================
   */

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  /*
   * ============================================================
   * WEEKEND
   * ============================================================
   */

  const isWeekend = useMemo(() => {
    const date = createLocalDate(
      selectedDate
    );

    const dayNumber = date.getDay();

    return (
      dayNumber === 0 ||
      dayNumber === 6
    );
  }, [selectedDate]);

  /*
   * ============================================================
   * FORMAT DATE
   * ============================================================
   */

  const formattedDate = useMemo(() => {
    const date = createLocalDate(
      selectedDate
    );

    return date.toLocaleDateString(
      "id-ID",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );
  }, [selectedDate]);

  /*
   * ============================================================
   * GROUP BERDASARKAN DIVISI
   * ============================================================
   */

  const divisionData = useMemo(() => {
    const groups: Record<
      string,
      Profile[]
    > = {};

    employees.forEach((employee) => {
      const division =
        employee.division?.trim() ||
        "Tanpa Divisi";

      if (!groups[division]) {
        groups[division] = [];
      }

      groups[division].push(employee);
    });

    /*
     * ID user yang sudah absen
     */

    const attendanceIds = new Set(
      attendances.map(
        (attendance) =>
          attendance.profile_id
      )
    );

    /*
     * Buat data divisi
     */

    const result: DivisionData[] =
      Object.entries(groups).map(
        ([
          divisionName,
          divisionEmployees,
        ]) => {
          const present =
            divisionEmployees.filter(
              (employee) =>
                attendanceIds.has(
                  employee.id
                )
            );

          const absent =
            divisionEmployees.filter(
              (employee) =>
                !attendanceIds.has(
                  employee.id
                )
            );

          const total =
            divisionEmployees.length;

          const percentage =
            total > 0
              ? Math.round(
                  (present.length /
                    total) *
                    100
                )
              : 0;

          return {
            name: divisionName,
            employees:
              divisionEmployees,
            present,
            absent,
            total,
            presentCount:
              present.length,
            absentCount:
              absent.length,
            percentage,
          };
        }
      );

    result.sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return result;
  }, [employees, attendances]);

  /*
   * ============================================================
   * STATISTICS
   * ============================================================
   */

  const totalEmployees =
    employees.length;

  const totalPresent =
    divisionData.reduce(
      (total, division) =>
        total +
        division.presentCount,
      0
    );

  const totalAbsent =
    divisionData.reduce(
      (total, division) =>
        total +
        division.absentCount,
      0
    );

  const attendancePercentage =
    totalEmployees > 0
      ? Math.round(
          (totalPresent /
            totalEmployees) *
            100
        )
      : 0;

  /*
   * ============================================================
   * MODAL
   * ============================================================
   */

  const openDivisionModal = (
    division: DivisionData
  ) => {
    setSelectedDivision(division);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);

    setTimeout(() => {
      setSelectedDivision(null);
    }, 200);
  };

  /*
   * ============================================================
   * KEMBALI KE HARI INI
   * ============================================================
   */

  const goToToday = () => {
    setSelectedDate(
      getTodayString()
    );
  };

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8fc]">
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="h-14 w-14 rounded-full border-4 border-slate-200" />

            <div className="absolute inset-0 h-14 w-14 animate-spin rounded-full border-4 border-transparent border-t-indigo-600" />
          </div>

          <div className="text-center">
            <p className="text-sm font-black text-slate-800">
              Memuat Data Absensi
            </p>

            <p className="mt-1 text-xs font-medium text-slate-400">
              Mohon tunggu sebentar...
            </p>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ============================================================
   * MAIN
   * ============================================================
   */

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-900">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-black text-white shadow-lg shadow-indigo-200">
              A
            </div>

            <div>
              <h1 className="text-base font-black tracking-tight text-slate-900 sm:text-lg">
                {companyName}
              </h1>

              <p className="text-xs font-medium text-slate-400">
                Attendance Management
              </p>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
          >
            <span className="transition-transform group-hover:-translate-x-1">
              ←
            </span>

            <span className="hidden sm:inline">
              Dashboard
            </span>
          </Link>
        </div>
      </header>

      {/* ======================================================
          CONTENT
      ====================================================== */}

      <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:py-10">
        {/* ====================================================
            HERO
        ==================================================== */}

        <section className="mb-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-600">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                MONITORING ABSENSI
              </div>

              <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Kehadiran Karyawan
              </h2>

              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
                Pantau kehadiran karyawan
                berdasarkan divisi dan lihat
                siapa yang sudah maupun belum
                melakukan absensi.
              </p>
            </div>

            {/* DATE */}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div>
                <label className="mb-1.5 ml-1 block text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                  Tanggal Monitoring
                </label>

                <input
                  type="date"
                  value={selectedDate}
                  max={todayString}
                  onChange={(event) => {
                    const newDate =
                      event.target.value;

                    /*
                     * Pengaman tambahan.
                     * Walaupun browser somehow
                     * mengirim tanggal future,
                     * tetap tidak boleh digunakan.
                     */

                    if (
                      newDate >
                      getTodayString()
                    ) {
                      setSelectedDate(
                        getTodayString()
                      );

                      return;
                    }

                    setSelectedDate(
                      newDate
                    );
                  }}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <button
                onClick={() =>
                  fetchData(true)
                }
                disabled={refreshing}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-lg transition-all hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg
                  className={`h-4 w-4 ${
                    refreshing
                      ? "animate-spin"
                      : ""
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
            DATE
        ==================================================== */}

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <div className="rounded-xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-slate-200">
            <span className="text-sm font-bold text-slate-700">
              {formattedDate}
            </span>
          </div>

          {selectedDateIsFuture ? (
            <div className="rounded-xl bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-700 ring-1 ring-violet-100">
              ◷ Belum Dimulai
            </div>
          ) : isWeekend ? (
            <div className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700 ring-1 ring-amber-100">
              ☕ Hari Libur
            </div>
          ) : (
            <div className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100">
              ● Hari Kerja
            </div>
          )}
        </div>

        {/* ====================================================
            FUTURE DATE
        ==================================================== */}

        {selectedDateIsFuture ? (
          <section className="mt-10 flex min-h-[520px] items-center justify-center rounded-[2rem] border border-dashed border-violet-200 bg-white shadow-sm">
            <div className="max-w-md px-6 text-center">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-violet-50 text-5xl shadow-inner">
                🗓️
              </div>

              <h3 className="text-2xl font-black tracking-tight text-slate-900">
                Tanggal Belum Dimulai
              </h3>

              <p className="mt-3 text-sm font-medium leading-6 text-slate-400">
                Laporan absensi untuk tanggal{" "}
                <span className="font-black text-slate-600">
                  {formattedDate}
                </span>{" "}
                belum tersedia karena tanggal
                tersebut belum dimulai.
              </p>

              <p className="mt-2 text-xs font-semibold text-slate-300">
                Data absensi hanya dapat dilihat
                untuk hari ini atau tanggal
                sebelumnya.
              </p>

              <div className="mt-7">
                <button
                  onClick={goToToday}
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-lg transition-all hover:bg-indigo-600"
                >
                  Kembali ke Hari Ini
                </button>
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* ==================================================
                ERROR
            ================================================== */}

            {errorMessage && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
                <div className="text-xl">
                  ⚠️
                </div>

                <div>
                  <p className="font-black">
                    Gagal mengambil data
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {errorMessage}
                  </p>
                </div>
              </div>
            )}

            {/* ==================================================
                EMPTY STATE
            ================================================== */}

            {employees.length === 0 ? (
              <section className="mt-10 flex min-h-[520px] items-center justify-center rounded-[2rem] border border-dashed border-slate-300 bg-white shadow-sm">
                <div className="max-w-md px-6 text-center">
                  <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-slate-50 text-5xl shadow-inner">
                    📭
                  </div>

                  <h3 className="text-2xl font-black tracking-tight text-slate-900">
                    Belum Ada Data Karyawan
                  </h3>

                  <p className="mt-3 text-sm font-medium leading-6 text-slate-400">
                    Tidak ada karyawan yang
                    terdaftar pada tanggal{" "}
                    <span className="font-black text-slate-600">
                      {formattedDate}
                    </span>
                    .
                  </p>

                  <p className="mt-2 text-xs font-semibold text-slate-300">
                    Pilih tanggal lain untuk
                    melihat laporan absensi.
                  </p>

                  <div className="mt-7">
                    <button
                      onClick={goToToday}
                      className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-lg transition-all hover:bg-indigo-600"
                    >
                      Kembali ke Hari Ini
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              <>
                {/* ==================================================
                    SUMMARY
                ================================================== */}

                <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {/* TOTAL */}

                  <div className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                    <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-indigo-50 transition-transform group-hover:scale-125" />

                    <div className="relative">
                      <div className="mb-5 flex items-center justify-between">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-xl">
                          👥
                        </div>

                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Total
                        </span>
                      </div>

                      <p className="text-3xl font-black text-slate-950">
                        {totalEmployees}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-400">
                        Karyawan
                      </p>
                    </div>
                  </div>

                  {/* HADIR */}

                  <div className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                    <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-50 transition-transform group-hover:scale-125" />

                    <div className="relative">
                      <div className="mb-5 flex items-center justify-between">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-xl">
                          ✓
                        </div>

                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                          Hadir
                        </span>
                      </div>

                      <p className="text-3xl font-black text-slate-950">
                        {totalPresent}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-400">
                        Sudah Absen
                      </p>
                    </div>
                  </div>

                  {/* BELUM */}

                  <div className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                    <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-rose-50 transition-transform group-hover:scale-125" />

                    <div className="relative">
                      <div className="mb-5 flex items-center justify-between">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-xl">
                          !
                        </div>

                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">
                          Perhatian
                        </span>
                      </div>

                      <p className="text-3xl font-black text-rose-600">
                        {totalAbsent}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-400">
                        Belum Absen
                      </p>
                    </div>
                  </div>

                  {/* PERSENTASE */}

                  <div className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                    <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-violet-50 transition-transform group-hover:scale-125" />

                    <div className="relative">
                      <div className="mb-5 flex items-center justify-between">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-xl">
                          %
                        </div>

                        <span className="text-[10px] font-black uppercase tracking-widest text-violet-500">
                          Performance
                        </span>
                      </div>

                      <p className="text-3xl font-black text-slate-950">
                        {attendancePercentage}%
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-400">
                        Tingkat Kehadiran
                      </p>
                    </div>
                  </div>
                </section>

                {/* ==================================================
                    OVERALL PROGRESS
                ================================================== */}

                <section className="mb-10 overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">
                        Overall Attendance
                      </p>

                      <h3 className="mt-2 text-2xl font-black">
                        Tingkat Kehadiran
                      </h3>

                      <p className="mt-2 text-sm font-medium text-slate-400">
                        {totalPresent} dari{" "}
                        {totalEmployees}{" "}
                        karyawan sudah melakukan
                        absensi.
                      </p>
                    </div>

                    <div className="w-full lg:max-w-md">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400">
                          Progress
                        </span>

                        <span className="text-lg font-black">
                          {attendancePercentage}%
                        </span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-slate-800">
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
                  <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                    <div>
                      <h3 className="text-2xl font-black tracking-tight text-slate-950">
                        Absensi Per Divisi
                      </h3>

                      <p className="mt-1 text-sm font-medium text-slate-400">
                        Klik divisi untuk melihat
                        siapa yang sudah dan belum
                        absen.
                      </p>
                    </div>

                    <div className="text-xs font-bold text-slate-400">
                      {divisionData.length}{" "}
                      Divisi
                    </div>
                  </div>

                  {divisionData.length ===
                  0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                        📭
                      </div>

                      <h4 className="font-black text-slate-700">
                        Belum ada divisi
                      </h4>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                      {divisionData.map(
                        (division) => {
                          const isPerfect =
                            division.absentCount ===
                            0;

                          return (
                            <button
                              key={
                                division.name
                              }
                              onClick={() =>
                                openDivisionModal(
                                  division
                                )
                              }
                              className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-indigo-200 hover:shadow-2xl"
                            >
                              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-indigo-50 opacity-60 transition-transform duration-500 group-hover:scale-150" />

                              <div className="relative">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-xl text-white shadow-lg">
                                      {division.name
                                        .charAt(
                                          0
                                        )
                                        .toUpperCase()}
                                    </div>

                                    <div>
                                      <h4 className="font-black text-slate-900">
                                        {
                                          division.name
                                        }
                                      </h4>

                                      <p className="mt-0.5 text-xs font-semibold text-slate-400">
                                        {
                                          division.total
                                        }{" "}
                                        Karyawan
                                      </p>
                                    </div>
                                  </div>

                                  <div
                                    className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                                      isPerfect
                                        ? "bg-emerald-50 text-emerald-600"
                                        : "bg-rose-50 text-rose-600"
                                    }`}
                                  >
                                    {isPerfect
                                      ? "LENGKAP"
                                      : `${division.absentCount} BELUM`}
                                  </div>
                                </div>

                                <div className="my-6 h-px bg-slate-100" />

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="rounded-2xl bg-emerald-50 p-4">
                                    <p className="text-xs font-bold text-emerald-500">
                                      Sudah
                                      Absen
                                    </p>

                                    <div className="mt-1 flex items-end gap-1">
                                      <span className="text-2xl font-black text-emerald-700">
                                        {
                                          division.presentCount
                                        }
                                      </span>

                                      <span className="mb-1 text-xs font-bold text-emerald-500">
                                        orang
                                      </span>
                                    </div>
                                  </div>

                                  <div className="rounded-2xl bg-rose-50 p-4">
                                    <p className="text-xs font-bold text-rose-500">
                                      Belum
                                      Absen
                                    </p>

                                    <div className="mt-1 flex items-end gap-1">
                                      <span className="text-2xl font-black text-rose-700">
                                        {
                                          division.absentCount
                                        }
                                      </span>

                                      <span className="mb-1 text-xs font-bold text-rose-500">
                                        orang
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-5">
                                  <div className="mb-2 flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-400">
                                      Kehadiran
                                    </span>

                                    <span className="text-xs font-black text-slate-700">
                                      {
                                        division.percentage
                                      }
                                      %
                                    </span>
                                  </div>

                                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
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

                                <div className="mt-6 flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-400">
                                    Klik untuk
                                    detail
                                  </span>

                                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-all group-hover:bg-indigo-600 group-hover:text-white">
                                    →
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        }
                      )}
                    </div>
                  )}
                </section>

                {/* ==================================================
                    PRINT
                ================================================== */}

                <div className="mt-10 flex justify-end print:hidden">
                  <button
                    onClick={() =>
                      window.print()
                    }
                    className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50"
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
          MODAL
      ====================================================== */}

      {showModal &&
        selectedDivision && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeModal();
              }
            }}
          >
            <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
              {/* HEADER */}

              <div className="border-b border-slate-100 bg-white px-6 py-6 sm:px-8">
                <div className="flex items-start justify-between gap-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-xl font-black text-white shadow-lg">
                      {selectedDivision.name
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>
                      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">
                        Detail Divisi
                      </p>

                      <h3 className="text-2xl font-black tracking-tight text-slate-950">
                        {
                          selectedDivision.name
                        }
                      </h3>

                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        {formattedDate}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={
                      closeModal
                    }
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-500 transition-all hover:bg-rose-50 hover:text-rose-600"
                  >
                    ×
                  </button>
                </div>

                {/* SUMMARY */}

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Total
                    </p>

                    <p className="mt-1 text-2xl font-black text-slate-900">
                      {
                        selectedDivision.total
                      }
                    </p>
                  </div>

                  <div className="rounded-2xl bg-emerald-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500">
                      Hadir
                    </p>

                    <p className="mt-1 text-2xl font-black text-emerald-700">
                      {
                        selectedDivision.presentCount
                      }
                    </p>
                  </div>

                  <div className="rounded-2xl bg-rose-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-rose-500">
                      Belum
                    </p>

                    <p className="mt-1 text-2xl font-black text-rose-700">
                      {
                        selectedDivision.absentCount
                      }
                    </p>
                  </div>
                </div>

                {/* PROGRESS */}

                <div className="mt-5">
                  <div className="mb-2 flex justify-between">
                    <span className="text-xs font-bold text-slate-400">
                      Tingkat Kehadiran
                    </span>

                    <span className="text-xs font-black text-slate-800">
                      {
                        selectedDivision.percentage
                      }
                      %
                    </span>
                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all duration-700"
                      style={{
                        width: `${selectedDivision.percentage}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* BODY */}

              <div className="max-h-[55vh] overflow-y-auto bg-[#fafbfc] p-6 sm:p-8">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* SUDAH ABSEN */}

                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                        ✓
                      </div>

                      <div>
                        <h4 className="text-sm font-black text-slate-800">
                          Sudah Absen
                        </h4>

                        <p className="text-[10px] font-semibold text-slate-400">
                          {
                            selectedDivision.presentCount
                          }{" "}
                          orang
                        </p>
                      </div>
                    </div>

                    {selectedDivision
                      .present.length ===
                    0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-center">
                        <p className="text-xs font-bold text-slate-400">
                          Belum ada yang
                          absen.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedDivision.present.map(
                          (
                            employee
                          ) => (
                            <div
                              key={
                                employee.id
                              }
                              className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xs font-black text-emerald-600">
                                {employee.full_name
                                  .charAt(
                                    0
                                  )
                                  .toUpperCase()}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-black text-slate-800">
                                  {
                                    employee.full_name
                                  }
                                </p>

                                <p className="mt-0.5 text-[10px] font-semibold text-emerald-500">
                                  ✓ Sudah
                                  melakukan
                                  absensi
                                </p>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* BELUM ABSEN */}

                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                        !
                      </div>

                      <div>
                        <h4 className="text-sm font-black text-slate-800">
                          Belum Absen
                        </h4>

                        <p className="text-[10px] font-semibold text-slate-400">
                          {
                            selectedDivision.absentCount
                          }{" "}
                          orang
                        </p>
                      </div>
                    </div>

                    {selectedDivision
                      .absent.length ===
                    0 ? (
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-center">
                        <p className="text-xs font-black text-emerald-600">
                          🎉 Semua karyawan
                          sudah absen!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedDivision.absent.map(
                          (
                            employee
                          ) => (
                            <div
                              key={
                                employee.id
                              }
                              className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-white p-3 shadow-sm"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-xs font-black text-rose-600">
                                {employee.full_name
                                  .charAt(
                                    0
                                  )
                                  .toUpperCase()}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-black text-slate-800">
                                  {
                                    employee.full_name
                                  }
                                </p>

                                <p className="mt-0.5 text-[10px] font-semibold text-rose-500">
                                  ! Belum
                                  melakukan
                                  absensi
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

              <div className="flex items-center justify-between border-t border-slate-100 bg-white px-6 py-4 sm:px-8">
                <p className="hidden text-xs font-medium text-slate-400 sm:block">
                  Klik di luar popup atau tombol
                  tutup untuk keluar.
                </p>

                <button
                  onClick={
                    closeModal
                  }
                  className="ml-auto rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-black text-white transition-all hover:bg-indigo-600"
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