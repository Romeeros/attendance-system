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
      <div className="flex min-h-screen items-center justify-center font-semibold text-blue-600">
        Loading Dashboard...
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

  // =========================================================
  // DASHBOARD KARYAWAN
  // =========================================================

  return (
    <main className="min-h-screen bg-gray-50/50 pb-12">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-8">
          <div>
            <h1 className="text-xl font-extrabold text-blue-600">
              {companyName}
            </h1>

            <p className="text-xs font-medium text-gray-400">
              Employee Portal
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold capitalize text-gray-800">
                {userName}
              </p>

              <span className="mt-0.5 inline-block rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-green-700 shadow-sm">
                Employee
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="mx-auto max-w-4xl space-y-6 px-4 pt-8">

        {/* ===================================================
            ABSENSI HARI INI
        =================================================== */}

        <div className="rounded-3xl border border-gray-100 bg-white p-6 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-gray-800">
            Absensi Hari Ini
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {new Date().toLocaleDateString(
              "id-ID",
              {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              }
            )}
          </p>

          {/* =================================================
              HARI LIBUR
          ================================================= */}

          {isTodayHoliday ? (
            <div className="mt-8 animate-in rounded-2xl border border-blue-200 bg-blue-50 p-8 text-center text-blue-800 fade-in zoom-in-95 duration-300">
              <p className="mb-3 text-5xl">
                🏖️
              </p>

              <h3 className="mb-1 text-2xl font-black">
                Hari Ini Libur!
              </h3>

              <p className="mb-4 text-sm font-medium opacity-80">
                {holidayDesc}
              </p>

              <span className="rounded-full border border-blue-100 bg-white/60 px-4 py-2 text-xs font-bold text-blue-600">
                Form Absensi Dinonaktifkan
              </span>
            </div>
          ) : hasCheckedIn &&
            isAttendanceDone ? (

            /* =================================================
               ABSENSI SELESAI
            ================================================= */

            <div
              className={`mt-8 rounded-2xl border p-6 ${
                todayStatus ===
                "sakit"
                  ? "border-orange-200 bg-orange-50 text-orange-800"
                  : todayStatus ===
                    "izin"
                  ? "border-purple-200 bg-purple-50 text-purple-800"
                  : "border-green-100 bg-green-50 text-green-700"
              }`}
            >
              <h3 className="text-xl font-bold">
                {todayStatus ===
                "sakit"
                  ? "🤒 Semoga lekas sembuh!"
                  : todayStatus ===
                    "izin"
                  ? "📝 Pengajuan Izin Tercatat"
                  : "🎉 Terima kasih!"}
              </h3>

              <p className="mt-2 text-sm font-medium">
                {todayStatus ===
                  "sakit" ||
                todayStatus ===
                  "izin"
                  ? `Data ketidakhadiran dengan alasan ${todayStatus} telah terkirim ke HRD.`
                  : "Anda sudah menyelesaikan absensi pulang hari ini. Selamat beristirahat!"}
              </p>
            </div>
          ) : (

            /* =================================================
               FORM ABSENSI
            ================================================= */

            <div className="mt-8">

              {/* =============================================
                  TAB HADIR / SAKIT / IZIN
              ============================================= */}

              {!hasCheckedIn && (
                <div className="mx-auto mb-6 flex w-full max-w-sm rounded-xl bg-gray-100 p-1.5 shadow-inner">

                  <button
                    onClick={() =>
                      setAttendanceTab(
                        "hadir"
                      )
                    }
                    className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
                      attendanceTab ===
                      "hadir"
                        ? "bg-white text-blue-600 shadow"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    🏢 Hadir
                  </button>

                  <button
                    onClick={() =>
                      setAttendanceTab(
                        "sakit"
                      )
                    }
                    className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
                      attendanceTab ===
                      "sakit"
                        ? "bg-white text-orange-500 shadow"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    🤒 Sakit
                  </button>

                  <button
                    onClick={() =>
                      setAttendanceTab(
                        "izin"
                      )
                    }
                    className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
                      attendanceTab ===
                      "izin"
                        ? "bg-white text-purple-600 shadow"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    📝 Izin
                  </button>
                </div>
              )}

              {/* =============================================
                  FORM SAKIT / IZIN
              ============================================= */}

              {!hasCheckedIn &&
              attendanceTab !==
                "hadir" ? (
                <div className="mx-auto w-full max-w-sm animate-in rounded-2xl border border-gray-100 bg-gray-50 p-5 text-left fade-in slide-in-from-bottom-4 duration-300">

                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    Keterangan / Alasan{" "}
                    {attendanceTab ===
                    "sakit"
                      ? "Sakit"
                      : "Izin"}
                  </label>

                  <textarea
                    value={
                      reasonText
                    }
                    onChange={(e) =>
                      setReasonText(
                        e.target
                          .value
                      )
                    }
                    placeholder={`Tuliskan secara detail alasan kenapa Anda ${attendanceTab} hari ini...`}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    rows={4}
                  />

                  <button
                    onClick={() =>
                      submitAttendance(
                        "check_in"
                      )
                    }
                    disabled={
                      isTakingAttendance ||
                      !reasonText.trim()
                    }
                    className={`mt-5 w-full rounded-xl py-3.5 font-bold text-white shadow-md transition disabled:opacity-50 ${
                      attendanceTab ===
                      "sakit"
                        ? "bg-orange-500 hover:bg-orange-600"
                        : "bg-purple-600 hover:bg-purple-700"
                    }`}
                  >
                    {isTakingAttendance
                      ? "Memproses..."
                      : `Kirim Pengajuan ${
                          attendanceTab ===
                          "sakit"
                            ? "Sakit"
                            : "Izin"
                        }`}
                  </button>
                </div>
              ) : (

                /* =============================================
                   KAMERA
                ============================================= */

                <>
                  <div className="relative mx-auto mb-6 flex h-[350px] w-full max-w-sm flex-col items-center justify-center overflow-hidden rounded-3xl border-4 border-gray-100 bg-black shadow-inner animate-in fade-in zoom-in-95 duration-300">

                    <canvas
                      ref={canvasRef}
                      className="hidden"
                    />

                    {/* =======================================
                        FOTO PREVIEW
                    ======================================= */}

                    {photoPreview ? (
                      <div className="relative h-full w-full">

                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            photoPreview
                          }
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />

                        <button
                          onClick={
                            retakePhoto
                          }
                          className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-5 py-2.5 text-sm font-bold text-gray-800 shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:bg-white"
                        >
                          🔄 Ulangi Foto
                        </button>
                      </div>

                    ) : isCameraActive ? (

                      /* =====================================
                         CAMERA AKTIF
                      ===================================== */

                      <div className="relative h-full w-full bg-black">

                        <video
                          ref={
                            videoRef
                          }
                          autoPlay
                          playsInline
                          muted
                          className="h-full w-full scale-x-[-1] object-cover"
                        />

                        <div className="pointer-events-none absolute inset-0 rounded-[100px] border-[40px] border-black/20" />

                        <button
                          onClick={
                            takePhoto
                          }
                          className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border-2 border-white/50 bg-blue-600 px-8 py-3 text-sm font-black text-white shadow-lg transition-all hover:scale-105 hover:bg-blue-700"
                        >
                          📸 JEPRET
                        </button>
                      </div>

                    ) : (

                      /* =====================================
                         CAMERA BELUM AKTIF
                      ===================================== */

                      <div className="flex h-full w-full flex-col items-center justify-center bg-gray-50 p-6 text-center">

                        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-3xl">
                          📷
                        </div>

                        <h3 className="mb-2 text-lg font-bold text-gray-800">
                          Verifikasi Wajah
                        </h3>

                        <p className="mb-6 text-xs font-medium text-gray-500">
                          Foto harus diambil
                          langsung, fitur upload
                          galeri dinonaktifkan.
                        </p>

                        <button
                          onClick={
                            startCamera
                          }
                          className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-blue-700"
                        >
                          Aktifkan Kamera
                        </button>
                      </div>
                    )}
                  </div>

                  {/* =========================================
                      STATUS GPS
                  ========================================= */}

                  {employeeLocation ? (
                    <p className="mb-6 inline-flex animate-in items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-600 fade-in zoom-in-95">
                      📍 Lokasi Terverifikasi
                    </p>
                  ) : (
                    <p className="mb-6 text-xs font-medium text-gray-400">
                      Izinkan akses lokasi GPS saat
                      kamera menyala.
                    </p>
                  )}

                  {/* =========================================
                      BUTTON ABSEN
                  ========================================= */}

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">

                    {/* CHECK IN */}

                    {!hasCheckedIn && (
                      <button
                        onClick={() =>
                          submitAttendance(
                            "check_in"
                          )
                        }
                        disabled={
                          isTakingAttendance ||
                          !photo ||
                          !employeeLocation
                        }
                        className="animate-in rounded-xl bg-blue-600 px-8 py-3.5 font-bold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50 slide-in-from-bottom-4 duration-300"
                      >
                        {isTakingAttendance
                          ? "Memproses..."
                          : "1. Kirim Absen Masuk"}
                      </button>
                    )}

                    {/* CHECK OUT */}

                    {hasCheckedIn &&
                      !hasCheckedOut && (
                        <button
                          onClick={() =>
                            submitAttendance(
                              "check_out"
                            )
                          }
                          disabled={
                            isTakingAttendance ||
                            !photo ||
                            !employeeLocation
                          }
                          className="animate-in rounded-xl bg-orange-500 px-8 py-3.5 font-bold text-white shadow-md transition hover:bg-orange-600 disabled:opacity-50 slide-in-from-bottom-4 duration-300"
                        >
                          {isTakingAttendance
                            ? "Memproses..."
                            : "2. Kirim Absen Pulang"}
                        </button>
                      )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ===================================================
            LINK RIWAYAT
        =================================================== */}

        <div className="mb-2 flex justify-end">
          <Link
            href="/my-attendance"
            className="inline-flex items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50 px-6 py-3 text-sm font-bold text-indigo-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-indigo-600 hover:text-white hover:shadow"
          >
            📅 Lihat Riwayat Lengkapku →
          </Link>
        </div>

        {/* ===================================================
            STATISTIK UTAMA
        =================================================== */}

        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">

          {/* TOTAL MASUK */}

          <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-500">
              Total Masuk
            </h3>

            <p className="mt-2 text-3xl font-black text-blue-600">
              {myTotalMasuk}

              <span className="ml-1 text-xs font-medium text-gray-400">
                Hari
              </span>
            </p>
          </div>

          {/* SAKIT */}

          <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-500">
              Sakit
            </h3>

            <p className="mt-2 text-3xl font-black text-orange-600">
              {mySickCount}

              <span className="ml-1 text-xs font-medium text-gray-400">
                Hari
              </span>
            </p>
          </div>

          {/* IZIN */}

          <div className="rounded-3xl border border-purple-100 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-500">
              Izin
            </h3>

            <p className="mt-2 text-3xl font-black text-purple-600">
              {myLeaveCount}

              <span className="ml-1 text-xs font-medium text-gray-400">
                Hari
              </span>
            </p>
          </div>

          {/* ALPA */}

          <div className="rounded-3xl border border-red-100 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-500">
              Alpa
            </h3>

            <p className="mt-2 text-3xl font-black text-red-600">
              {myAbsentCount}

              <span className="ml-1 text-xs font-medium text-gray-400">
                Hari
              </span>
            </p>
          </div>
        </div>

        {/* ===================================================
            DETAIL STATISTIK + GRAFIK
        =================================================== */}

        <div className="grid gap-6 md:grid-cols-3">

          {/* =================================================
              STATISTIK KIRI
          ================================================= */}

          <div className="flex flex-col gap-4 md:col-span-1">

            {/* TEPAT WAKTU */}

            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-500">
                Tepat Waktu
              </h3>

              <p className="mt-2 text-4xl font-extrabold text-green-600">
                {myPresentCount}

                <span className="ml-1 text-sm font-medium text-gray-400">
                  Hari
                </span>
              </p>
            </div>

            {/* TERLAMBAT */}

            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-500">
                Terlambat
              </h3>

              <p className="mt-2 text-4xl font-extrabold text-yellow-500">
                {myLateCount}

                <span className="ml-1 text-sm font-medium text-gray-400">
                  Hari
                </span>
              </p>
            </div>
          </div>

          {/* =================================================
              GRAFIK
          ================================================= */}

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm md:col-span-2">

            <h3 className="mb-1 text-lg font-bold text-gray-800">
              Tren Waktu Kedatangan
            </h3>

            <p className="mb-6 text-xs text-gray-500">
              Riwayat jam masuk kamu beberapa hari
              terakhir (diluar sakit/izin).
            </p>

            {chartData.length > 0 ? (
              <div className="h-64 w-full">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <LineChart
                    data={chartData}
                    margin={{
                      top: 5,
                      right: 10,
                      left: -20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f3f4f6"
                    />

                    <XAxis
                      dataKey="tanggal"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 12,
                        fill: "#9ca3af",
                      }}
                      dy={10}
                    />

                    <YAxis
                      domain={[
                        "dataMin - 1",
                        "dataMax + 1",
                      ]}
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 12,
                        fill: "#9ca3af",
                      }}
                      tickFormatter={(
                        val
                      ) =>
                        `${Math.floor(
                          val
                        )}:00`
                      }
                    />

                    <Tooltip
                      content={
                        <CustomTooltip />
                      }
                    />

                    <Line
                      type="monotone"
                      dataKey="jamDesimal"
                      stroke="#2563eb"
                      strokeWidth={4}
                      dot={{
                        r: 4,
                        strokeWidth: 2,
                        fill: "#fff",
                        stroke:
                          "#2563eb",
                      }}
                      activeDot={{
                        r: 6,
                        stroke:
                          "#2563eb",
                        strokeWidth: 2,
                        fill: "#fff",
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-400">
                  Belum ada riwayat absensi masuk
                  untuk ditampilkan.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}