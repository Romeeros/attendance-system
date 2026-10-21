"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bricolage_Grotesque, Figtree } from "next/font/google";

import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";

import { supabase } from "@/lib/supabase";

// =========================================================
// LOGO
// Taruh gambar di folder public/logo lalu sesuaikan nama
// file & ekstensinya di sini. Contoh: public/logo/logo.png
// Kalau file tidak ditemukan, otomatis tampil huruf pertama
// nama perusahaan.
// =========================================================

const LOGO_SRC = "/logo/logo.png";

// Absen masuk pada jam ini atau setelahnya dihitung terlambat
const LATE_HOUR = 9;

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

const card = "rounded-2xl border border-slate-200/70 bg-white p-6 sm:p-7";

const inputCls =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base text-slate-800 placeholder:text-slate-400 focus:border-[#0E1A3A] focus:outline-none focus:ring-2 focus:ring-[#0E1A3A]/15 sm:text-sm";

const btnPrimary =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0E1A3A] px-6 text-sm font-semibold text-white transition hover:bg-[#1a2a5a] disabled:cursor-not-allowed disabled:opacity-40";

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

const ICONS = {
  camera:
    "M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1ZM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  retake:
    "M20 11a8.1 8.1 0 0 0-14.9-4M4 5v4h4M4 13a8.1 8.1 0 0 0 14.9 4M20 19v-4h-4",
  close: "M18 6 6 18M6 6l12 12",
  plus: "M12 5v14M5 12h14",
  check: "m5 12.5 4.5 4.5L19 7.5",
  pin: "M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12ZM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
};

// =========================================================
// HELPER
// =========================================================

// Tanggal lokal (WIB di perangkat) dalam format YYYY-MM-DD
const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const fmtTime = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";

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

function BrandLogo({ name }: { name: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`${D} flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0E1A3A] text-lg font-bold text-white`}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_SRC}
        alt={`Logo ${name}`}
        onError={() => setFailed(true)}
        className="h-full w-full object-contain p-1"
      />
    </div>
  );
}

function WeekTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;

  const row = payload[0].payload;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-slate-800">{row.full}</p>

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

          <span className="font-semibold text-slate-800">{row[key]}</span>
        </div>
      ))}
    </div>
  );
}

function ArrivalTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const row = payload[0].payload;
  const st = STATUS[row.status as StatusKey];

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-lg">
      <p className="font-semibold text-slate-800">{label}</p>
      <p className="mt-1 text-slate-600">Jam masuk {row.waktuAsli}</p>
      {st && <p className="text-slate-500">{st.label}</p>}
    </div>
  );
}

function ProductivityTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-lg">
      <p className="font-semibold text-slate-800">{label}</p>
      <p className="mt-1 text-slate-600">
        {payload[0].payload.jumlahTugas} pekerjaan
      </p>
    </div>
  );
}

// =========================================================
// HALAMAN
// =========================================================

