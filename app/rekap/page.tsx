"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/* =========================================================
   TYPES
========================================================= */

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
  check_out: string | null;
  reason: string | null;
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

  totalAttendances: number;

  activeDays: number;
  holidayDays: number;

  accountBeforeMonth: boolean;
  accountCreatedInMonth: boolean;
  accountAfterMonth: boolean;

  monthNotStarted: boolean;
  hasAttendance: boolean;
}

/* =========================================================
   CONSTANTS
========================================================= */

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

/* =========================================================
   DATE HELPERS
========================================================= */

function getDateKey(date: string | Date) {
  const value =
    typeof date === "string"
      ? new Date(date)
      : date;

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function getTodayKey() {
  return getDateKey(new Date());
}

function createLocalDate(
  year: number,
  month: number,
  day: number
) {
  return new Date(year, month - 1, day);
}

function formatCreatedDate(date: string) {
  return new Date(date).toLocaleDateString(
    "id-ID",
    {
      timeZone: TIME_ZONE,
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

function getDatesInMonth(
  year: number,
  month: number
) {
  const daysInMonth = new Date(
    year,
    month,
    0
  ).getDate();

  return Array.from(
    { length: daysInMonth },
    (_, index) => {
      const day = index + 1;

      return {
        day,
        date: createLocalDate(
          year,
          month,
          day
        ),
        key: `${year}-${String(month).padStart(
          2,
          "0"
        )}-${String(day).padStart(2, "0")}`,
      };
    }
  );
}

function isWeekend(date: Date) {
  const day = date.getDay();

  return day === 0 || day === 6;
}

function isWeekendKey(dateKey: string) {
  const [year, month, day] = dateKey
    .split("-")
    .map(Number);

  return isWeekend(
    createLocalDate(
      year,
      month,
      day
    )
  );
}

/**
 * Mendapatkan batas bulan berdasarkan
 * timezone Asia/Jakarta lalu dikonversi
 * ke ISO UTC untuk query Supabase.
 */
function getMonthUtcRange(
  year: number,
  month: number
) {
  const start = new Date(
    `${year}-${String(month).padStart(
      2,
      "0"
    )}-01T00:00:00+07:00`
  );

  const nextYear =
    month === 12 ? year + 1 : year;

  const nextMonth =
    month === 12 ? 1 : month + 1;

  const end = new Date(
    `${nextYear}-${String(nextMonth).padStart(
      2,
      "0"
    )}-01T00:00:00+07:00`
  );

  return {
    start,
    end,
  };
}

/* =========================================================
   PAGE
========================================================= */

export default function MonthlyReportPage() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [companyName, setCompanyName] =
    useState("Company Attendance");

  const [selectedMonth, setSelectedMonth] =
    useState(() => {
      return getTodayKey().slice(0, 7);
    });

  const [employees, setEmployees] =
    useState<Employee[]>([]);

  const [attendances, setAttendances] =
    useState<Attendance[]>([]);

  const [holidays, setHolidays] =
    useState<Holiday[]>([]);

  const [errorMessage, setErrorMessage] =
    useState("");

  /* =======================================================
     LOAD DATA
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        /* ================================================
           AUTH
        ================================================ */

        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        /* ================================================
           PROFILE
        ================================================ */

        const {
          data: profile,
          error: profileError,
        } =
          await supabase
            .from("profiles")
            .select(
              `
              id,
              role,
              company_id,
              companies(name)
            `
            )
            .eq("id", user.id)
            .single();

        if (
          profileError ||
          !profile
        ) {
          setErrorMessage(
            "Profile tidak ditemukan."
          );
          setLoading(false);
          return;
        }

        /* ================================================
           EMPLOYEE TIDAK BOLEH MELIHAT REKAP
        ================================================ */

        if (
          profile.role === "employee"
        ) {
          router.push("/dashboard");
          return;
        }

        /* ================================================
           COMPANY
        ================================================ */

        if (profile.companies) {
          const company =
            profile.companies as any;

          setCompanyName(
            company?.name ||
              "Company Attendance"
          );
        }

        /* ================================================
           SELECTED MONTH
        ================================================ */

        const [
          yearString,
          monthString,
        ] = selectedMonth.split("-");

        const year =
          Number(yearString);

        const month =
          Number(monthString);

        const {
          start: startDate,
          end: endDate,
        } = getMonthUtcRange(
          year,
          month
        );

        /* ================================================
           EMPLOYEES
        ================================================ */

        const {
          data: employeeData,
          error: employeeError,
        } =
          await supabase
            .from("profiles")
            .select(
              `
              id,
              full_name,
              created_at,
              division
            `
            )
            .eq(
              "company_id",
              profile.company_id
            )
            .neq("role", "owner")
            .order("created_at", {
              ascending: true,
            });

        if (employeeError) {
          setErrorMessage(
            employeeError.message
          );
          setLoading(false);
          return;
        }

        const employeeList =
          employeeData || [];

        if (cancelled) return;

        setEmployees(employeeList);

        /* ================================================
           ATTENDANCE
        ================================================ */

        if (
          employeeList.length > 0
        ) {
          const employeeIds =
            employeeList.map(
              (employee) =>
                employee.id
            );

          const {
            data: attendanceData,
            error: attendanceError,
          } =
            await supabase
              .from("attendance")
              .select(
                `
                id,
                profile_id,
                status,
                created_at,
                check_in,
                check_out,
                reason
              `
              )
              .in(
                "profile_id",
                employeeIds
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
                ascending: false,
              });

          if (attendanceError) {
            setErrorMessage(
              attendanceError.message
            );
            setLoading(false);
            return;
          }

          if (cancelled) return;

          setAttendances(
            attendanceData || []
          );
        } else {
          setAttendances([]);
        }

        /* ================================================
           HOLIDAYS
        ================================================ */

        const formattedStart =
          `${year}-${String(month).padStart(
            2,
            "0"
          )}-01`;

        const nextYear =
          month === 12
            ? year + 1
            : year;

        const nextMonth =
          month === 12
            ? 1
            : month + 1;

        const formattedEnd =
          `${nextYear}-${String(
            nextMonth
          ).padStart(
            2,
            "0"
          )}-01`;

        const {
          data: holidayData,
          error: holidayError,
        } =
          await supabase
            .from("holidays")
            .select(
              `
              id,
              date,
              description
            `
            )
            .gte(
              "date",
              formattedStart
            )
            .lt(
              "date",
              formattedEnd
            )
            .order("date", {
              ascending: true,
            });

        if (holidayError) {
          console.warn(
            "Gagal mengambil hari libur:",
            holidayError.message
          );

          setHolidays([]);
        } else {
          setHolidays(
            holidayData || []
          );
        }
      } catch (error) {
        console.error(error);

        setErrorMessage(
          "Terjadi kesalahan saat mengambil data."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [selectedMonth, router]);

  /* =======================================================
     MONTH INFORMATION
  ======================================================= */

  const monthInfo = useMemo(() => {
    const [
      yearString,
      monthString,
    ] = selectedMonth.split("-");

    const year =
      Number(yearString);

    const month =
      Number(monthString);

    const todayKey =
      getTodayKey();

    const todayYear =
      Number(
        todayKey.slice(0, 4)
      );

    const todayMonth =
      Number(
        todayKey.slice(5, 7)
      );

    const selectedStartKey =
      `${year}-${String(month).padStart(
        2,
        "0"
      )}-01`;

    const selectedStart =
      createLocalDate(
        year,
        month,
        1
      );

    const nextMonthStart =
      createLocalDate(
        year,
        month + 1,
        1
      );

    const isFuture =
      selectedStartKey >
      todayKey;

    const isCurrentMonth =
      year === todayYear &&
      month === todayMonth;

    const daysInMonth =
      new Date(
        year,
        month,
        0
      ).getDate();

    return {
      year,
      month,
      monthName:
        MONTHS[month - 1],
      isFuture,
      isCurrentMonth,
      daysInMonth,
      selectedStart,
      nextMonthStart,
    };
  }, [selectedMonth]);

  /* =======================================================
     HOLIDAY SET
  ======================================================= */

  const holidayDateSet =
    useMemo(() => {
      return new Set(
        holidays.map(
          (holiday) =>
            String(
              holiday.date
            ).slice(0, 10)
        )
      );
    }, [holidays]);

  /* =======================================================
     MONTH DATES
  ======================================================= */

  const allMonthDates =
    useMemo(() => {
      return getDatesInMonth(
        monthInfo.year,
        monthInfo.month
      );
    }, [
      monthInfo.year,
      monthInfo.month,
    ]);

  /* =======================================================
     ELAPSED DATES
  ======================================================= */

  const elapsedMonthDates =
    useMemo(() => {
      if (monthInfo.isFuture) {
        return [];
      }

      const todayKey =
        getTodayKey();

      return allMonthDates.filter(
        (item) => {
          if (
            monthInfo.isCurrentMonth
          ) {
            return (
              item.key <=
              todayKey
            );
          }

          return true;
        }
      );
    }, [
      allMonthDates,
      monthInfo.isFuture,
      monthInfo.isCurrentMonth,
    ]);

  /* =======================================================
     WORKING DAYS
  ======================================================= */

  const workingDays =
    useMemo(() => {
      return elapsedMonthDates.filter(
        (item) => {
          if (
            isWeekendKey(
              item.key
            )
          ) {
            return false;
          }

          if (
            holidayDateSet.has(
              item.key
            )
          ) {
            return false;
          }

          return true;
        }
      );
    }, [
      elapsedMonthDates,
      holidayDateSet,
    ]);

  const workingDaySet =
    useMemo(() => {
      return new Set(
        workingDays.map(
          (day) => day.key
        )
      );
    }, [workingDays]);

  /* =======================================================
     REPORT DATA
  ======================================================= */

  const reportData =
    useMemo(() => {
      const {
        year,
        month,
        isFuture,
      } = monthInfo;

      const monthStart =
        createLocalDate(
          year,
          month,
          1
        );

      const nextMonth =
        createLocalDate(
          year,
          month + 1,
          1
        );

      const result: EmployeeSummary[] =
        employees.map(
          (employee) => {
            const createdDate =
              new Date(
                employee.created_at
              );

            const createdDateKey =
              getDateKey(
                employee.created_at
              );

            /* ==========================================
               STATUS AKUN
            ========================================== */

            const accountAfterMonth =
              createdDate >=
              nextMonth;

            const accountBeforeMonth =
              createdDate <
              monthStart;

            const accountCreatedInMonth =
              createdDate >=
                monthStart &&
              createdDate <
                nextMonth;

            /* ==========================================
               ATTENDANCE EMPLOYEE
            ========================================== */

            const employeeAttendances =
              attendances.filter(
                (attendance) =>
                  attendance.profile_id ===
                  employee.id
              );

            /* ==========================================
               MAP ATTENDANCE PER TANGGAL
            ========================================== */

            const attendanceByDate =
              new Map<
                string,
                Attendance[]
              >();

            employeeAttendances.forEach(
              (attendance) => {
                const dateKey =
                  getDateKey(
                    attendance.check_in ||
                      attendance.created_at
                  );

                const current =
                  attendanceByDate.get(
                    dateKey
                  ) || [];

                current.push(
                  attendance
                );

                attendanceByDate.set(
                  dateKey,
                  current
                );
              }
            );

            /* ==========================================
               STATUS
            ========================================== */

            let present = 0;
            let late = 0;
            let sick = 0;
            let leave = 0;

            employeeAttendances.forEach(
              (attendance) => {
                const dateKey =
                  getDateKey(
                    attendance.check_in ||
                      attendance.created_at
                  );

                if (
                  !workingDaySet.has(
                    dateKey
                  )
                ) {
                  return;
                }

                if (
                  dateKey <
                  createdDateKey
                ) {
                  return;
                }

                if (
                  attendance.status ===
                  "present"
                ) {
                  present++;
                }

                if (
                  attendance.status ===
                  "late"
                ) {
                  late++;
                }

                if (
                  attendance.status ===
                  "sakit"
                ) {
                  sick++;
                }

                if (
                  attendance.status ===
                  "izin"
                ) {
                  leave++;
                }
              }
            );

            /* ==========================================
               ACTIVE DAYS
            ========================================== */

            let activeDays = 0;

            if (
              !accountAfterMonth &&
              !isFuture
            ) {
              activeDays =
                workingDays.filter(
                  (day) =>
                    day.key >=
                    createdDateKey
                ).length;
            }

            /* ==========================================
               HOLIDAY DAYS
            ========================================== */

            let holidayDays = 0;

            if (
              !accountAfterMonth &&
              !isFuture
            ) {
              holidayDays =
                holidays.filter(
                  (holiday) => {
                    const holidayKey =
                      String(
                        holiday.date
                      ).slice(
                        0,
                        10
                      );

                    return (
                      holidayKey >=
                        createdDateKey &&
                      !isWeekendKey(
                        holidayKey
                      )
                    );
                  }
                ).length;
            }

            /* ==========================================
               TOTAL ATTENDANCE
            ========================================== */

            const totalAttendances =
              present + late;

            /* ==========================================
               ABSENT / ALPA
            ========================================== */

            let absent = 0;

            /**
             * BULAN MASA DEPAN
             *
             * Tidak ada Alpa sama sekali.
             */
            if (!isFuture) {
              workingDays.forEach(
                (day) => {
                  if (
                    day.key <
                    createdDateKey
                  ) {
                    return;
                  }

                  const records =
                    attendanceByDate.get(
                      day.key
                    ) || [];

                  /**
                   * Tidak ada record
                   * = ALPA
                   */
                  if (
                    records.length ===
                    0
                  ) {
                    absent++;
                    return;
                  }

                  /**
                   * SAKIT
                   */
                  const hasSick =
                    records.some(
                      (record) =>
                        record.status ===
                        "sakit"
                    );

                  if (hasSick) {
                    return;
                  }

                  /**
                   * IZIN
                   */
                  const hasLeave =
                    records.some(
                      (record) =>
                        record.status ===
                        "izin"
                    );

                  if (hasLeave) {
                    return;
                  }

                  /**
                   * HADIR / TELAT
                   */
                  const hasPresent =
                    records.some(
                      (record) =>
                        record.status ===
                          "present" ||
                        record.status ===
                          "late"
                    );

                  if (hasPresent) {
                    return;
                  }

                  /**
                   * EXPLICIT ABSENT
                   */
                  const hasExplicitAbsent =
                    records.some(
                      (record) =>
                        record.status ===
                        "absent"
                    );

                  if (
                    hasExplicitAbsent
                  ) {
                    absent++;
                    return;
                  }

                  /**
                   * FALLBACK
                   */
                  absent++;
                }
              );
            }

            return {
              id: employee.id,

              name:
                employee.full_name ||
                "Tanpa Nama",

              division:
                employee.division,

              createdAt:
                employee.created_at,

              present,
              late,
              sick,
              leave,
              absent,

              totalAttendances,

              activeDays,
              holidayDays,

              accountBeforeMonth,
              accountCreatedInMonth,
              accountAfterMonth,

              monthNotStarted:
                isFuture,

              hasAttendance:
                employeeAttendances.length >
                0,
            };
          }
        );

      /* ================================================
         SORTING
      ================================================ */

      return result.sort(
        (a, b) => {
          /**
           * Jika bulan belum dimulai,
           * semua status sama-sama belum
           * bisa dihitung.
           */
          if (
            a.monthNotStarted &&
            b.monthNotStarted
          ) {
            return a.name.localeCompare(
              b.name,
              "id"
            );
          }

          /**
           * USER BELUM ADA
           * diletakkan setelah user yang
           * memang sudah aktif pada bulan.
           */
          if (
            a.accountAfterMonth !==
            b.accountAfterMonth
          ) {
            return a.accountAfterMonth
              ? 1
              : -1;
          }

          /**
           * 1. ALPA TERBANYAK
           */
          if (
            b.absent !==
            a.absent
          ) {
            return (
              b.absent -
              a.absent
            );
          }

          /**
           * 2. TOTAL MASUK TERKECIL
           */
          if (
            b.totalAttendances !==
            a.totalAttendances
          ) {
            return (
              a.totalAttendances -
              b.totalAttendances
            );
          }

          /**
           * 3. NAMA A-Z
           */
          return a.name.localeCompare(
            b.name,
            "id"
          );
        }
      );
    }, [
      employees,
      attendances,
      holidays,
      workingDays,
      workingDaySet,
      monthInfo,
    ]);

  /* =======================================================
     COMPANY STATS
  ======================================================= */

  const companyStats =
    useMemo(() => {
      const activeEmployees =
        reportData.filter(
          (employee) =>
            !employee.accountAfterMonth
        );

      const totalWorkingDays =
        workingDays.length;

      const totalHolidays =
        holidays.filter(
          (holiday) => {
            const key =
              String(
                holiday.date
              ).slice(0, 10);

            return (
              elapsedMonthDates.some(
                (day) =>
                  day.key === key
              ) &&
              !isWeekendKey(key)
            );
          }
        ).length;

      return {
        employees:
          activeEmployees.length,

        attendance:
          activeEmployees.reduce(
            (total, employee) =>
              total +
              employee.totalAttendances,
            0
          ),

        late:
          activeEmployees.reduce(
            (total, employee) =>
              total +
              employee.late,
            0
          ),

        absent:
          activeEmployees.reduce(
            (total, employee) =>
              total +
              employee.absent,
            0
          ),

        sick:
          activeEmployees.reduce(
            (total, employee) =>
              total +
              employee.sick,
            0
          ),

        leave:
          activeEmployees.reduce(
            (total, employee) =>
              total +
              employee.leave,
            0
          ),

        workingDays:
          totalWorkingDays,

        holidays:
          totalHolidays,

        weekends:
          elapsedMonthDates.filter(
            (day) =>
              isWeekendKey(
                day.key
              )
          ).length,
      };
    }, [
      reportData,
      workingDays,
      holidays,
      elapsedMonthDates,
    ]);

  /* =======================================================
     PRINT
  ======================================================= */

  const handlePrint = () => {
    window.print();
  };

  const formattedMonth =
    `${monthInfo.monthName} ${monthInfo.year}`;

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading &&
    employees.length === 0
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-5 h-14 w-14 animate-spin rounded-full border-4 border-white/10 border-t-blue-500 sm:h-16 sm:w-16" />

          <h2 className="text-lg font-black text-white sm:text-xl">
            Menyiapkan Rekap
          </h2>

          <p className="mt-2 text-xs leading-5 text-slate-400 sm:text-sm">
            Sedang mengambil data
            kehadiran...
          </p>
        </div>
      </main>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (errorMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md rounded-[1.75rem] border border-red-500/20 bg-red-500/10 p-6 text-center sm:rounded-[2rem] sm:p-8">
          <div className="mb-4 text-4xl sm:text-5xl">
            ⚠️
          </div>

          <h2 className="text-lg font-black text-white sm:text-xl">
            Terjadi Kesalahan
          </h2>

          <p className="mt-3 text-xs leading-6 text-red-200 sm:text-sm">
            {errorMessage}
          </p>

          <Link
            href="/dashboard"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-900 transition hover:bg-slate-100"
          >
            Kembali
          </Link>
        </div>
      </main>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f7fb] text-slate-900 print:bg-white">
      {/* ==================================================
          BACKGROUND
      ================================================== */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden print:hidden">
        <div className="absolute -left-32 -top-32 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl sm:h-96 sm:w-96" />

        <div className="absolute -right-32 top-40 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl sm:h-96 sm:w-96" />
      </div>

      {/* ==================================================
          HEADER
      ================================================== */}

      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex min-h-[64px] max-w-[1500px] items-center justify-between gap-3 px-3 py-3 sm:min-h-[72px] sm:px-5 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-950 p-1.5 shadow-lg sm:h-11 sm:w-11 sm:rounded-2xl">
              <img
                src="/svara.png"
                alt="SVARA"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="min-w-0">
              <h1 className="max-w-[180px] truncate text-xs font-black text-slate-900 sm:max-w-none sm:text-xl">
                {companyName}
              </h1>

              <p className="truncate text-[8px] font-bold uppercase tracking-[0.15em] text-blue-500 sm:text-xs sm:tracking-[0.2em]">
                Attendance Analytics
              </p>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-600 sm:min-h-11 sm:gap-2 sm:rounded-2xl sm:px-5 sm:text-sm"
          >
            <span className="text-base">
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

      <div className="relative mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-10">
        {/* ==================================================
            HERO
        ================================================== */}

        <section className="mb-5 overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 p-5 text-white shadow-2xl shadow-blue-200/40 sm:mb-7 sm:rounded-[2rem] sm:p-8 lg:p-10 print:hidden">
          <div className="relative">
            <div className="absolute -right-16 -top-24 h-60 w-60 rounded-full bg-blue-400/10 blur-3xl" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-blue-200 sm:mb-4 sm:text-[10px]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 sm:h-2 sm:w-2" />

                  Monthly Report
                </div>

                <h2 className="text-[2rem] font-black leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl">
                  Rekap Kehadiran

                  <span className="mt-1 block text-blue-300">
                    {formattedMonth}
                  </span>
                </h2>

                <p className="mt-3 max-w-2xl text-xs leading-5 text-slate-300 sm:text-sm sm:leading-6 lg:text-base">
                  Rekap kehadiran berdasarkan
                  hari kerja, hari libur,
                  Sabtu-Minggu, hadir, telat,
                  sakit, izin, dan Alpa.
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:flex-col xl:flex-row">
                <div className="w-full">
                  <label className="mb-2 block text-[9px] font-black uppercase tracking-widest text-slate-400 sm:text-[10px]">
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
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/10 px-3 text-sm font-black text-white outline-none backdrop-blur transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 sm:h-12 sm:w-52 sm:px-4"
                  />
                </div>

                <button
                  onClick={handlePrint}
                  className="h-11 rounded-xl bg-white px-5 text-sm font-black text-slate-900 shadow-xl transition hover:-translate-y-0.5 hover:bg-blue-50 active:scale-95 sm:h-12"
                >
                  🖨️ Cetak
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================
            FUTURE MONTH NOTICE
        ================================================== */}

        {monthInfo.isFuture && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-indigo-900 sm:mb-7 sm:gap-4 sm:rounded-3xl sm:p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm sm:h-11 sm:w-11 sm:rounded-2xl sm:text-xl">
              🗓️
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-black sm:text-base">
                Bulan Belum Dimulai
              </h3>

              <p className="mt-1 text-xs font-medium leading-5 text-indigo-700 sm:text-sm sm:leading-6">
                Halaman laporan{" "}
                <strong>
                  {formattedMonth}
                </strong>{" "}
                belum masuk bulan. Data
                kehadiran dan Alpa belum
                dihitung.
              </p>
            </div>
          </div>
        )}

        {/* ==================================================
            WORKING DAY SUMMARY
        ================================================== */}

        <section className="mb-5 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50 p-4 shadow-sm sm:mb-7 sm:rounded-3xl sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-lg shadow-lg shadow-blue-200 sm:h-12 sm:w-12 sm:rounded-2xl sm:text-xl">
                📅
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 sm:text-[10px]">
                  Hari Kerja
                </p>

                <div className="mt-0.5 flex items-end gap-2">
                  <span className="text-3xl font-black text-slate-900 sm:text-4xl">
                    {
                      companyStats.workingDays
                    }
                  </span>

                  <span className="pb-1 text-xs font-bold text-slate-400 sm:text-sm">
                    hari
                  </span>
                </div>

                <p className="mt-1 max-w-xl text-[10px] font-medium leading-4 text-slate-500 sm:text-xs sm:leading-5">
                  Senin–Jumat, tidak termasuk
                  hari libur perusahaan dan
                  tanggal yang belum terjadi.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:w-auto sm:min-w-[230px]">
              <div className="rounded-xl bg-white px-3 py-3 shadow-sm sm:rounded-2xl sm:px-4">
                <p className="text-[8px] font-black uppercase tracking-wider text-slate-400 sm:text-[9px]">
                  Weekend
                </p>

                <p className="mt-1 text-xl font-black text-slate-700 sm:text-2xl">
                  {
                    companyStats.weekends
                  }
                </p>

                <p className="text-[8px] font-bold text-slate-400 sm:text-[9px]">
                  hari
                </p>
              </div>

              <div className="rounded-xl bg-white px-3 py-3 shadow-sm sm:rounded-2xl sm:px-4">
                <p className="text-[8px] font-black uppercase tracking-wider text-purple-400 sm:text-[9px]">
                  Libur Bos
                </p>

                <p className="mt-1 text-xl font-black text-purple-600 sm:text-2xl">
                  {
                    companyStats.holidays
                  }
                </p>

                <p className="text-[8px] font-bold text-slate-400 sm:text-[9px]">
                  hari
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================
            STATS
        ================================================== */}

        <section className="mb-5 grid grid-cols-2 gap-2.5 sm:mb-7 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
          <StatCard
            icon="👥"
            label="Karyawan"
            value={
              companyStats.employees
            }
            badge="Aktif"
            valueClass="text-slate-900"
            badgeClass="bg-slate-100 text-slate-500"
          />

          <StatCard
            icon="📅"
            label="Hari Kerja"
            value={
              companyStats.workingDays
            }
            badge="Kerja"
            valueClass="text-indigo-600"
            badgeClass="bg-indigo-50 text-indigo-600"
          />

          <StatCard
            icon="📊"
            label="Total Masuk"
            value={
              companyStats.attendance
            }
            badge="Hadir"
            valueClass="text-blue-600"
            badgeClass="bg-blue-50 text-blue-600"
          />

          <StatCard
            icon="⏰"
            label="Terlambat"
            value={
              companyStats.late
            }
            badge="Late"
            valueClass="text-yellow-600"
            badgeClass="bg-yellow-50 text-yellow-600"
          />

          <StatCard
            icon="🚨"
            label="Total Alpa"
            value={
              companyStats.absent
            }
            badge="Perhatian"
            valueClass="text-red-600"
            badgeClass="bg-red-50 text-red-600"
          />

          <StatCard
            icon="🏖️"
            label="Hari Libur"
            value={
              companyStats.holidays
            }
            badge="Libur Bos"
            valueClass="text-purple-600"
            badgeClass="bg-purple-50 text-purple-600"
          />
        </section>

        {/* ==================================================
            ALPA INFORMATION
        ================================================== */}

        <section className="mb-5 rounded-2xl border border-red-100 bg-gradient-to-r from-red-50 to-orange-50 p-4 sm:mb-7 sm:rounded-3xl sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm sm:rounded-2xl">
              🚨
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-black text-red-700 sm:text-base">
                Perhitungan Alpa
              </h3>

              <p className="mt-1 text-[11px] font-medium leading-5 text-red-600 sm:text-sm sm:leading-6">
                Alpa dihitung hanya pada
                hari kerja yang sudah
                terjadi. Sabtu, Minggu,
                hari libur perusahaan,
                tanggal sebelum akun dibuat,
                dan bulan yang belum dimulai
                tidak dihitung sebagai Alpa.
              </p>
            </div>
          </div>
        </section>

        {/* ==================================================
            TABLE / EMPLOYEE CARD
        ================================================== */}

        <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/50 sm:rounded-[2rem]">
          {/* HEADER */}

          <div className="border-b border-slate-100 px-4 py-4 sm:px-7 sm:py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-lg font-black text-slate-900 sm:text-xl">
                  Daftar Karyawan
                </h3>

                <p className="mt-1 text-[10px] font-medium leading-4 text-slate-400 sm:text-sm sm:leading-5">
                  Urutan: Alpa terbanyak →
                  Total Masuk paling sedikit
                  → Nama A-Z.
                </p>
              </div>

              <div className="w-fit rounded-xl bg-slate-50 px-3 py-2 text-[10px] font-black text-slate-500 sm:px-4 sm:text-xs">
                {formattedMonth}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-blue-600" />

              <p className="mt-4 text-sm font-bold text-slate-400">
                Menghitung rekap...
              </p>
            </div>
          ) : reportData.length === 0 ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center px-6 text-center sm:min-h-[400px]">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-4xl sm:h-24 sm:w-24 sm:text-5xl">
                👥
              </div>

              <h3 className="text-lg font-black text-slate-800 sm:text-xl">
                Belum Ada Karyawan
              </h3>

              <p className="mt-2 max-w-md text-xs font-medium leading-5 text-slate-400 sm:text-sm sm:leading-6">
                Belum terdapat karyawan di
                perusahaan ini.
              </p>
            </div>
          ) : (
            <>
              {/* =================================================
                  MOBILE + TABLET / IPAD
                  < 1024px
              ================================================= */}

              <div className="space-y-3 p-3 sm:p-4 lg:hidden">
                {reportData.map(
                  (
                    employee,
                    index
                  ) => (
                    <Link
                      href={`/rekap/${employee.id}`}
                      key={employee.id}
                      className="block rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition active:scale-[0.99] hover:border-blue-200 hover:bg-blue-50/40 sm:rounded-3xl sm:p-5"
                    >
                      {/* USER HEADER */}

                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-black text-white shadow-lg shadow-blue-200 sm:h-12 sm:w-12 sm:rounded-2xl">
                          {employee.name
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="shrink-0 text-[8px] font-black text-slate-300 sm:text-[9px]">
                                  #
                                  {String(
                                    index +
                                      1
                                  ).padStart(
                                    2,
                                    "0"
                                  )}
                                </span>

                                <h4 className="truncate text-sm font-black text-slate-900 sm:text-base">
                                  {
                                    employee.name
                                  }
                                </h4>
                              </div>

                              <div className="mt-2">
                                <DivisionBadge
                                  division={
                                    employee.division
                                  }
                                />
                              </div>

                              <p className="mt-1 text-[9px] font-bold text-slate-400 sm:text-[10px]">
                                Dibuat{" "}
                                {formatCreatedDate(
                                  employee.createdAt
                                )}
                              </p>
                            </div>

                            <span className="shrink-0 text-lg text-slate-300 sm:text-xl">
                              →
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* =================================================
                          FUTURE MONTH
                      ================================================= */}

                      {employee.monthNotStarted ? (
                        <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
                              🗓️
                            </div>

                            <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400">
                                Status
                              </p>

                              <p className="mt-1 text-sm font-black text-indigo-700">
                                BULAN BELUM
                                DIMULAI
                              </p>

                              <p className="mt-1 text-[10px] font-medium leading-5 text-indigo-600 sm:text-xs">
                                Halaman laporan
                                belum masuk
                                bulan{" "}
                                {
                                  monthInfo.monthName
                                }.
                                <br />
                                Belum ada
                                perhitungan
                                kehadiran.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : employee.accountAfterMonth ? (
                        /* =================================================
                           USER BELUM ADA
                        ================================================= */

                        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                              👤
                            </div>

                            <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                Status
                              </p>

                              <p className="mt-1 text-sm font-black text-slate-600">
                                USER BELUM ADA
                              </p>

                              <p className="mt-1 text-[10px] font-medium leading-5 text-slate-400 sm:text-xs">
                                Akun baru dibuat
                                pada{" "}
                                {formatCreatedDate(
                                  employee.createdAt
                                )}
                                .
                                <br />
                                Pada{" "}
                                {
                                  monthInfo.monthName
                                }{" "}
                                akun ini belum
                                dibuat.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* =================================================
                              NEW EMPLOYEE
                          ================================================= */}

                          {employee.accountCreatedInMonth && (
                            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-3.5 sm:p-4">
                              <p className="text-[9px] font-black uppercase tracking-widest text-blue-400">
                                Karyawan Baru
                              </p>

                              <p className="mt-1 text-[10px] font-bold leading-5 text-blue-700 sm:text-xs">
                                Akun dibuat{" "}
                                {formatCreatedDate(
                                  employee.createdAt
                                )}
                                .
                                <br />
                                Hari sebelum akun
                                dibuat tidak
                                dihitung.
                              </p>
                            </div>
                          )}

                          {/* =================================================
                              ALPA
                          ================================================= */}

                          <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-[8px] font-black uppercase tracking-widest text-red-400 sm:text-[9px]">
                                  Total Alpa
                                </p>

                                <p className="mt-1 text-3xl font-black text-red-600 sm:text-4xl">
                                  {
                                    employee.absent
                                  }

                                  <span className="ml-1 text-[10px] sm:text-xs">
                                    hari
                                  </span>
                                </p>
                              </div>

                              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-lg shadow-sm sm:h-12 sm:w-12 sm:rounded-2xl sm:text-xl">
                                🚨
                              </div>
                            </div>
                          </div>

                          {/* =================================================
                              TOTAL MASUK / HARI KERJA
                          ================================================= */}

                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <div className="rounded-2xl bg-white p-3 sm:p-4">
                              <p className="text-[8px] font-black uppercase tracking-wider text-slate-400 sm:text-[9px]">
                                Total Masuk
                              </p>

                              <p className="mt-1 text-2xl font-black text-blue-600 sm:text-3xl">
                                {
                                  employee.totalAttendances
                                }

                                <span className="ml-1 text-[9px] sm:text-xs">
                                  hari
                                </span>
                              </p>
                            </div>

                            <div className="rounded-2xl bg-white p-3 sm:p-4">
                              <p className="text-[8px] font-black uppercase tracking-wider text-slate-400 sm:text-[9px]">
                                Hari Kerja
                              </p>

                              <p className="mt-1 text-2xl font-black text-slate-800 sm:text-3xl">
                                {
                                  employee.activeDays
                                }

                                <span className="ml-1 text-[9px] sm:text-xs">
                                  hari
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* =================================================
                              STATUS GRID
                          ================================================= */}

                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <MiniStat
                              label="Hadir"
                              value={
                                employee.present
                              }
                              className="bg-emerald-50 text-emerald-600"
                            />

                            <MiniStat
                              label="Telat"
                              value={
                                employee.late
                              }
                              className="bg-yellow-50 text-yellow-600"
                            />

                            <MiniStat
                              label="Sakit"
                              value={
                                employee.sick
                              }
                              className="bg-orange-50 text-orange-600"
                            />

                            <MiniStat
                              label="Izin"
                              value={
                                employee.leave
                              }
                              className="bg-purple-50 text-purple-600"
                            />
                          </div>
                        </>
                      )}

                      {/* DETAIL */}

                      <div className="mt-3 flex items-center justify-center rounded-xl border border-slate-200 bg-white py-2.5 text-[10px] font-black text-slate-500 sm:text-xs">
                        Tap untuk melihat
                        detail →
                      </div>
                    </Link>
                  )
                )}
              </div>

              {/* =================================================
                  DESKTOP
                  >= 1024px
              ================================================= */}

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1200px] text-left">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="px-5 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                        #
                      </th>

                      <th className="px-5 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                        Karyawan
                      </th>

                      <th className="px-3 py-5 text-center text-[10px] font-black uppercase tracking-[0.15em] text-emerald-500">
                        Hadir
                      </th>

                      <th className="px-3 py-5 text-center text-[10px] font-black uppercase tracking-[0.15em] text-yellow-500">
                        Telat
                      </th>

                      <th className="px-3 py-5 text-center text-[10px] font-black uppercase tracking-[0.15em] text-orange-500">
                        Sakit
                      </th>

                      <th className="px-3 py-5 text-center text-[10px] font-black uppercase tracking-[0.15em] text-purple-500">
                        Izin
                      </th>

                      <th className="px-3 py-5 text-center text-[10px] font-black uppercase tracking-[0.15em] text-red-500">
                        Alpa
                      </th>

                      <th className="px-3 py-5 text-center text-[10px] font-black uppercase tracking-[0.15em] text-indigo-500">
                        Hari Kerja
                      </th>

                      <th className="px-3 py-5 text-center text-[10px] font-black uppercase tracking-[0.15em] text-blue-500">
                        Total Masuk
                      </th>

                      <th className="px-5 py-5 text-center text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                        Detail
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {reportData.map(
                      (
                        employee,
                        index
                      ) => (
                        <tr
                          key={
                            employee.id
                          }
                          className="group transition hover:bg-blue-50/30"
                        >
                          {/* NUMBER */}

                          <td className="px-5 py-5">
                            <span className="text-xs font-black text-slate-300">
                              {String(
                                index +
                                  1
                              ).padStart(
                                2,
                                "0"
                              )}
                            </span>
                          </td>

                          {/* EMPLOYEE */}

                          <td className="px-5 py-5">
                            <Link
                              href={`/rekap/${employee.id}`}
                              className="group/name flex items-center gap-3"
                            >
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-black text-white shadow-lg shadow-blue-100 transition group-hover/name:scale-105">
                                {employee.name
                                  .charAt(
                                    0
                                  )
                                  .toUpperCase()}
                              </div>

                              <div className="min-w-0">
                                <p className="font-black text-slate-900 transition group-hover/name:text-blue-600">
                                  {
                                    employee.name
                                  }
                                </p>

                                <div className="mt-1">
                                  <DivisionBadge
                                    division={
                                      employee.division
                                    }
                                  />
                                </div>

                                <p className="mt-1 text-[10px] font-semibold text-slate-400">
                                  Dibuat{" "}
                                  {formatCreatedDate(
                                    employee.createdAt
                                  )}
                                </p>
                              </div>
                            </Link>
                          </td>

                          {/* HADIR */}

                          <td className="px-3 py-5 text-center">
                            {employee.monthNotStarted ||
                            employee.accountAfterMonth ? (
                              <StatusBadge>
                                —
                              </StatusBadge>
                            ) : (
                              <NumberBadge
                                value={
                                  employee.present
                                }
                                className="border-emerald-100 bg-emerald-50 text-emerald-600"
                              />
                            )}
                          </td>

                          {/* TELAT */}

                          <td className="px-3 py-5 text-center">
                            {employee.monthNotStarted ||
                            employee.accountAfterMonth ? (
                              <StatusBadge>
                                —
                              </StatusBadge>
                            ) : (
                              <NumberBadge
                                value={
                                  employee.late
                                }
                                className="border-yellow-100 bg-yellow-50 text-yellow-600"
                              />
                            )}
                          </td>

                          {/* SAKIT */}

                          <td className="px-3 py-5 text-center">
                            {employee.monthNotStarted ||
                            employee.accountAfterMonth ? (
                              <StatusBadge>
                                —
                              </StatusBadge>
                            ) : (
                              <NumberBadge
                                value={
                                  employee.sick
                                }
                                className="border-orange-100 bg-orange-50 text-orange-600"
                              />
                            )}
                          </td>

                          {/* IZIN */}

                          <td className="px-3 py-5 text-center">
                            {employee.monthNotStarted ||
                            employee.accountAfterMonth ? (
                              <StatusBadge>
                                —
                              </StatusBadge>
                            ) : (
                              <NumberBadge
                                value={
                                  employee.leave
                                }
                                className="border-purple-100 bg-purple-50 text-purple-600"
                              />
                            )}
                          </td>

                          {/* ALPA */}

                          <td className="px-3 py-5 text-center">
                            {employee.monthNotStarted ? (
                              <StatusBadge>
                                BULAN BELUM
                                DIMULAI
                              </StatusBadge>
                            ) : employee.accountAfterMonth ? (
                              <StatusBadge>
                                USER BELUM ADA
                              </StatusBadge>
                            ) : (
                              <div
                                className={`inline-flex min-w-[68px] flex-col items-center rounded-2xl border px-3 py-2.5 ${
                                  employee.absent >
                                  0
                                    ? "border-red-100 bg-red-50"
                                    : "border-emerald-100 bg-emerald-50"
                                }`}
                              >
                                <span
                                  className={`text-xl font-black ${
                                    employee.absent >
                                    0
                                      ? "text-red-600"
                                      : "text-emerald-600"
                                  }`}
                                >
                                  {
                                    employee.absent
                                  }
                                </span>

                                <span
                                  className={`text-[9px] font-black uppercase tracking-wider ${
                                    employee.absent >
                                    0
                                      ? "text-red-400"
                                      : "text-emerald-400"
                                  }`}
                                >
                                  {employee.absent ===
                                  0
                                    ? "Aman"
                                    : "hari"}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* HARI KERJA */}

                          <td className="px-3 py-5 text-center">
                            {employee.monthNotStarted ? (
                              <StatusBadge>
                                BULAN BELUM
                                DIMULAI
                              </StatusBadge>
                            ) : employee.accountAfterMonth ? (
                              <StatusBadge>
                                USER BELUM ADA
                              </StatusBadge>
                            ) : (
                              <div className="inline-flex min-w-[65px] flex-col items-center rounded-2xl bg-indigo-50 px-3 py-2.5">
                                <span className="text-xl font-black text-indigo-600">
                                  {
                                    employee.activeDays
                                  }
                                </span>

                                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400">
                                  hari
                                </span>
                              </div>
                            )}
                          </td>

                          {/* TOTAL MASUK */}

                          <td className="px-3 py-5 text-center">
                            {employee.monthNotStarted ? (
                              <StatusBadge>
                                BULAN BELUM
                                DIMULAI
                              </StatusBadge>
                            ) : employee.accountAfterMonth ? (
                              <StatusBadge>
                                USER BELUM ADA
                              </StatusBadge>
                            ) : (
                              <div className="inline-flex min-w-[65px] flex-col items-center rounded-2xl bg-blue-50 px-3 py-2.5">
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

                          <td className="px-5 py-5 text-center">
                            <Link
                              href={`/rekap/${employee.id}`}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                            >
                              Detail
                              <span>
                                →
                              </span>
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

        {/* ==================================================
            LEGEND
        ================================================== */}

        <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[9px] font-bold text-slate-400 print:hidden sm:mt-5 sm:gap-2">
          <span className="mr-1 font-black uppercase tracking-widest">
            Keterangan:
          </span>

          <span className="rounded-full bg-red-50 px-2.5 py-1.5 text-red-600">
            Alpa = Tidak masuk
          </span>

          <span className="rounded-full bg-blue-50 px-2.5 py-1.5 text-blue-600">
            Total Masuk = Hadir + Telat
          </span>

          <span className="rounded-full bg-indigo-50 px-2.5 py-1.5 text-indigo-600">
            Hari Kerja = Senin–Jumat
          </span>

          <span className="rounded-full bg-purple-50 px-2.5 py-1.5 text-purple-600">
            Libur Bos = Tidak dihitung
          </span>

          <span className="rounded-full bg-slate-100 px-2.5 py-1.5">
            Sabtu & Minggu = Libur
          </span>

          <span className="rounded-full bg-indigo-50 px-2.5 py-1.5 text-indigo-600">
            Urutan = Alpa terbanyak
          </span>
        </div>
      </div>

      {/* ==================================================
          PRINT HEADER
      ================================================== */}

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
                Laporan Rekapitulasi
                Kehadiran
              </p>

              <p className="text-xs">
                Periode:{" "}
                {formattedMonth}
              </p>

              <p className="mt-1 text-xs">
                Total Hari Kerja:{" "}
                {
                  companyStats.workingDays
                }
              </p>

              <p className="text-xs">
                Total Alpa:{" "}
                {companyStats.absent}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon,
  label,
  value,
  badge,
  valueClass,
  badgeClass,
}: {
  icon: string;
  label: string;
  value: number;
  badge: string;
  valueClass: string;
  badgeClass: string;
}) {
  return (
    <div className="group min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:rounded-3xl sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4">
        <span className="text-xl sm:text-2xl">
          {icon}
        </span>

        <span
          className={`truncate rounded-full px-2 py-1 text-[7px] font-black uppercase tracking-wider sm:px-2.5 sm:py-1.5 sm:text-[9px] ${badgeClass}`}
        >
          {badge}
        </span>
      </div>

      <p className="truncate text-[8px] font-black uppercase tracking-widest text-slate-400 sm:text-[10px]">
        {label}
      </p>

      <p
        className={`mt-1 text-2xl font-black sm:text-3xl ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   DIVISION BADGE
========================================================= */

function DivisionBadge({
  division,
}: {
  division: string | null;
}) {
  return (
    <span className="inline-flex max-w-full items-center rounded-lg bg-indigo-50 px-2 py-1 text-[8px] font-black uppercase tracking-wide text-indigo-600 sm:px-2.5 sm:text-[9px]">
      <span className="mr-1">
        🏷️
      </span>

      <span className="truncate">
        {division ||
          "Belum ada divisi"}
      </span>
    </span>
  );
}

/* =========================================================
   NUMBER BADGE
========================================================= */

function NumberBadge({
  value,
  className,
}: {
  value: number;
  className: string;
}) {
  return (
    <span
      className={`inline-flex min-w-[42px] items-center justify-center rounded-xl border px-2.5 py-2 text-sm font-black ${className}`}
    >
      {value}
    </span>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex max-w-[120px] items-center justify-center rounded-xl bg-slate-100 px-2.5 py-2 text-center text-[8px] font-black uppercase leading-4 tracking-wide text-slate-500">
      {children}
    </span>
  );
}

/* =========================================================
   MINI STAT
========================================================= */

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
      className={`rounded-xl p-2.5 text-center sm:rounded-2xl sm:p-3 ${className}`}
    >
      <p className="text-[7px] font-black uppercase tracking-wider opacity-70 sm:text-[8px]">
        {label}
      </p>

      <p className="mt-0.5 text-sm font-black sm:text-base">
        {value}
      </p>
    </div>
  );
}