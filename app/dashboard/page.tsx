"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function DashboardPage() {
  const router = useRouter();

  // =========================================================
  // STATE UMUM
  // =========================================================

  const [loading, setLoading] = useState(true);

  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
  const [companyName, setCompanyName] = useState("Company Attendance");
  const [userId, setUserId] = useState("");

  // =========================================================
  // STATE ABSENSI KARYAWAN
  // =========================================================

  const [todayAttendanceId, setTodayAttendanceId] =
    useState<string | null>(null);

  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [hasCheckedOut, setHasCheckedOut] = useState(false);
  const [todayStatus, setTodayStatus] = useState<string | null>(null);

  // =========================================================
  // STATE FOTO & KAMERA
  // =========================================================

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [employeeLocation, setEmployeeLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [isTakingAttendance, setIsTakingAttendance] = useState(false);

  // =========================================================
  // STATE RIWAYAT
  // =========================================================

  const [myAttendanceHistory, setMyAttendanceHistory] = useState<any[]>([]);

  // =========================================================
  // STATE HARI LIBUR
  // =========================================================

  const [isTodayHoliday, setIsTodayHoliday] = useState(false);
  const [holidayDesc, setHolidayDesc] = useState("");

  // =========================================================
  // STATE SAKIT / IZIN
  // =========================================================

  const [attendanceTab, setAttendanceTab] = useState<
    "hadir" | "sakit" | "izin"
  >("hadir");

  const [reasonText, setReasonText] = useState("");

  // =========================================================
  // STATE KAMERA
  // =========================================================

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // =========================================================
  // STOP CAMERA SAAT PAGE DITINGGALKAN
  // =========================================================

  useEffect(() => {
    return () => stopCamera();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================================================
  // STOP CAMERA KETIKA PINDAH TAB
  // =========================================================

  useEffect(() => {
    if (attendanceTab !== "hadir") {
      stopCamera();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendanceTab]);

  // =========================================================
  // LOAD DASHBOARD
  // =========================================================

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        // -----------------------------------------------------
        // CEK USER LOGIN
        // -----------------------------------------------------

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        setUserEmail(user.email ?? "");
        setUserId(user.id);

        // -----------------------------------------------------
        // AMBIL PROFILE
        // -----------------------------------------------------

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*, companies(name)")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Profile Error:", profileError);
        }

        // -----------------------------------------------------
        // JIKA PROFILE TIDAK DITEMUKAN
        // -----------------------------------------------------

        if (!profile) {
          setUserRole("employee");
          setUserName(user.email?.split("@")[0] || "User");
          setLoading(false);
          return;
        }

        // -----------------------------------------------------
        // SIMPAN DATA USER
        // -----------------------------------------------------

        setUserRole(profile.role);
        setUserName(
          profile.full_name ||
            user.email?.split("@")[0] ||
            "Employee"
        );

        // -----------------------------------------------------
        // AMBIL NAMA PERUSAHAAN
        // -----------------------------------------------------

        if (profile?.companies) {
          const companyData = profile.companies as any;

          setCompanyName(
            companyData.name || "Company Attendance"
          );
        }

        // =====================================================
        // PENTING:
        // DASHBOARD INI KHUSUS EMPLOYEE
        // =====================================================

        if (profile.role === "admin") {
          router.push("/admin/dashboard");
          return;
        }

        if (profile.role === "owner") {
          router.push("/owner/dashboard");
          return;
        }

        // =====================================================
        // TANGGAL HARI INI
        // =====================================================

        const todayStr = new Date()
          .toISOString()
          .split("T")[0];

        // =====================================================
        // CEK HARI LIBUR
        // =====================================================

        const { data: holidayData, error: holidayError } =
          await supabase
            .from("holidays")
            .select("description")
            .eq("date", todayStr)
            .maybeSingle();

        if (holidayError) {
          console.error(
            "Holiday Error:",
            holidayError
          );
        }

        if (holidayData) {
          setIsTodayHoliday(true);
          setHolidayDesc(holidayData.description);
        }

        // =====================================================
        // AMBIL ABSENSI HARI INI
        // =====================================================

        const {
          data: myTodayAttendance,
          error: todayError,
        } = await supabase
          .from("attendance")
          .select("*")
          .eq("profile_id", user.id)
          .gte(
            "created_at",
            `${todayStr}T00:00:00Z`
          )
          .lte(
            "created_at",
            `${todayStr}T23:59:59Z`
          )
          .maybeSingle();

        if (todayError) {
          console.error(
            "Today's Attendance Error:",
            todayError
          );
        }

        if (myTodayAttendance) {
          setTodayAttendanceId(
            myTodayAttendance.id
          );

          setHasCheckedIn(
            !!myTodayAttendance.check_in
          );

          setHasCheckedOut(
            !!myTodayAttendance.check_out
          );

          setTodayStatus(
            myTodayAttendance.status
          );
        }

        // =====================================================
        // AMBIL RIWAYAT ABSENSI KARYAWAN
        // =====================================================

        const {
          data: myHistory,
          error: historyError,
        } = await supabase
          .from("attendance")
          .select(
            "created_at, status, check_in"
          )
          .eq("profile_id", user.id)
          .order("created_at", {
            ascending: false,
          })
          .limit(30);

        if (historyError) {
          console.error(
            "History Error:",
            historyError
          );
        }

        setMyAttendanceHistory(
          myHistory ?? []
        );
      } catch (error) {
        console.error(
          "Dashboard Error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [router]);

  // =========================================================
  // HUBUNGKAN STREAM CAMERA KE VIDEO
  // =========================================================

  useEffect(() => {
    if (
      isCameraActive &&
      videoRef.current &&
      mediaStream
    ) {
      videoRef.current.srcObject =
        mediaStream;
    }
  }, [isCameraActive, mediaStream]);

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = async () => {
    stopCamera();

    await supabase.auth.signOut();

    router.push("/login");
  };

  // =========================================================
  // START CAMERA
  // =========================================================

  const startCamera = async () => {
    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
          },
          audio: false,
        });

      setMediaStream(stream);
      setIsCameraActive(true);

      setPhoto(null);
      setPhotoPreview(null);

      // -----------------------------------------------------
      // AMBIL LOKASI GPS
      // -----------------------------------------------------

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setEmployeeLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          () => {
            console.warn(
              "GPS belum aktif/diizinkan"
            );
          }
        );
      }
    } catch (err) {
      console.error(err);

      alert(
        "Gagal mengakses kamera! Pastikan izin kamera telah diberikan di browser."
      );
    }
  };

  // =========================================================
  // AMBIL FOTO
  // =========================================================

  const takePhoto = () => {
    if (
      videoRef.current &&
      canvasRef.current
    ) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context =
        canvas.getContext("2d");

      if (context) {
        // Mirror foto agar seperti kamera depan
        context.translate(
          canvas.width,
          0
        );

        context.scale(-1, 1);

        context.drawImage(
          video,
          0,
          0,
          canvas.width,
          canvas.height
        );

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File(
                [blob],
                "selfie-live.jpg",
                {
                  type: "image/jpeg",
                }
              );

              setPhoto(file);

              setPhotoPreview(
                URL.createObjectURL(file)
              );

              stopCamera();
            }
          },
          "image/jpeg",
          0.8
        );
      }
    }
  };

  // =========================================================
  // STOP CAMERA
  // =========================================================

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream
        .getTracks()
        .forEach((track) =>
          track.stop()
        );
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setMediaStream(null);
    setIsCameraActive(false);
  };

  // =========================================================
  // ULANGI FOTO
  // =========================================================

  const retakePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);

    startCamera();
  };

  // =========================================================
  // SUBMIT ABSENSI
  // =========================================================

  const submitAttendance = async (
    type: "check_in" | "check_out"
  ) => {
    setIsTakingAttendance(true);

    try {
      const now =
        new Date().toISOString();

      const currentHour =
        new Date().getHours();

      // =====================================================
      // CHECK IN
      // =====================================================

      if (type === "check_in") {
        // ---------------------------------------------------
        // SAKIT / IZIN
        // ---------------------------------------------------

        if (
          attendanceTab === "sakit" ||
          attendanceTab === "izin"
        ) {
          if (!reasonText.trim()) {
            alert(
              `Keterangan ${attendanceTab} tidak boleh kosong!`
            );

            setIsTakingAttendance(false);

            return;
          }

          const { error } =
            await supabase
              .from("attendance")
              .insert({
                profile_id: userId,
                status: attendanceTab,
                reason: reasonText,
                check_in: now,
                approval_status: "pending",
              })
              .select()
              .single();

          if (error) {
            throw error;
          }

          alert(
            `✅ Berhasil mengirim pengajuan ${attendanceTab}! Semoga hari Anda lancar.`
          );

          window.location.reload();

          return;
        }

        // ---------------------------------------------------
        // HADIR
        // ---------------------------------------------------

        if (
          !photo ||
          !employeeLocation
        ) {
          alert(
            "Foto dan Lokasi GPS wajib ada sebelum absen!"
          );

          setIsTakingAttendance(false);

          return;
        }

        // ---------------------------------------------------
        // UPLOAD FOTO
        // ---------------------------------------------------

        const fileExt = photo.name
          ? photo.name.split(".").pop()
          : "jpg";

        const fileName = `${userId}-${type}-${Date.now()}.${fileExt}`;

        const {
          error: uploadError,
        } = await supabase.storage
          .from("attendances")
          .upload(
            fileName,
            photo
          );

        if (uploadError) {
          alert(
            `❌ Gagal Upload Foto: ${uploadError.message}`
          );

          setIsTakingAttendance(false);

          return;
        }

        // ---------------------------------------------------
        // PUBLIC URL FOTO
        // ---------------------------------------------------

        const {
          data: publicUrlData,
        } = supabase.storage
          .from("attendances")
          .getPublicUrl(
            fileName
          );

        // ---------------------------------------------------
        // STATUS ABSEN
        // Sebelum jam 09 = present
        // Jam 09 ke atas = late
        // ---------------------------------------------------

        const attStatus =
          currentHour >= 9
            ? "late"
            : "present";

        // ---------------------------------------------------
        // SIMPAN ABSENSI
        // ---------------------------------------------------

        const { error } =
          await supabase
            .from("attendance")
            .insert({
              profile_id: userId,
              status: attStatus,
              check_in: now,
              photo_check_in:
                publicUrlData.publicUrl,
              approval_status:
                "pending",
              latitude:
                employeeLocation.lat,
              longitude:
                employeeLocation.lng,
            })
            .select()
            .single();

        if (error) {
          throw error;
        }

        alert(
          "✅ Berhasil Check-In!"
        );

        window.location.reload();

        return;
      }

      // =====================================================
      // CHECK OUT
      // =====================================================

      if (
        !photo ||
        !employeeLocation
      ) {
        alert(
          "Foto dan Lokasi GPS wajib ada sebelum absen pulang!"
        );

        setIsTakingAttendance(false);

        return;
      }

      if (!todayAttendanceId) {
        alert(
          "❌ ID Absensi hari ini tidak ditemukan"
        );

        setIsTakingAttendance(false);

        return;
      }

      // -----------------------------------------------------
      // UPLOAD FOTO CHECK OUT
      // -----------------------------------------------------

      const fileExt = photo.name
        ? photo.name.split(".").pop()
        : "jpg";

      const fileName = `${userId}-${type}-${Date.now()}.${fileExt}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from("attendances")
        .upload(
          fileName,
          photo
        );

      if (uploadError) {
        throw uploadError;
      }

      // -----------------------------------------------------
      // PUBLIC URL FOTO
      // -----------------------------------------------------

      const {
        data: publicUrlData,
      } = supabase.storage
        .from("attendances")
        .getPublicUrl(
          fileName
        );

      // -----------------------------------------------------
      // UPDATE ABSENSI
      // -----------------------------------------------------

      const { error } =
        await supabase
          .from("attendance")
          .update({
            check_out: now,
            photo_check_out:
              publicUrlData.publicUrl,
            latitude_out:
              employeeLocation.lat,
            longitude_out:
              employeeLocation.lng,
          })
          .eq(
            "id",
            todayAttendanceId
          );

      if (error) {
        throw error;
      }

      alert(
        "✅ Berhasil Check-Out!"
      );

      window.location.reload();
    } catch (error: any) {
      console.error(
        "Catch Error:",
        error
      );

      alert(
        `❌ Error Sistem: ${
          error.message ||
          JSON.stringify(error)
        }`
      );
    }

    setIsTakingAttendance(false);
  };

  // =========================================================
  // STATISTIK KARYAWAN
  // =========================================================

  let myPresentCount = 0;
  let myLateCount = 0;
  let mySickCount = 0;
  let myLeaveCount = 0;
  let myAbsentCount = 0;

  myAttendanceHistory.forEach(
    (att) => {
      if (
        att.status === "present"
      ) {
        myPresentCount++;
      }

      if (
        att.status === "late"
      ) {
        myLateCount++;
      }

      if (
        att.status === "sakit"
      ) {
        mySickCount++;
      }

      if (
        att.status === "izin"
      ) {
        myLeaveCount++;
      }

      if (
        att.status === "absent"
      ) {
        myAbsentCount++;
      }
    }
  );

  const myTotalMasuk =
    myPresentCount +
    myLateCount;

  // =========================================================
  // DATA GRAFIK
  // =========================================================

  const chartData =
    myAttendanceHistory
      .filter(
        (item) =>
          item.check_in &&
          (
            item.status ===
              "present" ||
            item.status ===
              "late"
          )
      )
      .map((item) => {
        const dateObj =
          new Date(
            item.check_in
          );

        const hours =
          dateObj.getHours() +
          dateObj.getMinutes() /
            60;

        return {
          tanggal:
            dateObj.toLocaleDateString(
              "id-ID",
              {
                day: "numeric",
                month: "short",
              }
            ),

          jamDesimal:
            parseFloat(
              hours.toFixed(2)
            ),

          waktuAsli:
            dateObj.toLocaleTimeString(
              "id-ID",
              {
                hour: "2-digit",
                minute: "2-digit",
              }
            ),

          status:
            item.status,
        };
      })
      .reverse();

  // =========================================================
  // CUSTOM TOOLTIP GRAFIK
  // =========================================================

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: any) => {
    if (
      active &&
      payload &&
      payload.length
    ) {
      return (
        <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-lg">
          <p className="font-bold text-gray-800">
            {label}
          </p>

          <p className="text-sm font-semibold text-blue-600">
            Jam Masuk:{" "}
            {
              payload[0].payload
                .waktuAsli
            }
          </p>

          <p className="mt-1 text-xs text-gray-500 capitalize">
            Status:{" "}
            {
              payload[0].payload
                .status
            }
          </p>
        </div>
      );
    }

    return null;
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fb]">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6">
          <div className="flex flex-col items-center gap-5">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
              <div className="absolute inset-3 rounded-full bg-white shadow-sm" />
            </div>
            <div className="text-center">
              <p className="text-sm font-black tracking-wide text-slate-800">Menyiapkan dashboard</p>
              <p className="mt-1 text-xs text-slate-400">Memuat data absensi kamu...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // STATUS ABSENSI SELESAI
  // =========================================================

  const isAttendanceDone =
    hasCheckedOut ||
    todayStatus === "sakit" ||
    todayStatus === "izin";

  const statusLabel =
    todayStatus === "late"
      ? "Terlambat"
      : todayStatus === "present"
        ? "Hadir"
        : todayStatus === "sakit"
          ? "Sakit"
          : todayStatus === "izin"
            ? "Izin"
            : "Belum Absen";

  const todayTime = myAttendanceHistory[0]?.check_in
    ? new Date(myAttendanceHistory[0].check_in).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const StatCard = ({
    label,
    value,
    caption,
    tone,
    icon,
  }: {
    label: string;
    value: number;
    caption: string;
    tone: "blue" | "green" | "orange" | "purple" | "red";
    icon: string;
  }) => {
    const tones = {
      blue: "bg-blue-50 text-blue-600 ring-blue-100",
      green: "bg-emerald-50 text-emerald-600 ring-emerald-100",
      orange: "bg-orange-50 text-orange-600 ring-orange-100",
      purple: "bg-violet-50 text-violet-600 ring-violet-100",
      red: "bg-red-50 text-red-600 ring-red-100",
    };

    return (
      <div className="group relative overflow-hidden rounded-[26px] border border-slate-200/70 bg-white p-5 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.28)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_-25px_rgba(15,23,42,0.35)]">
        <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-slate-50 transition-transform duration-500 group-hover:scale-150" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">
              {value}
              <span className="ml-1 text-xs font-bold text-slate-400">{caption}</span>
            </p>
          </div>
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${tones[tone]}`}>
            <span className="text-lg">{icon}</span>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================
  // DASHBOARD KARYAWAN
  // =========================================================

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f7fb] pb-14 text-slate-900">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-indigo-200/25 blur-3xl" />
      </div>

      {/* =====================================================
          HEADER
      ===================================================== */}
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-lg font-black text-white shadow-lg shadow-blue-500/25">
              {companyName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-black tracking-tight text-slate-900 sm:text-base">
                {companyName}
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Employee Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden text-right sm:block">
              <p className="max-w-40 truncate text-sm font-extrabold capitalize text-slate-800">
                {userName}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                ● Employee
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-extrabold text-slate-600 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 sm:px-4"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        {/* ===================================================
            HERO
        =================================================== */}
        <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0f172a] via-[#172554] to-[#1d4ed8] p-6 text-white shadow-[0_25px_70px_-30px_rgba(30,64,175,0.55)] sm:p-8">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-400/20 blur-2xl" />
          <div className="absolute -bottom-24 left-1/3 h-60 w-60 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="absolute right-7 top-7 hidden h-20 w-20 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl sm:block" />

          <div className="relative z-10 grid gap-7 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-blue-100 backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
                Sistem Absensi Aktif
              </div>
              <p className="text-sm font-medium text-blue-100">Selamat datang kembali,</p>
              <h2 className="mt-1 max-w-xl text-3xl font-black tracking-tight sm:text-4xl">
                {userName}
                <span className="text-blue-300">.</span>
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-blue-100/75">
                Pantau kehadiran, lakukan absensi, dan lihat performa kedatangan kamu dalam satu dashboard.
              </p>
            </div>

            <div className="min-w-[190px] rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-200">Hari ini</p>
              <p className="mt-2 text-lg font-extrabold capitalize">
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                    isAttendanceDone
                      ? "bg-emerald-400/15 text-emerald-200"
                      : "bg-amber-400/15 text-amber-200"
                  }`}
                >
                  {isAttendanceDone ? "ABSENSI SELESAI" : "BELUM SELESAI"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================
            ABSENSI HARI INI
        =================================================== */}
        <section className="overflow-hidden rounded-[30px] border border-slate-200/70 bg-white shadow-[0_16px_50px_-30px_rgba(15,23,42,0.3)]">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                  <h2 className="text-lg font-black tracking-tight text-slate-900">Absensi Hari Ini</h2>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Verifikasi kehadiran menggunakan foto langsung dan lokasi GPS.
                </p>
              </div>

              {todayStatus && (
                <div
                  className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-black ${
                    todayStatus === "present"
                      ? "bg-emerald-50 text-emerald-600"
                      : todayStatus === "late"
                        ? "bg-amber-50 text-amber-600"
                        : todayStatus === "sakit"
                          ? "bg-orange-50 text-orange-600"
                          : "bg-violet-50 text-violet-600"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {statusLabel}
                  {todayTime && ` • ${todayTime}`}
                </div>
              )}
            </div>
          </div>

          <div className="p-5 sm:p-7">
            {isTodayHoliday ? (
              <div className="relative overflow-hidden rounded-[26px] border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">🏖️</div>
                <h3 className="text-2xl font-black text-slate-900">Hari Ini Libur</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{holidayDesc}</p>
                <span className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-[10px] font-black uppercase tracking-wider text-blue-600 shadow-sm">
                  Form Absensi Dinonaktifkan
                </span>
              </div>
            ) : hasCheckedIn && isAttendanceDone ? (
              <div
                className={`relative overflow-hidden rounded-[26px] border p-7 ${
                  todayStatus === "sakit"
                    ? "border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50"
                    : todayStatus === "izin"
                      ? "border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50"
                      : "border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50"
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
                    {todayStatus === "sakit" ? "🤒" : todayStatus === "izin" ? "📝" : "✓"}
                  </div>
                  <h3 className="text-xl font-black text-slate-900">
                    {todayStatus === "sakit"
                      ? "Semoga lekas sembuh!"
                      : todayStatus === "izin"
                        ? "Pengajuan Izin Tercatat"
                        : "Absensi hari ini selesai!"}
                  </h3>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
                    {todayStatus === "sakit" || todayStatus === "izin"
                      ? `Data ketidakhadiran dengan alasan ${todayStatus} telah terkirim dan menunggu proses HRD.`
                      : "Terima kasih sudah menyelesaikan absensi. Semoga harimu berjalan dengan lancar!"}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                {!hasCheckedIn && (
                  <div className="mx-auto mb-6 grid w-full max-w-lg grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1.5">
                    {[
                      { id: "hadir" as const, label: "Hadir", icon: "🏢", active: "text-blue-600" },
                      { id: "sakit" as const, label: "Sakit", icon: "🤒", active: "text-orange-600" },
                      { id: "izin" as const, label: "Izin", icon: "📝", active: "text-violet-600" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setAttendanceTab(tab.id)}
                        className={`rounded-xl px-2 py-3 text-xs font-black transition-all ${
                          attendanceTab === tab.id
                            ? `bg-white ${tab.active} shadow-sm`
                            : "text-slate-400 hover:text-slate-700"
                        }`}
                      >
                        <span className="mr-1">{tab.icon}</span>
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}

                {!hasCheckedIn && attendanceTab !== "hadir" ? (
                  <div className="mx-auto max-w-lg rounded-[26px] border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
                    <div className="mb-5 flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
                        {attendanceTab === "sakit" ? "🤒" : "📝"}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900">
                          Pengajuan {attendanceTab === "sakit" ? "Sakit" : "Izin"}
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          Jelaskan alasan dengan singkat dan jelas agar mudah diproses.
                        </p>
                      </div>
                    </div>

                    <textarea
                      value={reasonText}
                      onChange={(e) => setReasonText(e.target.value)}
                      placeholder={`Tuliskan alasan kenapa Anda ${attendanceTab} hari ini...`}
                      className="min-h-32 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                      rows={4}
                    />

                    <button
                      onClick={() => submitAttendance("check_in")}
                      disabled={isTakingAttendance || !reasonText.trim()}
                      className={`mt-4 w-full rounded-2xl py-3.5 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 ${
                        attendanceTab === "sakit"
                          ? "bg-gradient-to-r from-orange-500 to-amber-500 shadow-orange-500/20"
                          : "bg-gradient-to-r from-violet-600 to-purple-600 shadow-violet-500/20"
                      }`}
                    >
                      {isTakingAttendance ? "Memproses..." : `Kirim Pengajuan ${attendanceTab === "sakit" ? "Sakit" : "Izin"}`}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* CAMERA */}
                    <div className="mx-auto w-full max-w-md">
                      <div className="relative aspect-[4/3] overflow-hidden rounded-[30px] border-4 border-white bg-slate-950 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.5)] ring-1 ring-slate-200">
                        <canvas ref={canvasRef} className="hidden" />

                        {photoPreview ? (
                          <div className="relative h-full w-full">
                            <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 pt-14">
                              <button
                                onClick={retakePhoto}
                                className="mx-auto flex items-center gap-2 rounded-full border border-white/20 bg-white/90 px-5 py-2.5 text-xs font-black text-slate-800 shadow-xl backdrop-blur-md transition hover:scale-105"
                              >
                                🔄 Ambil Ulang Foto
                              </button>
                            </div>
                            <div className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-[10px] font-black text-white backdrop-blur-md">
                              ✓ FOTO TERVERIFIKASI
                            </div>
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
                              <div className="absolute inset-6 rounded-[28px] border border-white/25" />
                              <div className="absolute left-1/2 top-1/2 h-56 w-44 -translate-x-1/2 -translate-y-1/2 rounded-[45%] border-2 border-white/30" />
                              <div className="absolute left-1/2 top-1/2 h-px w-44 -translate-x-1/2 bg-white/20" />
                            </div>
                            <div className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1.5 text-[10px] font-black text-white backdrop-blur-md">
                              ● LIVE CAMERA
                            </div>
                            <button
                              onClick={takePhoto}
                              className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border-4 border-white/80 bg-white px-6 py-3 text-xs font-black text-blue-700 shadow-2xl transition hover:scale-105"
                            >
                              <span className="text-base">📸</span> AMBIL FOTO
                            </button>
                          </div>
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-7 text-center">
                            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[24px] bg-white text-3xl shadow-sm ring-1 ring-blue-100">
                              📷
                            </div>
                            <h3 className="text-lg font-black text-slate-900">Verifikasi Wajah</h3>
                            <p className="mt-2 max-w-xs text-xs leading-5 text-slate-400">
                              Ambil foto secara langsung. Upload dari galeri dinonaktifkan untuk menjaga validitas absensi.
                            </p>
                            <button
                              onClick={startCamera}
                              className="mt-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-xs font-black text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:shadow-xl"
                            >
                              Aktifkan Kamera
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex justify-center">
                        {employeeLocation ? (
                          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-[10px] font-black text-emerald-600">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
                            GPS TERVERIFIKASI
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-bold text-slate-400">
                            📍 Izinkan akses lokasi GPS
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mx-auto mt-6 flex max-w-md flex-col gap-3">
                      {!hasCheckedIn && (
                        <button
                          onClick={() => submitAttendance("check_in")}
                          disabled={isTakingAttendance || !photo || !employeeLocation}
                          className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isTakingAttendance ? "Memproses..." : "✓ Kirim Absen Masuk"}
                        </button>
                      )}

                      {hasCheckedIn && !hasCheckedOut && (
                        <button
                          onClick={() => submitAttendance("check_out")}
                          disabled={isTakingAttendance || !photo || !employeeLocation}
                          className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-8 py-4 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isTakingAttendance ? "Memproses..." : "↗ Kirim Absen Pulang"}
                        </button>
                      )}
                    </div>

                    {!photo && (
                      <p className="mt-3 text-center text-[10px] font-semibold text-slate-400">
                        Foto dan GPS wajib tersedia sebelum tombol absensi aktif.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ===================================================
            QUICK LINK
        =================================================== */}
        <Link
          href="/my-attendance"
          className="group flex items-center justify-between overflow-hidden rounded-[26px] border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/10 sm:px-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-lg shadow-sm">📅</div>
            <div>
              <p className="text-sm font-black text-slate-900">Riwayat Absensi</p>
              <p className="text-[11px] text-slate-400">Lihat seluruh rekam kehadiran kamu</p>
            </div>
          </div>
          <span className="text-lg font-black text-blue-600 transition-transform group-hover:translate-x-1">→</span>
        </Link>

        {/* ===================================================
            STATISTIK
        =================================================== */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Performance</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">Ringkasan Kehadiran</h2>
            </div>
            <span className="hidden text-[10px] font-bold text-slate-400 sm:block">30 aktivitas terakhir</span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <StatCard label="Total Masuk" value={myTotalMasuk} caption="Hari" tone="blue" icon="↗" />
            <StatCard label="Tepat Waktu" value={myPresentCount} caption="Hari" tone="green" icon="✓" />
            <StatCard label="Terlambat" value={myLateCount} caption="Hari" tone="orange" icon="◷" />
            <StatCard label="Sakit / Izin" value={mySickCount + myLeaveCount} caption="Hari" tone="purple" icon="✦" />
          </div>
        </section>

        {/* ===================================================
            DETAIL + CHART
        =================================================== */}
        <section className="grid gap-5 lg:grid-cols-[0.8fr_1.7fr]">
          <div className="rounded-[30px] border border-slate-200/70 bg-white p-6 shadow-[0_16px_50px_-30px_rgba(15,23,42,0.3)] sm:p-7">
            <div className="mb-6">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Attendance rate</p>
              <h3 className="mt-1 text-lg font-black text-slate-900">Detail Statistik</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl bg-emerald-50/70 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">✓</span>
                  <div>
                    <p className="text-xs font-black text-slate-800">Tepat Waktu</p>
                    <p className="text-[10px] text-slate-400">Sebelum pukul 09:00</p>
                  </div>
                </div>
                <p className="text-2xl font-black text-emerald-600">{myPresentCount}</p>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-amber-50/70 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">◷</span>
                  <div>
                    <p className="text-xs font-black text-slate-800">Terlambat</p>
                    <p className="text-[10px] text-slate-400">Pukul 09:00 atau setelahnya</p>
                  </div>
                </div>
                <p className="text-2xl font-black text-amber-600">{myLateCount}</p>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-red-50/60 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-red-500 shadow-sm">!</span>
                  <div>
                    <p className="text-xs font-black text-slate-800">Alpa</p>
                    <p className="text-[10px] text-slate-400">Tidak ada catatan kehadiran</p>
                  </div>
                </div>
                <p className="text-2xl font-black text-red-500">{myAbsentCount}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sakit</p>
                  <p className="mt-1 text-xl font-black text-orange-500">{mySickCount}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Izin</p>
                  <p className="mt-1 text-xl font-black text-violet-600">{myLeaveCount}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-[30px] border border-slate-200/70 bg-white p-6 shadow-[0_16px_50px_-30px_rgba(15,23,42,0.3)] sm:p-7">
            <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Attendance analytics</p>
                <h3 className="mt-1 text-lg font-black text-slate-900">Tren Waktu Kedatangan</h3>
                <p className="mt-1 text-xs text-slate-400">Perubahan jam masuk dalam beberapa hari terakhir.</p>
              </div>
              <div className="w-fit rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-black text-blue-600">
                {chartData.length} DATA
              </div>
            </div>

            {chartData.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 8, left: -18, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#eef2f7" />
                    <XAxis
                      dataKey="tanggal"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      dy={10}
                    />
                    <YAxis
                      domain={["dataMin - 1", "dataMax + 1"]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      tickFormatter={(val) => `${Math.floor(val)}:00`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="jamDesimal"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, fill: "#fff", stroke: "#2563eb" }}
                      activeDot={{ r: 7, stroke: "#fff", strokeWidth: 3, fill: "#2563eb" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-72 flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">📈</div>
                <p className="text-sm font-black text-slate-700">Belum ada data grafik</p>
                <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">
                  Riwayat jam masuk akan muncul di sini setelah kamu melakukan absensi.
                </p>
              </div>
            )}
          </div>
        </section>

        <footer className="pb-2 pt-2 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">
            {companyName} • Employee Attendance System
          </p>
        </footer>
      </div>
    </main>
  );
}
