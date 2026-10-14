"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bricolage_Grotesque, Figtree } from "next/font/google";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";

import { supabase } from "@/lib/supabase";

// =========================================================
// FONT & TOKEN DESAIN
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

const card =
  "rounded-2xl border border-slate-200/70 bg-white p-6 sm:p-7";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0E1A3A] focus:outline-none focus:ring-2 focus:ring-[#0E1A3A]/15";

const STATUS = {
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
  absent: {
    label: "Alpa",
    color: "#F43F5E",
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
  },
} as const;

type StatusKey = keyof typeof STATUS;

const SERIES: StatusKey[] = ["present", "late", "sakit", "izin"];

// =========================================================
// HELPER
// =========================================================

async function fetchActiveHolidays() {
  const todayStr = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("holidays")
    .select("*")
    .eq("is_cancelled", false)
    .gte("date", todayStr)
    .order("date", { ascending: true })
    .limit(10);

  if (error) {
    console.error("Holiday List Error:", error);
  }

  return data || [];
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

function WeekTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;

  const row = payload[0].payload;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-slate-800">
        {row.full}
      </p>

      {SERIES.map((key) => (
        <div
          key={key}
          className="flex items-center justify-between gap-6 py-0.5"
        >
          <span className="flex items-center gap-2 text-slate-500">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: STATUS[key].color }}
            />
            {STATUS[key].label}
          </span>

          <span className="font-semibold text-slate-800">
            {row[key]}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function OwnerDashboardPage() {
  const router = useRouter();

  // =========================================================
  // STATE
  // =========================================================

  const [loading, setLoading] = useState(true);

  const [userName, setUserName] = useState("");
  const [companyName, setCompanyName] = useState("Company Attendance");
  const [userId, setUserId] = useState("");
  const [companyId, setCompanyId] = useState("");

  const [employeeCount, setEmployeeCount] = useState(0);
  const [presentCount, setPresentCount] = useState(0);
  const [lateCount, setLateCount] = useState(0);
  const [sickCount, setSickCount] = useState(0);
  const [leaveCount, setLeaveCount] = useState(0);

  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [missingEmployees, setMissingEmployees] = useState<any[]>([]);
  const [weekly, setWeekly] = useState<any[]>([]);

  const [inputHolidayDate, setInputHolidayDate] = useState("");
  const [inputHolidayDesc, setInputHolidayDesc] = useState("");
  const [isSettingHoliday, setIsSettingHoliday] = useState(false);
  const [holidays, setHolidays] = useState<any[]>([]);

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancellingHoliday, setIsCancellingHoliday] = useState(false);

  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // =========================================================
  // TOAST OTOMATIS HILANG
  // =========================================================

  useEffect(() => {
    if (!notice) return;

    const timer = setTimeout(() => setNotice(null), 4000);

    return () => clearTimeout(timer);
  }, [notice]);

  // =========================================================
  // LOAD DASHBOARD
  // =========================================================

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        // ---- cek login
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        setUserId(user.id);

        // ---- profile owner
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*, companies(name)")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Profile Error:", profileError);
        }

        if (!profile) {
          alert("Profile pengguna tidak ditemukan.");
          router.push("/login");
          return;
        }

        setUserName(
          profile.full_name || user.email?.split("@")[0] || "Owner"
        );

        setCompanyId(profile.company_id || "");

        if (profile.companies) {
          const companyData = profile.companies as any;
          setCompanyName(companyData.name || "Company Attendance");
        }

        // ---- cek role
        if (profile.role !== "owner") {
          router.push(
            profile.role === "admin" ? "/admin/dashboard" : "/dashboard"
          );
          return;
        }

        // ---- owner harus punya company
        if (!profile.company_id) {
          setLoading(false);
          return;
        }

        const todayStr = new Date().toISOString().split("T")[0];

        // ---- hari libur aktif
        setHolidays(await fetchActiveHolidays());

        // ---- karyawan (owner tidak dihitung)
        const { data: companyProfiles, error: companyProfilesError } =
          await supabase
            .from("profiles")
            .select("id, full_name, role, email")
            .eq("company_id", profile.company_id)
            .neq("role", "owner");

        if (companyProfilesError) {
          console.error("Company Profiles Error:", companyProfilesError);
          setLoading(false);
          return;
        }

        const profileIds = companyProfiles?.map((item) => item.id) || [];

        setEmployeeCount(profileIds.length);

        let pCount = 0;
        let lCount = 0;
        let sCount = 0;
        let iCount = 0;

        let missing = companyProfiles || [];

        if (profileIds.length > 0) {
          // ---- absensi hari ini
          const { data: todayAttendance, error: todayAttendanceError } =
            await supabase
              .from("attendance")
              .select("profile_id, status")
              .in("profile_id", profileIds)
              .gte("created_at", `${todayStr}T00:00:00Z`)
              .lte("created_at", `${todayStr}T23:59:59Z`);

          if (todayAttendanceError) {
            console.error("Today Attendance Error:", todayAttendanceError);
          }

          todayAttendance?.forEach((attendance) => {
            if (attendance.status === "present") pCount++;
            if (attendance.status === "late") lCount++;
            if (attendance.status === "sakit") sCount++;
            if (attendance.status === "izin") iCount++;
          });

          const attendedProfileIds =
            todayAttendance?.map((attendance) => attendance.profile_id) ||
            [];

          missing = (companyProfiles || []).filter(
            (employee) => !attendedProfileIds.includes(employee.id)
          );

          // ---- riwayat terbaru
          const { data: attendanceData, error: attendanceDataError } =
            await supabase
              .from("attendance")
              .select(
                `
                id,
                profile_id,
                status,
                check_in,
                photo_check_in,
                created_at,
                latitude,
                longitude,
                latitude_out,
                longitude_out
              `
              )
              .in("profile_id", profileIds)
              .order("created_at", { ascending: false })
              .limit(5);

          if (attendanceDataError) {
            console.error("Attendance Data Error:", attendanceDataError);
          }

          setRecentAttendance(
            attendanceData?.map((attendance) => ({
              ...attendance,
              profiles: {
                full_name:
                  companyProfiles?.find(
                    (employee) => employee.id === attendance.profile_id
                  )?.full_name || "Unknown",
              },
            })) || []
          );

          // ---- tren 7 hari terakhir (pakai acuan tanggal yang sama dgn statistik hari ini)
          const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setUTCDate(d.getUTCDate() - (6 - i));
            return d.toISOString().split("T")[0];
          });

          const { data: weekData, error: weekError } = await supabase
            .from("attendance")
            .select("status, created_at")
            .in("profile_id", profileIds)
            .gte("created_at", `${days[0]}T00:00:00Z`);

          if (weekError) {
            console.error("Weekly Attendance Error:", weekError);
          }

          const rows: any[] = days.map((day) => {
            const date = new Date(`${day}T00:00:00Z`);

            return {
              day,
              present: 0,
              late: 0,
              sakit: 0,
              izin: 0,
              label: date.toLocaleDateString("id-ID", {
                weekday: "short",
                timeZone: "UTC",
              }),
              full: date.toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                timeZone: "UTC",
              }),
            };
          });

          weekData?.forEach((attendance) => {
            const day = String(attendance.created_at).split("T")[0];
            const row = rows.find((r) => r.day === day);

            if (row && SERIES.includes(attendance.status as StatusKey)) {
              row[attendance.status] += 1;
            }
          });

          setWeekly(rows);
        }

        setPresentCount(pCount);
        setLateCount(lCount);
        setSickCount(sCount);
        setLeaveCount(iCount);
        setMissingEmployees(missing);
      } catch (error) {
        console.error("Owner Dashboard Error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [router]);

  // =========================================================
  // AKSI
  // =========================================================

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleSetHoliday = async () => {
    if (!inputHolidayDate || !inputHolidayDesc.trim()) {
      setNotice({
        type: "error",
        text: "Tanggal dan keterangan libur harus diisi.",
      });
      return;
    }

    setIsSettingHoliday(true);

    try {
      const { error } = await supabase.from("holidays").insert({
        date: inputHolidayDate,
        description: inputHolidayDesc.trim(),
      });

      if (error) throw error;

      setInputHolidayDate("");
      setInputHolidayDesc("");
      setHolidays(await fetchActiveHolidays());

      setNotice({
        type: "success",
        text: "Hari libur berhasil ditambahkan.",
      });
    } catch (error: any) {
      console.error(error);
      setNotice({
        type: "error",
        text: `Gagal menyimpan: ${error.message}`,
      });
    } finally {
      setIsSettingHoliday(false);
    }
  };

  const openCancelForm = (holidayId: string) => {
    setCancellingId(holidayId);
    setCancelReason("");
  };

  const closeCancelForm = () => {
    setCancellingId(null);
    setCancelReason("");
  };

  // Alasan wajib diisi. Setelah dibatalkan, tanggal tsb tidak lagi
  // dianggap libur sehingga karyawan & admin bisa absen kembali.
  const handleCancelHoliday = async (holidayId: string) => {
    if (!cancelReason.trim()) {
      setNotice({
        type: "error",
        text: "Alasan pembatalan wajib diisi.",
      });
      return;
    }

    setIsCancellingHoliday(true);

    try {
      const { error } = await supabase
        .from("holidays")
        .update({
          is_cancelled: true,
          cancel_reason: cancelReason.trim(),
          cancelled_at: new Date().toISOString(),
          cancelled_by: userId,
        })
        .eq("id", holidayId);

      if (error) throw error;

      closeCancelForm();
      setHolidays(await fetchActiveHolidays());

      setNotice({
        type: "success",
        text: "Hari libur dibatalkan. Karyawan & admin bisa absen kembali di tanggal itu.",
      });
    } catch (error: any) {
      console.error(error);
      setNotice({
        type: "error",
        text: `Gagal membatalkan: ${error.message}`,
      });
    } finally {
      setIsCancellingHoliday(false);
    }
  };

  const formatHolidayDate = (dateStr: string) => {
    try {
      return new Date(`${dateStr}T00:00:00`).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // =========================================================
  // LOADING & TANPA COMPANY
  // =========================================================

  if (loading) {
    return (
      <div
        className={`${BASE} flex min-h-screen items-center justify-center bg-[#F2F4F9]`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-slate-200 border-t-[#0E1A3A]" />
          <p className="text-sm font-medium text-slate-500">
            Memuat dasbor...
          </p>
        </div>
      </div>
    );
  }

  if (!companyId) {
    return (
      <main
        className={`${BASE} flex min-h-screen items-center justify-center bg-[#F2F4F9] px-4`}
      >
        <div className={`${card} w-full max-w-md text-center`}>
          <h2 className={`${D} text-xl font-semibold text-slate-900`}>
            Perusahaan belum terhubung
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Akun owner kamu belum terhubung ke perusahaan mana pun.
            Hubungi tim support untuk menghubungkannya.
          </p>

          <button
            onClick={handleLogout}
            className="mt-6 rounded-xl bg-rose-50 px-6 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
          >
            Logout
          </button>
        </div>
      </main>
    );
  }

  // =========================================================
  // DATA TURUNAN
  // =========================================================

  const hadir = presentCount + lateCount;
  const sudahAbsen = Math.max(employeeCount - missingEmployees.length, 0);
  const totalAttendanceData = hadir + sickCount + leaveCount;

  const attendanceRate =
    employeeCount > 0 ? Math.round((hadir / employeeCount) * 100) : 0;

  const donutData = [
    { name: "Tepat waktu", value: presentCount, color: STATUS.present.color },
    { name: "Terlambat", value: lateCount, color: STATUS.late.color },
    { name: "Sakit", value: sickCount, color: STATUS.sakit.color },
    { name: "Izin", value: leaveCount, color: STATUS.izin.color },
    {
      name: "Belum absen",
      value: missingEmployees.length,
      color: STATUS.absent.color,
    },
  ];

  const donutTotal = donutData.reduce((sum, item) => sum + item.value, 0);

  const donutRender =
    donutTotal > 0
      ? donutData
      : [{ name: "Kosong", value: 1, color: "#E8ECF3" }];

  const hasWeeklyData = weekly.some(
    (d) => d.present + d.late + d.sakit + d.izin > 0
  );

  const hour = new Date().getHours();
  const greeting =
    hour < 11
      ? "Selamat pagi"
      : hour < 15
      ? "Selamat siang"
      : hour < 18
      ? "Selamat sore"
      : "Selamat malam";

  const todayLabel = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const firstName = userName.split(" ")[0];

  const summary =
    employeeCount === 0
      ? "Belum ada karyawan yang terdaftar di perusahaan ini."
      : missingEmployees.length === 0
      ? `Semua ${employeeCount} karyawan sudah absen hari ini.`
      : `${sudahAbsen} dari ${employeeCount} karyawan sudah absen. ${missingEmployees.length} lainnya belum.`;

  const stripTotal = Math.max(employeeCount, donutTotal, 1);

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className={`${BASE} min-h-screen bg-[#F2F4F9] pb-16 text-slate-800`}>
      {/* ================= TOAST ================= */}

      {notice && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg ${
            notice.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* ================= HEADER ================= */}

      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-8">
          <div className="flex items-center gap-3">
            <div
              className={`${D} flex h-10 w-10 items-center justify-center rounded-xl bg-[#0E1A3A] text-lg font-bold text-white`}
            >
              {companyName.charAt(0).toUpperCase()}
            </div>

            <div>
              <h1
                className={`${D} text-lg font-semibold leading-tight text-slate-900`}
              >
                {companyName}
              </h1>
              <p className="text-xs text-slate-500">Dasbor owner</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2.5 sm:flex">
              <span className="text-sm font-semibold capitalize text-slate-700">
                {userName}
              </span>
              <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-200">
                Owner
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-8 sm:pt-8">
        {/* ================= HERO ================= */}

        <section className="rounded-[28px] bg-[#0E1A3A] p-6 text-white sm:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm text-slate-300">{todayLabel}</p>

              <h2
                className={`${D} mt-2 text-3xl font-semibold capitalize leading-tight sm:text-5xl`}
              >
                {greeting}, {firstName}.
              </h2>

              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-300">
                {summary}
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/attendance"
                  className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#0E1A3A] transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  Approve absensi
                </Link>

                <Link
                  href="/employees"
                  className="rounded-xl border border-white/25 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  Direktori karyawan
                </Link>

                <Link
                  href="/rekap"
                  className="rounded-xl border border-white/25 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  Rekap bulanan
                </Link>
              </div>
            </div>

            {/* GAUGE KEHADIRAN */}

            <div className="relative mx-auto h-52 w-52 shrink-0 sm:h-56 sm:w-56">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  data={[{ name: "Hadir", value: attendanceRate }]}
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
                  {attendanceRate}
                  <span className="text-2xl text-slate-400">%</span>
                </span>
                <span className="mt-1 text-xs text-slate-300">
                  hadir hari ini
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ================= RINGKASAN ANGKA ================= */}

        <section className={`${card} mt-6`}>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            {donutData.map(
              (seg) =>
                seg.value > 0 && (
                  <div
                    key={seg.name}
                    title={`${seg.name}: ${seg.value}`}
                    style={{
                      width: `${(seg.value / stripTotal) * 100}%`,
                      backgroundColor: seg.color,
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
                {employeeCount}
              </dd>
            </div>

            {donutData.map((item) => (
              <div key={item.name} className="lg:px-5">
                <dt className="flex items-center gap-2 text-sm text-slate-500">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.name}
                </dt>
                <dd
                  className={`${D} mt-1 text-4xl font-semibold text-slate-900`}
                >
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ================= GRAFIK ================= */}

        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          {/* TREN 7 HARI */}

          <section className={`${card} lg:col-span-3`}>
            <h3 className={`${D} text-xl font-semibold text-slate-900`}>
              Kehadiran 7 hari terakhir
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Jumlah karyawan per status, termasuk hari ini.
            </p>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
              {SERIES.map((key) => (
                <span
                  key={key}
                  className="flex items-center gap-2 text-xs font-medium text-slate-600"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: STATUS[key].color }}
                  />
                  {STATUS[key].label}
                </span>
              ))}
            </div>

            {hasWeeklyData ? (
              <div className="mt-4 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={weekly}
                    margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      vertical={false}
                      stroke="#EEF1F6"
                      strokeDasharray="4 4"
                    />
                    <XAxis
                      dataKey="label"
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
                      content={<WeekTooltip />}
                      cursor={{ fill: "rgba(14,26,58,0.05)" }}
                    />
                    {SERIES.map((key, i) => (
                      <Bar
                        key={key}
                        dataKey={key}
                        stackId="week"
                        fill={STATUS[key].color}
                        barSize={30}
                        radius={
                          (i === SERIES.length - 1
                            ? [8, 8, 0, 0]
                            : 0) as any
                        }
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="mt-4 flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                Belum ada data absensi dalam 7 hari terakhir.
              </div>
            )}
          </section>

          {/* DONUT */}

          <section className={`${card} lg:col-span-2`}>
            <h3 className={`${D} text-xl font-semibold text-slate-900`}>
              Status hari ini
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Proporsi seluruh karyawan berdasarkan status.
            </p>

            <div className="relative mx-auto mt-4 h-44 w-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutRender}
                    innerRadius={56}
                    outerRadius={80}
                    paddingAngle={donutTotal > 0 ? 4 : 0}
                    cornerRadius={6}
                    dataKey="value"
                    stroke="none"
                  >
                    {donutRender.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>

                  {donutTotal > 0 && (
                    <Tooltip
                      formatter={(value) => [`${value} karyawan`, "Jumlah"]}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #E2E8F0",
                        fontSize: "12px",
                      }}
                    />
                  )}
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className={`${D} text-3xl font-semibold text-slate-900`}
                >
                  {totalAttendanceData}
                </span>
                <span className="text-xs text-slate-500">data masuk</span>
              </div>
            </div>

            <ul className="mt-5 space-y-2.5">
              {donutData.map((item) => {
                const pct =
                  employeeCount > 0
                    ? Math.round((item.value / employeeCount) * 100)
                    : 0;

                return (
                  <li
                    key={item.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="flex items-center gap-2.5 text-slate-600">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.name}
                    </span>

                    <span className="font-semibold text-slate-900">
                      {item.value}
                      <span className="ml-1.5 text-xs font-medium text-slate-400">
                        {pct}%
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* ================= KONTEN BAWAH ================= */}

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
          {/* RIWAYAT TERBARU */}

          <section className={`${card} lg:col-span-2`}>
            <div className="mb-5 flex items-center justify-between gap-4">
              <h3 className={`${D} text-xl font-semibold text-slate-900`}>
                Riwayat masuk terbaru
              </h3>

              <Link
                href="/attendance"
                className="rounded-full bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Lihat log lengkap
              </Link>
            </div>

            {recentAttendance.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Belum ada data absensi.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentAttendance.map((item) => {
                  const timeStr = item.check_in
                    ? new Date(item.check_in).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "--:--";

                  const dateStr = item.created_at
                    ? new Date(item.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })
                    : "";

                  const st = STATUS[item.status as StatusKey];
                  const name = item.profiles?.full_name || "Unknown";

                  return (
                    <li
                      key={item.id}
                      className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-4">
                        {item.photo_check_in ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.photo_check_in}
                            alt={`Foto absen ${name}`}
                            className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 object-cover"
                          />
                        ) : (
                          <div
                            className={`${D} flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg font-semibold text-slate-400`}
                          >
                            {name.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold text-slate-900">
                            {name}
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-slate-500">
                              {item.status === "sakit" ||
                              item.status === "izin"
                                ? `Laporan ${timeStr}`
                                : `Masuk ${timeStr}`}
                              {dateStr && ` — ${dateStr}`}
                            </span>

                            {item.latitude && item.longitude && (
                              <a
                                href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-600 transition hover:bg-sky-100"
                              >
                                <PinIcon />
                                Lokasi masuk
                              </a>
                            )}

                            {item.latitude_out && item.longitude_out && (
                              <a
                                href={`https://www.google.com/maps?q=${item.latitude_out},${item.longitude_out}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-600 transition hover:bg-orange-100"
                              >
                                <PinIcon />
                                Lokasi pulang
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`self-start rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset sm:self-auto ${
                          st?.badge ??
                          "bg-slate-50 text-slate-600 ring-slate-200"
                        }`}
                      >
                        {st?.label ?? item.status}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* KOLOM KANAN */}

          <div className="flex flex-col gap-6">
            {/* BELUM ABSEN */}

            <section className={card}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3
                    className={`${D} text-xl font-semibold text-slate-900`}
                  >
                    Belum absen
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {missingEmployees.length} karyawan perlu diingatkan.
                  </p>
                </div>

                <Link
                  href="/rekap-tidak-hadir"
                  className="shrink-0 rounded-full bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                >
                  Rekap alpa
                </Link>
              </div>

              <div className="mt-5 max-h-80 space-y-2 overflow-y-auto pr-1">
                {missingEmployees.length === 0 ? (
                  <div className="flex flex-col items-center rounded-xl bg-emerald-50 p-6 text-center text-emerald-700">
                    <CheckIcon />
                    <p className="mt-2 text-sm font-semibold">
                      Semua karyawan sudah absen
                    </p>
                  </div>
                ) : (
                  missingEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-600">
                        {employee.full_name?.charAt(0).toUpperCase() || "?"}
                      </div>

                      <span className="truncate text-sm font-medium text-slate-700">
                        {employee.full_name}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* HARI LIBUR */}

            <section className={card}>
              <h3 className={`${D} text-xl font-semibold text-slate-900`}>
                Atur hari libur
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Form absensi karyawan terkunci di tanggal libur.
              </p>

              <div className="mt-5 space-y-3">
                <input
                  type="date"
                  value={inputHolidayDate}
                  onChange={(e) => setInputHolidayDate(e.target.value)}
                  aria-label="Tanggal libur"
                  className={inputCls}
                />

                <input
                  type="text"
                  placeholder="Keterangan, mis. Libur Idul Fitri"
                  value={inputHolidayDesc}
                  onChange={(e) => setInputHolidayDesc(e.target.value)}
                  aria-label="Keterangan libur"
                  className={inputCls}
                />

                <button
                  onClick={handleSetHoliday}
                  disabled={isSettingHoliday}
                  className="w-full rounded-xl bg-[#0E1A3A] py-3 text-sm font-semibold text-white transition hover:bg-[#1a2a5a] disabled:opacity-50"
                >
                  {isSettingHoliday ? "Menyimpan..." : "Simpan hari libur"}
                </button>
              </div>

              {holidays.length > 0 && (
                <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">
                  <p className="text-sm font-semibold text-slate-700">
                    Hari libur aktif
                  </p>

                  {holidays.map((holiday) => {
                    const isThisOneCancelling = cancellingId === holiday.id;

                    return (
                      <div
                        key={holiday.id}
                        className={`rounded-xl border p-4 transition ${
                          isThisOneCancelling
                            ? "border-rose-200 bg-rose-50/60"
                            : "border-slate-100 bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800">
                              {formatHolidayDate(holiday.date)}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {holiday.description}
                            </p>
                          </div>

                          {!isThisOneCancelling && (
                            <button
                              onClick={() => openCancelForm(holiday.id)}
                              className="shrink-0 rounded-lg border border-rose-100 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                            >
                              Batalkan
                            </button>
                          )}
                        </div>

                        {isThisOneCancelling && (
                          <div className="mt-3 space-y-2 border-t border-rose-100 pt-3">
                            <label
                              htmlFor={`cancel-${holiday.id}`}
                              className="block text-xs font-semibold text-slate-600"
                            >
                              Alasan pembatalan (wajib diisi)
                            </label>

                            <textarea
                              id={`cancel-${holiday.id}`}
                              value={cancelReason}
                              onChange={(e) => setCancelReason(e.target.value)}
                              rows={3}
                              placeholder="Contoh: Operasional tetap berjalan karena ada kebutuhan mendadak dari klien"
                              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                            />

                            <p className="text-[11px] leading-relaxed text-slate-400">
                              Setelah dibatalkan, karyawan dan admin bisa
                              absen kembali di tanggal ini.
                            </p>

                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => handleCancelHoliday(holiday.id)}
                                disabled={
                                  isCancellingHoliday || !cancelReason.trim()
                                }
                                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
                              >
                                {isCancellingHoliday
                                  ? "Memproses..."
                                  : "Konfirmasi pembatalan"}
                              </button>

                              <button
                                onClick={closeCancelForm}
                                disabled={isCancellingHoliday}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                              >
                                Tutup
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