export default function AdminDashboardPage() {
  const router = useRouter();

  // ---------- umum
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [companyName, setCompanyName] = useState("Company Attendance");
  const [userId, setUserId] = useState("");
  const [profileCreatedAt, setProfileCreatedAt] = useState<string | null>(null);

  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // ---------- monitoring perusahaan (admin)
  const [companyEmployeeCount, setCompanyEmployeeCount] = useState(0);
  const [companyPresentCount, setCompanyPresentCount] = useState(0);
  const [companyLateCount, setCompanyLateCount] = useState(0);
  const [companySickCount, setCompanySickCount] = useState(0);
  const [companyLeaveCount, setCompanyLeaveCount] = useState(0);
  const [companyMissing, setCompanyMissing] = useState<any[]>([]);
  const [companyReports, setCompanyReports] = useState<any[]>([]);
  const [companyTrend, setCompanyTrend] = useState<any[]>([]);

  // ---------- absensi saya
  const [todayAttendanceId, setTodayAttendanceId] = useState<string | null>(
    null
  );
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [hasCheckedOut, setHasCheckedOut] = useState(false);
  const [todayStatus, setTodayStatus] = useState<string | null>(null);
  const [todayApprovalStatus, setTodayApprovalStatus] = useState<
    string | null
  >(null);
  const [todayRejectionReason, setTodayRejectionReason] = useState<
    string | null
  >(null);
  const [todayCheckIn, setTodayCheckIn] = useState<string | null>(null);
  const [todayTaskList, setTodayTaskList] = useState<string[]>([]);

  // ---------- laporan pekerjaan saat absen pulang
  const [dailyTasks, setDailyTasks] = useState<string[]>([""]);
  const taskInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ---------- foto, kamera & GPS
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [employeeLocation, setEmployeeLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<
    "idle" | "loading" | "ok" | "denied"
  >("idle");
  const [isTakingAttendance, setIsTakingAttendance] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // ---------- riwayat & hari libur
  const [myAttendanceHistory, setMyAttendanceHistory] = useState<any[]>([]);
  const [isTodayHoliday, setIsTodayHoliday] = useState(false);
  const [holidayDesc, setHolidayDesc] = useState("");
  const [monthlyHolidays, setMonthlyHolidays] = useState<string[]>([]);

  // ---------- sakit / izin
  const [attendanceTab, setAttendanceTab] = useState<
    "hadir" | "sakit" | "izin"
  >("hadir");
  const [reasonText, setReasonText] = useState("");

  // =========================================================
  // KAMERA & GPS
  // =========================================================

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) videoRef.current.srcObject = null;

    setIsCameraActive(false);
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus("denied");
      return;
    }

    setGpsStatus("loading");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setEmployeeLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGpsStatus("ok");
      },
      () => setGpsStatus("denied"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      streamRef.current = stream;
      setIsCameraActive(true);

      setPhoto(null);
      setPhotoPreview(null);

      requestLocation();
    } catch (err) {
      console.error(err);

      setNotice({
        type: "error",
        text: "Gagal mengakses kamera. Pastikan izin kamera sudah diberikan di browser.",
      });
    }
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !video.videoWidth) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) return;

    // Mirror foto agar seperti kamera depan
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        const file = new File([blob], "selfie-live.jpg", {
          type: "image/jpeg",
        });

        setPhoto(file);
        setPhotoPreview(URL.createObjectURL(file));

        stopCamera();
      },
      "image/jpeg",
      0.8
    );
  };

  const retakePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);

    startCamera();
  };

  const resetCapture = () => {
    stopCamera();
    setPhoto(null);
    setPhotoPreview(null);
    setEmployeeLocation(null);
    setGpsStatus("idle");
    setReasonText("");
    setDailyTasks([""]);
  };

  // Hubungkan stream kamera ke elemen video
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraActive]);

  // Matikan kamera saat halaman ditinggalkan
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // Matikan kamera saat pindah tab
  useEffect(() => {
    if (attendanceTab !== "hadir") stopCamera();
  }, [attendanceTab, stopCamera]);

  // Bebaskan memori preview foto
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  // Notifikasi hilang otomatis
  useEffect(() => {
    if (!notice) return;

    const timer = setTimeout(() => setNotice(null), 4000);

    return () => clearTimeout(timer);
  }, [notice]);

  // =========================================================
  // LOAD DASHBOARD
  // =========================================================

  const loadDashboard = useCallback(async () => {
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

      // ---- profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*, companies(name)")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) console.error("Profile Error:", profileError);

      if (!profile) {
        setUserRole("employee");
        setUserName(user.email?.split("@")[0] || "User");
        return;
      }

      setUserRole(profile.role);
      setUserName(
        profile.full_name || user.email?.split("@")[0] || "Admin"
      );

      // Batas awal perhitungan alpa
      setProfileCreatedAt(profile.created_at ?? null);

      const company: any = (profile as any).companies;
      const cName = Array.isArray(company) ? company[0]?.name : company?.name;

      if (cName) setCompanyName(cName);

      // Owner memakai dasbor owner
      if (profile.role === "owner") {
        router.push("/owner/dashboard");
        return;
      }

      // ---- batas hari ini (waktu lokal perangkat)
      const today = new Date();
      const todayStr = toDateKey(today);

      const todayStartIso = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      ).toISOString();

      const todayEndIso = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1
      ).toISOString();

      // =====================================================
      // MONITORING PERUSAHAAN (ADMIN)
      // =====================================================

      if (profile.role === "admin" && profile.company_id) {
        const { data: companyProfiles, error: companyProfilesError } =
          await supabase
            .from("profiles")
            .select("id, full_name, role, email")
            .eq("company_id", profile.company_id)
            .neq("role", "owner");

        if (companyProfilesError) {
          console.error("Company Profiles Error:", companyProfilesError);
        }

        const employees = companyProfiles ?? [];
        const profileIds = employees.map((item) => item.id);

        setCompanyEmployeeCount(profileIds.length);

        if (profileIds.length > 0) {
          const { data: todayRowsData, error: todayCompanyError } =
            await supabase
              .from("attendance")
              .select(
                "id, profile_id, status, check_in, created_at, task_list, task_count, approval_status"
              )
              .in("profile_id", profileIds)
              .gte("created_at", todayStartIso)
              .lt("created_at", todayEndIso)
              .order("created_at", { ascending: false });

          if (todayCompanyError) {
            console.error("Company Today Attendance Error:", todayCompanyError);
          }

          const todayRows = todayRowsData ?? [];

          let present = 0;
          let late = 0;
          let sick = 0;
          let leave = 0;

          todayRows.forEach((item) => {
            if (item.approval_status === "rejected") return;
            if (item.status === "present") present++;
            if (item.status === "late") late++;
            if (item.status === "sakit") sick++;
            if (item.status === "izin") leave++;
          });

          setCompanyPresentCount(present);
          setCompanyLateCount(late);
          setCompanySickCount(sick);
          setCompanyLeaveCount(leave);

          const attendedIds = new Set(todayRows.map((item) => item.profile_id));

          setCompanyMissing(
            employees.filter((employee) => !attendedIds.has(employee.id))
          );

          // Laporan pekerjaan harian tim
          setCompanyReports(
            todayRows
              .filter(
                (item) =>
                  Array.isArray(item.task_list) &&
                  item.task_list.length > 0 &&
                  item.approval_status !== "rejected"
              )
              .map((item) => ({
                id: item.id,
                tasks: item.task_list as string[],
                name:
                  employees.find((employee) => employee.id === item.profile_id)
                    ?.full_name || "Unknown",
              }))
              .slice(0, 8)
          );

          // Tren kehadiran 7 hari terakhir
          const trendStart = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate() - 6
          );

          const { data: trendRows, error: trendError } = await supabase
            .from("attendance")
            .select("profile_id, status, created_at, approval_status")
            .in("profile_id", profileIds)
            .gte("created_at", trendStart.toISOString())
            .lt("created_at", todayEndIso);

          if (trendError) console.error("Company Trend Error:", trendError);

          const trendMap: Record<string, any> = {};

          for (let i = 0; i < 7; i++) {
            const d = new Date(
              trendStart.getFullYear(),
              trendStart.getMonth(),
              trendStart.getDate() + i
            );

            trendMap[toDateKey(d)] = {
              label: d.toLocaleDateString("id-ID", { weekday: "short" }),
              full: d.toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
              }),
              present: 0,
              late: 0,
              sakit: 0,
              izin: 0,
            };
          }

          (trendRows ?? []).forEach((item) => {
            if (item.approval_status === "rejected" || !item.created_at) return;

            const row = trendMap[toDateKey(new Date(item.created_at))];

            if (row && SERIES.includes(item.status as StatusKey)) {
              row[item.status] += 1;
            }
          });

          setCompanyTrend(Object.values(trendMap));
        } else {
          setCompanyMissing([]);
          setCompanyReports([]);
          setCompanyTrend([]);
        }
      }

      // =====================================================
      // CEK HARI LIBUR (yang dibatalkan owner tidak dihitung)
      // =====================================================

      const { data: holidayData, error: holidayError } = await supabase
        .from("holidays")
        .select("description")
        .eq("date", todayStr)
        .eq("is_cancelled", false)
        .maybeSingle();

      if (holidayError) console.error("Holiday Error:", holidayError);

      setIsTodayHoliday(!!holidayData);
      setHolidayDesc(holidayData?.description ?? "");

      // =====================================================
      // ABSENSI SAYA HARI INI
      // =====================================================

      const { data: myToday, error: todayError } = await supabase
        .from("attendance")
        .select("*")
        .eq("profile_id", user.id)
        .gte("created_at", todayStartIso)
        .lt("created_at", todayEndIso)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (todayError) console.error("Today's Attendance Error:", todayError);

      setTodayAttendanceId(myToday?.id ?? null);
      setHasCheckedIn(!!myToday?.check_in);
      setHasCheckedOut(!!myToday?.check_out);
      setTodayStatus(myToday?.status ?? null);
      setTodayApprovalStatus(myToday?.approval_status ?? null);
      setTodayRejectionReason(myToday?.rejection_reason ?? null);
      setTodayCheckIn(myToday?.check_in ?? null);
      setTodayTaskList(
        Array.isArray(myToday?.task_list) ? myToday.task_list : []
      );

      // =====================================================
      // RIWAYAT BULAN BERJALAN
      // =====================================================

      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const { data: myHistory, error: historyError } = await supabase
        .from("attendance")
        .select(
          "created_at, status, check_in, task_count, approval_status, rejection_reason"
        )
        .eq("profile_id", user.id)
        .gte("created_at", monthStart.toISOString())
        .lt("created_at", todayEndIso)
        .order("created_at", { ascending: false });

      if (historyError) console.error("History Error:", historyError);

      setMyAttendanceHistory(myHistory ?? []);

      // =====================================================
      // HARI LIBUR BULAN BERJALAN (tidak dihitung alpa)
      // =====================================================

      const monthKey = todayStr.slice(0, 7);
      const lastDay = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).getDate();

      const { data: monthlyHolidayData, error: monthlyHolidayError } =
        await supabase
          .from("holidays")
          .select("date")
          .gte("date", `${monthKey}-01`)
          .lte("date", `${monthKey}-${String(lastDay).padStart(2, "0")}`)
          .eq("is_cancelled", false);

      if (monthlyHolidayError) {
        console.error("Monthly Holiday Error:", monthlyHolidayError);
      }

      setMonthlyHolidays((monthlyHolidayData ?? []).map((h) => h.date));
    } catch (error) {
      console.error("Dashboard Error:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // =========================================================
  // AKSI
  // =========================================================

  const handleLogout = async () => {
    stopCamera();

    await supabase.auth.signOut();

    router.push("/login");
  };

  // ---- laporan pekerjaan
  const handleTaskChange = (index: number, value: string) => {
    setDailyTasks((prev) => prev.map((t, i) => (i === index ? value : t)));
  };

  const handleTaskKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    // Enter: tambah baris baru
    if (e.key === "Enter") {
      e.preventDefault();

      if (!dailyTasks[index].trim()) return;

      const updated = [...dailyTasks];
      updated.splice(index + 1, 0, "");
      setDailyTasks(updated);

      setTimeout(() => taskInputRefs.current[index + 1]?.focus(), 0);

      return;
    }

    // Backspace di baris kosong: hapus baris
    if (
      e.key === "Backspace" &&
      dailyTasks[index] === "" &&
      dailyTasks.length > 1
    ) {
      e.preventDefault();

      const updated = [...dailyTasks];
      updated.splice(index, 1);
      setDailyTasks(updated);

      setTimeout(() => taskInputRefs.current[index - 1]?.focus(), 0);
    }
  };

  const handleAddTaskRow = () => {
    setDailyTasks((prev) => [...prev, ""]);

    setTimeout(() => taskInputRefs.current[dailyTasks.length]?.focus(), 0);
  };

  const handleRemoveTaskRow = (index: number) => {
    if (dailyTasks.length === 1) {
      setDailyTasks([""]);
      return;
    }

    setDailyTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const filledTaskCount = dailyTasks.filter((t) => t.trim()).length;

  // ---- upload foto ke storage, kembalikan URL publik
  const uploadPhoto = async (file: File, type: "check_in" | "check_out") => {
    const ext = file.name ? file.name.split(".").pop() : "jpg";
    const fileName = `${userId}-${type}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("attendances")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("attendances").getPublicUrl(fileName);

    return data.publicUrl;
  };

  // ---- submit absensi
  const submitAttendance = async (type: "check_in" | "check_out") => {
    if (isTakingAttendance) return;

    setIsTakingAttendance(true);

    try {
      const now = new Date();
      const nowIso = now.toISOString();

      // ---------------- CHECK IN ----------------
      if (type === "check_in") {
        if (hasCheckedIn) {
          setNotice({ type: "error", text: "Kamu sudah absen hari ini." });
          return;
        }

        // Sakit / izin
        if (attendanceTab === "sakit" || attendanceTab === "izin") {
          const reason = reasonText.trim();

          if (!reason) {
            setNotice({
              type: "error",
              text: `Keterangan ${attendanceTab} tidak boleh kosong.`,
            });
            return;
          }

          const { error } = await supabase.from("attendance").insert({
            profile_id: userId,
            status: attendanceTab,
            reason,
            check_in: nowIso,
            approval_status: "pending",
          });

          if (error) throw error;

          resetCapture();
          setNotice({
            type: "success",
            text: `Pengajuan ${attendanceTab} berhasil dikirim.`,
          });

          await loadDashboard();

          return;
        }

        // Hadir
        if (!photo || !employeeLocation) {
          setNotice({
            type: "error",
            text: "Foto dan lokasi GPS wajib ada sebelum absen.",
          });
          return;
        }

        const photoUrl = await uploadPhoto(photo, "check_in");

        const { error } = await supabase.from("attendance").insert({
          profile_id: userId,
          status: now.getHours() >= LATE_HOUR ? "late" : "present",
          check_in: nowIso,
          photo_check_in: photoUrl,
          approval_status: "pending",
          latitude: employeeLocation.lat,
          longitude: employeeLocation.lng,
        });

        if (error) throw error;

        resetCapture();
        setNotice({ type: "success", text: "Berhasil absen masuk." });

        await loadDashboard();

        return;
      }

      // ---------------- CHECK OUT ----------------
      if (!photo || !employeeLocation) {
        setNotice({
          type: "error",
          text: "Foto dan lokasi GPS wajib ada sebelum absen pulang.",
        });
        return;
      }

      if (!todayAttendanceId) {
        setNotice({
          type: "error",
          text: "Data absensi hari ini tidak ditemukan.",
        });
        return;
      }

      const filteredTasks = dailyTasks
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      if (filteredTasks.length === 0) {
        setNotice({
          type: "error",
          text: "Isi minimal 1 pekerjaan yang kamu kerjakan hari ini sebelum absen pulang.",
        });
        return;
      }

      const photoUrl = await uploadPhoto(photo, "check_out");

      const { error } = await supabase
        .from("attendance")
        .update({
          check_out: nowIso,
          photo_check_out: photoUrl,
          latitude_out: employeeLocation.lat,
          longitude_out: employeeLocation.lng,
          task_list: filteredTasks,
          task_count: filteredTasks.length,
        })
        .eq("id", todayAttendanceId);

      if (error) throw error;

      resetCapture();
      setNotice({ type: "success", text: "Berhasil absen pulang." });

      await loadDashboard();
    } catch (error: any) {
      console.error("Catch Error:", error);

      setNotice({
        type: "error",
        text: `Gagal: ${error?.message || JSON.stringify(error)}`,
      });
    } finally {
      setIsTakingAttendance(false);
    }
  };

  // =========================================================
  // LOADING
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

  // =========================================================
  // DATA TURUNAN: ADMIN / TIM
  // =========================================================

  const isAdmin = userRole === "admin";

  const teamHadir = companyPresentCount + companyLateCount;
  const teamSudahAbsen = Math.max(
    companyEmployeeCount - companyMissing.length,
    0
  );
  const teamDataMasuk = teamHadir + companySickCount + companyLeaveCount;

  const teamRate =
    companyEmployeeCount > 0
      ? Math.round((teamHadir / companyEmployeeCount) * 100)
      : 0;

  const teamDonut = [
    { name: "Tepat waktu", value: companyPresentCount, color: STATUS.present.color },
    { name: "Terlambat", value: companyLateCount, color: STATUS.late.color },
    { name: "Sakit", value: companySickCount, color: STATUS.sakit.color },
    { name: "Izin", value: companyLeaveCount, color: STATUS.izin.color },
    { name: "Belum absen", value: companyMissing.length, color: STATUS.absent.color },
  ];

  const teamDonutTotal = teamDonut.reduce((sum, item) => sum + item.value, 0);
  const teamStripTotal = Math.max(companyEmployeeCount, teamDonutTotal, 1);

  const teamDonutRender =
    teamDonutTotal > 0
      ? teamDonut
      : [{ name: "Kosong", value: 1, color: "#E8ECF3" }];

  const hasTrendData = companyTrend.some(
    (d) => d.present + d.late + d.sakit + d.izin > 0
  );

  // =========================================================
  // DATA TURUNAN: STATISTIK SAYA BULAN INI
  // =========================================================

  let myPresentCount = 0;
  let myLateCount = 0;
  let mySickCount = 0;
  let myLeaveCount = 0;
  let myRejectedCount = 0;

  // Absensi yang ditolak tidak dihitung hadir/terlambat, hanya alpa
  myAttendanceHistory.forEach((att) => {
    if (att.approval_status === "rejected") {
      myRejectedCount++;
      return;
    }

    if (att.status === "present") myPresentCount++;
    if (att.status === "late") myLateCount++;
    if (att.status === "sakit") mySickCount++;
    if (att.status === "izin") myLeaveCount++;
  });

  // Alpa = hari kerja yang sudah lewat, sejak akun dibuat, bukan
  // Sabtu/Minggu, bukan hari libur, dan tanpa catatan absensi.
  // Hari ini belum dihitung agar masih bisa absen.
  const attendanceDateSet = new Set(
    myAttendanceHistory
      .map((att) => (att.created_at ? toDateKey(new Date(att.created_at)) : null))
      .filter(Boolean)
  );

  const nowForStats = new Date();

  const currentMonthStart = new Date(
    nowForStats.getFullYear(),
    nowForStats.getMonth(),
    1
  );

  const createdDay = profileCreatedAt
    ? new Date(
        new Date(profileCreatedAt).getFullYear(),
        new Date(profileCreatedAt).getMonth(),
        new Date(profileCreatedAt).getDate()
      )
    : currentMonthStart;

  const absenceStartDate =
    createdDay > currentMonthStart ? createdDay : currentMonthStart;

  const yesterday = new Date(
    nowForStats.getFullYear(),
    nowForStats.getMonth(),
    nowForStats.getDate() - 1
  );

  let myAbsentCount = myRejectedCount;

  const checkDate = new Date(absenceStartDate);

  while (checkDate <= yesterday) {
    const day = checkDate.getDay();
    const key = toDateKey(checkDate);

    if (
      day !== 0 &&
      day !== 6 &&
      !monthlyHolidays.includes(key) &&
      !attendanceDateSet.has(key)
    ) {
      myAbsentCount++;
    }

    checkDate.setDate(checkDate.getDate() + 1);
  }

  const myTotalMasuk = myPresentCount + myLateCount;

  const myComposition: { key: StatusKey; label: string; value: number }[] = [
    { key: "present", label: "Tepat waktu", value: myPresentCount },
    { key: "late", label: "Terlambat", value: myLateCount },
    { key: "sakit", label: "Sakit", value: mySickCount },
    { key: "izin", label: "Izin", value: myLeaveCount },
    { key: "absent", label: "Alpa / ditolak", value: myAbsentCount },
  ];

  const myCompositionTotal = myComposition.reduce((s, i) => s + i.value, 0);

  // ---- grafik jam masuk
  const chartData = myAttendanceHistory
    .filter(
      (item) =>
        item.check_in &&
        item.approval_status !== "rejected" &&
        (item.status === "present" || item.status === "late")
    )
    .map((item) => {
      const d = new Date(item.check_in);

      return {
        tanggal: d.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        }),
        jamDesimal: parseFloat((d.getHours() + d.getMinutes() / 60).toFixed(2)),
        waktuAsli: fmtTime(item.check_in),
        status: item.status,
      };
    })
    .reverse();

  // ---- grafik produktivitas
  const productivityData = myAttendanceHistory
    .filter(
      (item) =>
        item.check_in &&
        item.approval_status !== "rejected" &&
        typeof item.task_count === "number" &&
        item.task_count > 0
    )
    .map((item) => ({
      tanggal: new Date(item.check_in).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      }),
      jumlahTugas: item.task_count,
    }))
    .reverse();

  // ---- status absensi saya
  const isAttendanceDone =
    hasCheckedOut ||
    todayStatus === "sakit" ||
    todayStatus === "izin" ||
    todayApprovalStatus === "rejected";

  const statusLabel =
    todayApprovalStatus === "rejected"
      ? "Ditolak"
      : STATUS[todayStatus as StatusKey]?.label || "Belum absen";

  const statusBadge =
    todayApprovalStatus === "rejected"
      ? STATUS.absent.badge
      : STATUS[todayStatus as StatusKey]?.badge ||
        "bg-slate-100 text-slate-600 ring-slate-200";

  // ---- teks umum
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

  const monthLabel = new Date().toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  const firstName = userName.split(" ")[0];

  const summary = !isAdmin
    ? isAttendanceDone
      ? "Absensi kamu hari ini sudah selesai."
      : "Jangan lupa lakukan absensi hari ini."
    : companyEmployeeCount === 0
    ? "Belum ada anggota yang terdaftar di perusahaan ini."
    : companyMissing.length === 0
    ? `Semua ${companyEmployeeCount} anggota sudah absen hari ini.`
    : `${teamSudahAbsen} dari ${companyEmployeeCount} anggota sudah absen. ${companyMissing.length} lainnya belum.`;

  const roleLabel = isAdmin ? "Admin" : "Employee";

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className={`${BASE} min-h-screen bg-[#F2F4F9] pb-16 text-slate-800`}>
      {/* ================= TOAST ================= */}

      {notice && (
        <div
          role="status"
          className={`fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg ${
            notice.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* ================= HEADER ================= */}

      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo name={companyName} />

            <div className="min-w-0">
              <h1
                className={`${D} truncate text-lg font-semibold leading-tight text-slate-900`}
              >
                {companyName}
              </h1>
              <p className="text-xs text-slate-500">
                {isAdmin ? "Dasbor admin" : "Dasbor karyawan"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden items-center gap-2.5 sm:flex">
              <span className="max-w-[10rem] truncate text-sm font-semibold capitalize text-slate-700">
                {userName}
              </span>

              <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-200">
                {roleLabel}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-8 sm:pt-8">
        {/* ================= HERO ================= */}

        <section className="rounded-[28px] bg-[#0E1A3A] p-6 text-white sm:p-10">
          <div
            className={`grid items-center gap-8 ${
              isAdmin ? "lg:grid-cols-[1fr_auto]" : ""
            }`}
          >
            <div>
              <p className="text-sm capitalize text-slate-300">{todayLabel}</p>

              <h2
                className={`${D} mt-2 text-3xl font-semibold capitalize leading-tight sm:text-5xl`}
              >
                {greeting}, {firstName}.
              </h2>

              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-300">
                {summary}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
                  Absensi kamu:{" "}
                  {isTodayHoliday
                    ? "hari libur"
                    : `${statusLabel.toLowerCase()}${
                        todayCheckIn ? `, ${fmtTime(todayCheckIn)}` : ""
                      }`}
                </span>
              </div>

              {isAdmin && (
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/attendance"
                    className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#0E1A3A] transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  >
                    Kelola absensi
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
              )}
            </div>

            {/* GAUGE KEHADIRAN TIM */}

            {isAdmin && (
              <div className="relative mx-auto h-52 w-52 shrink-0 sm:h-56 sm:w-56">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    data={[{ name: "Hadir", value: teamRate }]}
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
                    {teamRate}
                    <span className="text-2xl text-slate-400">%</span>
                  </span>
                  <span className="mt-1 text-xs text-slate-300">
                    tim hadir hari ini
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* =====================================================
            MONITORING TIM (ADMIN)
        ===================================================== */}

        {isAdmin && (
          <>
            {/* RINGKASAN ANGKA */}

            <section className={`${card} mt-6`}>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                {teamDonut.map(
                  (seg) =>
                    seg.value > 0 && (
                      <div
                        key={seg.name}
                        title={`${seg.name}: ${seg.value}`}
                        style={{
                          width: `${(seg.value / teamStripTotal) * 100}%`,
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
                    Total anggota
                  </dt>
                  <dd
                    className={`${D} mt-1 text-4xl font-semibold text-slate-900`}
                  >
                    {companyEmployeeCount}
                  </dd>
                </div>

                {teamDonut.map((item) => (
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

            {/* GRAFIK TIM */}

            <div className="mt-6 grid gap-6 lg:grid-cols-5">
              <section className={`${card} lg:col-span-3`}>
                <h3 className={`${D} text-xl font-semibold text-slate-900`}>
                  Kehadiran tim 7 hari terakhir
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Jumlah anggota per status, termasuk hari ini.
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

                {hasTrendData ? (
                  <div className="mt-4 h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={companyTrend}
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
                            maxBarSize={30}
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

              <section className={`${card} lg:col-span-2`}>
                <h3 className={`${D} text-xl font-semibold text-slate-900`}>
                  Status hari ini
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Proporsi seluruh anggota berdasarkan status.
                </p>

                <div className="relative mx-auto mt-4 h-44 w-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={teamDonutRender}
                        innerRadius={56}
                        outerRadius={80}
                        paddingAngle={teamDonutTotal > 0 ? 4 : 0}
                        cornerRadius={6}
                        dataKey="value"
                        stroke="none"
                      >
                        {teamDonutRender.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>

                      {teamDonutTotal > 0 && (
                        <Tooltip
                          formatter={(value) => [`${value} anggota`, "Jumlah"]}
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
                      {teamDataMasuk}
                    </span>
                    <span className="text-xs text-slate-500">data masuk</span>
                  </div>
                </div>

                <ul className="mt-5 space-y-2.5">
                  {teamDonut.map((item) => {
                    const pct =
                      companyEmployeeCount > 0
                        ? Math.round((item.value / companyEmployeeCount) * 100)
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

            {/* LAPORAN TIM & BELUM ABSEN */}

            <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
              <section className={`${card} lg:col-span-2`}>
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <h3
                      className={`${D} text-xl font-semibold text-slate-900`}
                    >
                      Laporan pekerjaan tim
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Dilaporkan anggota saat absen pulang hari ini.
                    </p>
                  </div>

                  <Link
                    href="/attendance"
                    className="shrink-0 rounded-full bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                  >
                    Lihat semua
                  </Link>
                </div>

                {companyReports.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                    Belum ada laporan pekerjaan hari ini.
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {companyReports.map((report) => (
                      <li
                        key={report.id}
                        className="py-4 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="min-w-0 truncate text-[15px] font-semibold text-slate-900">
                            {report.name}
                          </p>

                          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {report.tasks.length} pekerjaan
                          </span>
                        </div>

                        <ol className="mt-2 space-y-1.5">
                          {report.tasks.slice(0, 3).map((task: string, i: number) => (
                            <li
                              key={i}
                              className="flex items-start gap-2.5 text-sm text-slate-600"
                            >
                              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">
                                {i + 1}
                              </span>
                              <span className="min-w-0 break-words">{task}</span>
                            </li>
                          ))}
                        </ol>

                        {report.tasks.length > 3 && (
                          <p className="mt-1.5 pl-7 text-xs text-slate-400">
                            +{report.tasks.length - 3} pekerjaan lainnya
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className={card}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3
                      className={`${D} text-xl font-semibold text-slate-900`}
                    >
                      Belum absen
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {companyMissing.length} anggota perlu diingatkan.
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
                  {companyMissing.length === 0 ? (
                    <div className="flex flex-col items-center rounded-xl bg-emerald-50 p-6 text-center text-emerald-700">
                      <Icon d={ICONS.check} className="h-6 w-6" />
                      <p className="mt-2 text-sm font-semibold">
                        Semua anggota sudah absen
                      </p>
                    </div>
                  ) : (
                    companyMissing.map((employee) => (
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
            </div>
          </>
        )}

        {/* =====================================================
            ABSENSI SAYA
        ===================================================== */}

        <section className="mt-10">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                className={`${D} text-2xl font-semibold text-slate-900 sm:text-3xl`}
              >
                Absensi saya
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Verifikasi kehadiran dengan foto langsung dan lokasi GPS.
              </p>
            </div>

            {todayStatus && (
              <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${statusBadge}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {statusLabel}
                {todayCheckIn && `, ${fmtTime(todayCheckIn)}`}
              </span>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 sm:p-8">
            {isTodayHoliday ? (
              /* ---------- HARI LIBUR ---------- */
              <div className="rounded-2xl bg-slate-50 p-8 text-center">
                <h3 className={`${D} text-2xl font-semibold text-slate-900`}>
                  Hari ini libur
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                  {holidayDesc}
                </p>
                <span className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                  Form absensi dinonaktifkan
                </span>
              </div>
            ) : hasCheckedIn && isAttendanceDone ? (
              /* ---------- ABSENSI SELESAI ---------- */
              <div
                className={`rounded-2xl p-6 sm:p-8 ${
                  todayApprovalStatus === "rejected"
                    ? "bg-rose-50"
                    : todayStatus === "sakit"
                    ? "bg-orange-50"
                    : todayStatus === "izin"
                    ? "bg-violet-50"
                    : "bg-emerald-50"
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white ${
                      todayApprovalStatus === "rejected"
                        ? "text-rose-600"
                        : todayStatus === "sakit"
                        ? "text-orange-600"
                        : todayStatus === "izin"
                        ? "text-violet-600"
                        : "text-emerald-600"
                    }`}
                  >
                    <Icon
                      d={
                        todayApprovalStatus === "rejected"
                          ? ICONS.close
                          : ICONS.check
                      }
                      className="h-6 w-6"
                    />
                  </div>

                  <h3
                    className={`${D} text-2xl font-semibold text-slate-900`}
                  >
                    {todayApprovalStatus === "rejected"
                      ? "Absensi ditolak, dianggap tidak masuk"
                      : todayStatus === "sakit"
                      ? "Semoga lekas sembuh"
                      : todayStatus === "izin"
                      ? "Pengajuan izin tercatat"
                      : "Absensi hari ini selesai"}
                  </h3>

                  <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-600">
                    {todayApprovalStatus === "rejected"
                      ? "Absensi kamu ditolak oleh owner sehingga hari ini dihitung sebagai tidak masuk (alpa)."
                      : todayStatus === "sakit" || todayStatus === "izin"
                      ? `Pengajuan ${todayStatus} sudah terkirim dan menunggu diproses.`
                      : "Terima kasih sudah menyelesaikan absensi. Semoga harimu lancar."}
                  </p>

                  {todayApprovalStatus === "rejected" && (
                    <div className="mt-5 w-full max-w-lg rounded-xl bg-white p-4 text-left">
                      <p className="text-xs font-semibold text-rose-500">
                        Alasan penolakan
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                        {todayRejectionReason ||
                          "Tidak ada alasan yang diberikan."}
                      </p>
                    </div>
                  )}
                </div>

                {(todayStatus === "present" || todayStatus === "late") &&
                  todayTaskList.length > 0 && (
                    <div className="mx-auto mt-6 max-w-lg rounded-xl bg-white p-5 text-left">
                      <p className="mb-3 text-sm font-semibold text-slate-700">
                        Laporan pekerjaan hari ini ({todayTaskList.length})
                      </p>

                      <ol className="space-y-2">
                        {todayTaskList.map((task, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2.5 text-sm text-slate-700"
                          >
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-semibold text-emerald-700">
                              {i + 1}
                            </span>
                            <span className="min-w-0 break-words">{task}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
              </div>
            ) : (
              /* ---------- FORM ABSENSI ---------- */
              <div>
                {!hasCheckedIn && (
                  <div
                    role="group"
                    aria-label="Jenis absensi"
                    className="mx-auto mb-6 grid w-full max-w-lg grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1"
                  >
                    {(
                      [
                        { id: "hadir", label: "Hadir" },
                        { id: "sakit", label: "Sakit" },
                        { id: "izin", label: "Izin" },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setAttendanceTab(tab.id)}
                        aria-pressed={attendanceTab === tab.id}
                        className={`h-10 rounded-lg text-sm font-semibold transition ${
                          attendanceTab === tab.id
                            ? "bg-white text-[#0E1A3A] shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}

                {!hasCheckedIn && attendanceTab !== "hadir" ? (
                  /* ----- sakit / izin ----- */
                  <div className="mx-auto max-w-lg">
                    <h3 className="text-base font-semibold text-slate-900">
                      Pengajuan {attendanceTab === "sakit" ? "sakit" : "izin"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Jelaskan alasan dengan singkat dan jelas agar mudah
                      diproses.
                    </p>

                    <label htmlFor="reason" className="sr-only">
                      Alasan
                    </label>
                    <textarea
                      id="reason"
                      value={reasonText}
                      onChange={(e) => setReasonText(e.target.value)}
                      placeholder={`Tuliskan alasan kenapa kamu ${attendanceTab} hari ini...`}
                      rows={4}
                      className="mt-4 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-700 placeholder:text-slate-400 focus:border-[#0E1A3A] focus:outline-none focus:ring-2 focus:ring-[#0E1A3A]/15 sm:text-sm"
                    />

                    <button
                      onClick={() => submitAttendance("check_in")}
                      disabled={isTakingAttendance || !reasonText.trim()}
                      className={`${btnPrimary} mt-4`}
                    >
                      {isTakingAttendance
                        ? "Memproses..."
                        : `Kirim pengajuan ${
                            attendanceTab === "sakit" ? "sakit" : "izin"
                          }`}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* ----- kamera ----- */}
                    <div className="mx-auto w-full max-w-md">
                      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
                        <canvas ref={canvasRef} className="hidden" />

                        {photoPreview ? (
                          <div className="relative h-full w-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photoPreview}
                              alt="Pratinjau foto absensi"
                              className="h-full w-full object-cover"
                            />

                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12">
                              <button
                                onClick={retakePhoto}
                                className="mx-auto flex h-10 items-center gap-2 rounded-full bg-white/95 px-5 text-xs font-semibold text-slate-800 transition hover:bg-white"
                              >
                                <Icon d={ICONS.retake} />
                                Ambil ulang foto
                              </button>
                            </div>

                            <span className="absolute left-3 top-3 rounded-full bg-black/45 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                              Foto siap dikirim
                            </span>
                          </div>
                        ) : isCameraActive ? (
                          <div className="relative h-full w-full bg-black">
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              className="h-full w-full scale-x-[-1] object-cover"
                            />

                            <div className="pointer-events-none absolute inset-0">
                              <div className="absolute left-1/2 top-1/2 h-[70%] w-[46%] -translate-x-1/2 -translate-y-1/2 rounded-[45%] border-2 border-white/35" />
                            </div>

                            <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
                              Kamera aktif
                            </span>

                            <button
                              onClick={takePhoto}
                              className="absolute bottom-4 left-1/2 flex h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-[#0E1A3A] shadow-lg transition hover:bg-slate-100"
                            >
                              <Icon d={ICONS.camera} />
                              Ambil foto
                            </button>
                          </div>
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center bg-slate-50 p-6 text-center">
                            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
                              <Icon d={ICONS.camera} className="h-6 w-6" />
                            </div>

                            <h3
                              className={`${D} text-lg font-semibold text-slate-900`}
                            >
                              Verifikasi wajah
                            </h3>

                            <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-slate-500">
                              Ambil foto secara langsung. Unggah dari galeri
                              dinonaktifkan untuk menjaga validitas absensi.
                            </p>

                            <button
                              onClick={startCamera}
                              className="mt-4 h-10 rounded-xl bg-[#0E1A3A] px-5 text-xs font-semibold text-white transition hover:bg-[#1a2a5a]"
                            >
                              Aktifkan kamera
                            </button>
                          </div>
                        )}
                      </div>

                      {/* GPS */}

                      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                        {gpsStatus === "ok" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                            <Icon d={ICONS.pin} className="h-3.5 w-3.5" />
                            Lokasi GPS terverifikasi
                          </span>
                        ) : gpsStatus === "loading" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-500">
                            <Icon d={ICONS.pin} className="h-3.5 w-3.5" />
                            Mencari lokasi...
                          </span>
                        ) : (
                          <>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-500">
                              <Icon d={ICONS.pin} className="h-3.5 w-3.5" />
                              {gpsStatus === "denied"
                                ? "Lokasi belum diizinkan"
                                : "Izinkan akses lokasi GPS"}
                            </span>

                            <button
                              onClick={requestLocation}
                              className="h-8 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              {gpsStatus === "denied" ? "Coba lagi" : "Aktifkan"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* ----- laporan pekerjaan (saat absen pulang) ----- */}

                    {hasCheckedIn && !hasCheckedOut && (
                      <div className="mx-auto mt-6 w-full max-w-md rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6">
                        <h3 className="text-base font-semibold text-slate-900">
                          Laporan pekerjaan hari ini
                        </h3>
                        <p className="mt-1 text-sm leading-relaxed text-slate-500">
                          Tulis pekerjaan yang sudah kamu selesaikan. Tekan
                          Enter untuk menambah baris baru.
                        </p>

                        <div className="mt-4 space-y-2">
                          {dailyTasks.map((task, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                                {index + 1}
                              </span>

                              <input
                                ref={(el) => {
                                  taskInputRefs.current[index] = el;
                                }}
                                type="text"
                                value={task}
                                onChange={(e) =>
                                  handleTaskChange(index, e.target.value)
                                }
                                onKeyDown={(e) => handleTaskKeyDown(index, e)}
                                placeholder={`Pekerjaan ke-${index + 1}`}
                                aria-label={`Pekerjaan ke-${index + 1}`}
                                className={inputCls}
                              />

                              {dailyTasks.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTaskRow(index)}
                                  aria-label={`Hapus pekerjaan ke-${index + 1}`}
                                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                                >
                                  <Icon d={ICONS.close} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={handleAddTaskRow}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-[#0E1A3A] transition hover:bg-slate-100"
                          >
                            <Icon d={ICONS.plus} />
                            Tambah pekerjaan
                          </button>

                          <span className="text-xs text-slate-500">
                            {filledTaskCount} tercatat
                          </span>
                        </div>
                      </div>
                    )}

                    {/* ----- tombol kirim ----- */}

                    <div className="mx-auto mt-6 flex max-w-md flex-col gap-3">
                      {!hasCheckedIn && (
                        <button
                          onClick={() => submitAttendance("check_in")}
                          disabled={
                            isTakingAttendance || !photo || !employeeLocation
                          }
                          className={btnPrimary}
                        >
                          {isTakingAttendance
                            ? "Memproses..."
                            : "Kirim absen masuk"}
                        </button>
                      )}

                      {hasCheckedIn && !hasCheckedOut && (
                        <button
                          onClick={() => submitAttendance("check_out")}
                          disabled={
                            isTakingAttendance ||
                            !photo ||
                            !employeeLocation ||
                            filledTaskCount === 0
                          }
                          className={btnPrimary}
                        >
                          {isTakingAttendance
                            ? "Memproses..."
                            : "Kirim absen pulang"}
                        </button>
                      )}
                    </div>

                    {(!photo || !employeeLocation) && (
                      <p className="mt-3 text-center text-xs text-slate-500">
                        Foto dan GPS wajib tersedia sebelum tombol absensi
                        aktif.
                      </p>
                    )}

                    {hasCheckedIn &&
                      !hasCheckedOut &&
                      photo &&
                      employeeLocation &&
                      filledTaskCount === 0 && (
                        <p className="mt-2 text-center text-xs font-medium text-amber-600">
                          Isi minimal 1 laporan pekerjaan sebelum absen pulang.
                        </p>
                      )}
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        {/* =====================================================
            RINGKASAN SAYA BULAN INI
        ===================================================== */}

        <section className="mt-10">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                className={`${D} text-2xl font-semibold text-slate-900 sm:text-3xl`}
              >
                Ringkasan saya
              </h2>
              <p className="mt-1 text-sm capitalize text-slate-500">
                {monthLabel}
              </p>
            </div>

            <Link
              href="/my-attendance"
              className="inline-flex h-10 w-fit items-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Riwayat absensi lengkap
            </Link>
          </div>

          <div className={card}>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              {myComposition.map(
                (seg) =>
                  seg.value > 0 && (
                    <div
                      key={seg.key}
                      title={`${seg.label}: ${seg.value}`}
                      style={{
                        width: `${(seg.value / myCompositionTotal) * 100}%`,
                        backgroundColor: STATUS[seg.key].color,
                      }}
                    />
                  )
              )}
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-6 lg:gap-x-0 lg:divide-x lg:divide-slate-100">
              <div className="lg:pr-5">
                <dt className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-800" />
                  Total masuk
                </dt>
                <dd
                  className={`${D} mt-1 text-4xl font-semibold text-slate-900`}
                >
                  {myTotalMasuk}
                </dd>
              </div>

              {myComposition.map((item) => (
                <div key={item.key} className="lg:px-5">
                  <dt className="flex items-center gap-2 text-sm text-slate-500">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: STATUS[item.key].color }}
                    />
                    {item.label}
                  </dt>
                  <dd
                    className={`${D} mt-1 text-4xl font-semibold text-slate-900`}
                  >
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-5 text-xs leading-relaxed text-slate-400">
              Tepat waktu jika masuk sebelum pukul{" "}
              {String(LATE_HOUR).padStart(2, "0")}:00. Alpa dihitung dari hari
              kerja yang sudah lewat tanpa absensi, termasuk absensi yang
              ditolak. Hari ini belum dihitung.
            </p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* JAM MASUK */}

            <section className={`${card} min-w-0`}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3
                    className={`${D} text-xl font-semibold text-slate-900`}
                  >
                    Tren jam masuk
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Garis putus-putus menandai batas terlambat.
                  </p>
                </div>

                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {chartData.length} data
                </span>
              </div>

              {chartData.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 8, left: -18, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="4 4"
                        vertical={false}
                        stroke="#EEF1F6"
                      />
                      <XAxis
                        dataKey="tanggal"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#64748B" }}
                        dy={8}
                      />
                      <YAxis
                        domain={[
                          (min: number) => Math.floor(min) - 1,
                          (max: number) =>
                            Math.max(Math.ceil(max) + 1, LATE_HOUR + 1),
                        ]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#94A3B8" }}
                        tickFormatter={(val) => `${Math.floor(val)}:00`}
                      />
                      <Tooltip content={<ArrivalTooltip />} />
                      <ReferenceLine
                        y={LATE_HOUR}
                        stroke={STATUS.late.color}
                        strokeDasharray="5 5"
                      />
                      <Line
                        type="monotone"
                        dataKey="jamDesimal"
                        stroke="#0E1A3A"
                        strokeWidth={2.5}
                        dot={{
                          r: 4,
                          strokeWidth: 2,
                          fill: "#fff",
                          stroke: "#0E1A3A",
                        }}
                        activeDot={{
                          r: 6,
                          stroke: "#fff",
                          strokeWidth: 2,
                          fill: "#0E1A3A",
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center text-sm text-slate-500">
                  Riwayat jam masuk akan muncul di sini setelah kamu absen.
                </div>
              )}
            </section>

            {/* PRODUKTIVITAS */}

            <section className={`${card} min-w-0`}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3
                    className={`${D} text-xl font-semibold text-slate-900`}
                  >
                    Tren produktivitas
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Jumlah pekerjaan yang kamu laporkan saat absen pulang.
                  </p>
                </div>

                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {productivityData.length} data
                </span>
              </div>

              {productivityData.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={productivityData}
                      margin={{ top: 10, right: 8, left: -18, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="4 4"
                        vertical={false}
                        stroke="#EEF1F6"
                      />
                      <XAxis
                        dataKey="tanggal"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#64748B" }}
                        dy={8}
                      />
                      <YAxis
                        allowDecimals={false}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#94A3B8" }}
                      />
                      <Tooltip content={<ProductivityTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="jumlahTugas"
                        stroke={STATUS.present.color}
                        strokeWidth={2.5}
                        dot={{
                          r: 4,
                          strokeWidth: 2,
                          fill: "#fff",
                          stroke: STATUS.present.color,
                        }}
                        activeDot={{
                          r: 6,
                          stroke: "#fff",
                          strokeWidth: 2,
                          fill: STATUS.present.color,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center text-sm text-slate-500">
                  Grafik muncul setelah kamu melaporkan pekerjaan saat absen
                  pulang.
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
