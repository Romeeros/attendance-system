"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { supabase } from "@/lib/supabase";

export default function AdminDashboardPage() {
  const router = useRouter();

  // =========================================================
  // DATA USER
  // =========================================================

  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");

  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState(
    "Company Attendance"
  );

  // =========================================================
  // ABSENSI ADMIN SENDIRI
  // =========================================================

  const [todayAttendanceId, setTodayAttendanceId] =
    useState<string | null>(null);

  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [hasCheckedOut, setHasCheckedOut] = useState(false);
  const [todayStatus, setTodayStatus] = useState<string | null>(
    null
  );

  // =========================================================
  // KAMERA
  // =========================================================

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [mediaStream, setMediaStream] =
    useState<MediaStream | null>(null);

  const [isCameraActive, setIsCameraActive] =
    useState(false);

  const [photo, setPhoto] = useState<File | null>(null);

  const [photoPreview, setPhotoPreview] =
    useState<string | null>(null);

  // =========================================================
  // LOKASI
  // =========================================================

  const [adminLocation, setAdminLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [isTakingAttendance, setIsTakingAttendance] =
    useState(false);

  // =========================================================
  // TAB ABSENSI
  // =========================================================

  const [attendanceTab, setAttendanceTab] = useState<
    "hadir" | "sakit" | "izin"
  >("hadir");

  const [reasonText, setReasonText] = useState("");

  // =========================================================
  // HARI LIBUR
  // =========================================================

  const [isTodayHoliday, setIsTodayHoliday] =
    useState(false);

  const [holidayDesc, setHolidayDesc] =
    useState("");

  const [inputHolidayDate, setInputHolidayDate] =
    useState("");

  const [inputHolidayDesc, setInputHolidayDesc] =
    useState("");

  const [isSettingHoliday, setIsSettingHoliday] =
    useState(false);

  // =========================================================
  // DATA DASHBOARD
  // =========================================================

  const [employeeCount, setEmployeeCount] =
    useState(0);

  const [presentCount, setPresentCount] =
    useState(0);

  const [lateCount, setLateCount] =
    useState(0);

  const [sickCount, setSickCount] =
    useState(0);

  const [leaveCount, setLeaveCount] =
    useState(0);

  const [absentCount, setAbsentCount] =
    useState(0);

  const [recentAttendance, setRecentAttendance] =
    useState<any[]>([]);

  const [missingEmployees, setMissingEmployees] =
    useState<any[]>([]);

  // =========================================================
  // CLEANUP CAMERA
  // =========================================================

  useEffect(() => {
    return () => {
      stopCamera();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================================================
  // STOP CAMERA JIKA PINDAH TAB
  // =========================================================

  useEffect(() => {
    if (attendanceTab !== "hadir") {
      stopCamera();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendanceTab]);

  // =========================================================
  // PASANG STREAM KE VIDEO
  // =========================================================

  useEffect(() => {
    if (
      isCameraActive &&
      mediaStream &&
      videoRef.current
    ) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [isCameraActive, mediaStream]);

  // =========================================================
  // LOAD DASHBOARD
  // =========================================================

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        // -----------------------------------------------------
        // CEK LOGIN
        // -----------------------------------------------------

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        setUserId(user.id);
        setUserEmail(user.email ?? "");

        // -----------------------------------------------------
        // PROFILE ADMIN
        // -----------------------------------------------------

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("*, companies(name)")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
          console.error(
            "Profile Error:",
            profileError
          );
        }

        if (!profile) {
          router.push("/login");
          return;
        }

        // -----------------------------------------------------
        // SIMPAN DATA PROFILE
        // -----------------------------------------------------

        setUserRole(profile.role);

        setUserName(
          profile.full_name ||
            user.email?.split("@")[0] ||
            "Admin"
        );

        setCompanyId(
          profile.company_id || ""
        );

        // -----------------------------------------------------
        // NAMA COMPANY
        // -----------------------------------------------------

        if (profile.companies) {
          const companyData =
            profile.companies as any;

          setCompanyName(
            companyData.name ||
              "Company Attendance"
          );
        }

        // =====================================================
        // ROLE PROTECTION
        // =====================================================

        if (profile.role === "owner") {
          router.push(
            "/owner/dashboard"
          );

          return;
        }

        if (profile.role !== "admin") {
          router.push("/dashboard");
          return;
        }

        // =====================================================
        // COMPANY WAJIB ADA
        // =====================================================

        if (!profile.company_id) {
          setLoading(false);
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

        const { data: holidayData } =
          await supabase
            .from("holidays")
            .select("description")
            .eq("date", todayStr)
            .maybeSingle();

        if (holidayData) {
          setIsTodayHoliday(true);
          setHolidayDesc(
            holidayData.description
          );
        }

        // =====================================================
        // ABSENSI ADMIN HARI INI
        // =====================================================

        const {
          data: myTodayAttendance,
          error: myAttendanceError,
        } = await supabase
          .from("attendance")
          .select("*")
          .eq(
            "profile_id",
            user.id
          )
          .gte(
            "created_at",
            `${todayStr}T00:00:00Z`
          )
          .lte(
            "created_at",
            `${todayStr}T23:59:59Z`
          )
          .maybeSingle();

        if (myAttendanceError) {
          console.error(
            "My Attendance Error:",
            myAttendanceError
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
        // AMBIL SEMUA MEMBER COMPANY
        // OWNER TIDAK DITAMPILKAN
        // =====================================================

        const {
          data: companyProfiles,
          error: profilesError,
        } = await supabase
          .from("profiles")
          .select(
            "id, full_name, role, email"
          )
          .eq(
            "company_id",
            profile.company_id
          )
          .neq("role", "owner");

        if (profilesError) {
          console.error(
            "Company Profiles Error:",
            profilesError
          );

          setLoading(false);
          return;
        }

        const profileIds =
          companyProfiles?.map(
            (person) => person.id
          ) || [];

        // =====================================================
        // TOTAL ANGGOTA
        // =====================================================

        setEmployeeCount(
          profileIds.length
        );

        // =====================================================
        // DEFAULT SEMUA BELUM ABSEN
        // =====================================================

        let missing =
          companyProfiles || [];

        // =====================================================
        // STATISTIK
        // =====================================================

        let pCount = 0;
        let lCount = 0;
        let sCount = 0;
        let iCount = 0;
        let aCount = 0;

        // =====================================================
        // JIKA ADA PROFILE
        // =====================================================

        if (profileIds.length > 0) {
          // ---------------------------------------------------
          // ABSENSI HARI INI
          // ---------------------------------------------------

          const {
            data: todayAttendance,
            error: todayError,
          } = await supabase
            .from("attendance")
            .select(
              "profile_id, status"
            )
            .in(
              "profile_id",
              profileIds
            )
            .gte(
              "created_at",
              `${todayStr}T00:00:00Z`
            )
            .lte(
              "created_at",
              `${todayStr}T23:59:59Z`
            );

          if (todayError) {
            console.error(
              "Today Attendance Error:",
              todayError
            );
          }

          // ---------------------------------------------------
          // HITUNG STATUS
          // ---------------------------------------------------

          todayAttendance?.forEach(
            (attendance) => {
              if (
                attendance.status ===
                "present"
              ) {
                pCount++;
              }

              if (
                attendance.status ===
                "late"
              ) {
                lCount++;
              }

              if (
                attendance.status ===
                "sakit"
              ) {
                sCount++;
              }

              if (
                attendance.status ===
                "izin"
              ) {
                iCount++;
              }

              if (
                attendance.status ===
                "absent"
              ) {
                aCount++;
              }
            }
          );

          // ---------------------------------------------------
          // YANG SUDAH ABSEN
          // ---------------------------------------------------

          const attendedIds =
            todayAttendance?.map(
              (item) =>
                item.profile_id
            ) || [];

          // ---------------------------------------------------
          // YANG BELUM ABSEN
          // ---------------------------------------------------

          missing = (
            companyProfiles || []
          ).filter(
            (person) =>
              !attendedIds.includes(
                person.id
              )
          );

          // ---------------------------------------------------
          // RIWAYAT ABSENSI TERBARU
          // ---------------------------------------------------

          const {
            data: attendanceData,
            error: recentError,
          } = await supabase
            .from("attendance")
            .select(
              `
                id,
                profile_id,
                status,
                check_in,
                check_out,
                photo_check_in,
                photo_check_out,
                created_at,
                latitude,
                longitude,
                latitude_out,
                longitude_out
              `
            )
            .in(
              "profile_id",
              profileIds
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            )
            .limit(5);

          if (recentError) {
            console.error(
              "Recent Attendance Error:",
              recentError
            );
          }

          // ---------------------------------------------------
          // GABUNGKAN PROFILE
          // ---------------------------------------------------

          const merged =
            attendanceData?.map(
              (attendance) => ({
                ...attendance,

                profiles: {
                  full_name:
                    companyProfiles?.find(
                      (person) =>
                        person.id ===
                        attendance.profile_id
                    )?.full_name ||
                    "Unknown",
                },
              })
            ) || [];

          setRecentAttendance(
            merged
          );
        }

        // =====================================================
        // SET STATISTIK
        // =====================================================

        setPresentCount(pCount);

        setLateCount(lCount);

        setSickCount(sCount);

        setLeaveCount(iCount);

        setAbsentCount(aCount);

        setMissingEmployees(
          missing
        );
      } catch (error) {
        console.error(
          "Admin Dashboard Error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [router]);

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
        await navigator.mediaDevices.getUserMedia(
          {
            video: {
              facingMode: "user",
            },
            audio: false,
          }
        );

      setMediaStream(stream);

      setIsCameraActive(true);

      setPhoto(null);

      setPhotoPreview(null);

      // -----------------------------------------------------
      // GPS
      // -----------------------------------------------------

      if (
        navigator.geolocation
      ) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setAdminLocation({
              lat:
                position.coords
                  .latitude,

              lng:
                position.coords
                  .longitude,
            });
          },
          () => {
            console.warn(
              "GPS belum aktif/diizinkan"
            );
          }
        );
      }
    } catch (error) {
      console.error(error);

      alert(
        "Gagal mengakses kamera! Pastikan izin kamera telah diberikan."
      );
    }
  };

  // =========================================================
  // TAKE PHOTO
  // =========================================================

  const takePhoto = () => {
    if (
      !videoRef.current ||
      !canvasRef.current
    ) {
      return;
    }

    const video =
      videoRef.current;

    const canvas =
      canvasRef.current;

    canvas.width =
      video.videoWidth;

    canvas.height =
      video.videoHeight;

    const context =
      canvas.getContext("2d");

    if (!context) {
      return;
    }

    // Mirror foto
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
        if (!blob) {
          return;
        }

        const file = new File(
          [blob],
          "admin-selfie.jpg",
          {
            type: "image/jpeg",
          }
        );

        setPhoto(file);

        setPhotoPreview(
          URL.createObjectURL(file)
        );

        stopCamera();
      },
      "image/jpeg",
      0.8
    );
  };

  // =========================================================
  // STOP CAMERA
  // =========================================================

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream
        .getTracks()
        .forEach((track) => {
          track.stop();
        });
    }

    if (videoRef.current) {
      videoRef.current.srcObject =
        null;
    }

    setMediaStream(null);

    setIsCameraActive(false);
  };

  // =========================================================
  // RETAKE PHOTO
  // =========================================================

  const retakePhoto = () => {
    setPhoto(null);

    setPhotoPreview(null);

    startCamera();
  };

  // =========================================================
  // SUBMIT ABSENSI ADMIN
  // =========================================================

  const submitAttendance = async (
    type:
      | "check_in"
      | "check_out"
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

      if (
        type === "check_in"
      ) {
        // ---------------------------------------------------
        // SAKIT / IZIN
        // ---------------------------------------------------

        if (
          attendanceTab ===
            "sakit" ||
          attendanceTab ===
            "izin"
        ) {
          if (
            !reasonText.trim()
          ) {
            alert(
              `Keterangan ${attendanceTab} tidak boleh kosong!`
            );

            setIsTakingAttendance(
              false
            );

            return;
          }

          const {
            error,
          } = await supabase
            .from("attendance")
            .insert({
              profile_id:
                userId,

              status:
                attendanceTab,

              reason:
                reasonText,

              check_in:
                now,

              approval_status:
                "pending",
            })
            .select()
            .single();

          if (error) {
            throw error;
          }

          alert(
            `✅ Pengajuan ${attendanceTab} berhasil dikirim!`
          );

          window.location.reload();

          return;
        }

        // ---------------------------------------------------
        // HADIR
        // ---------------------------------------------------

        if (
          !photo ||
          !adminLocation
        ) {
          alert(
            "Foto dan lokasi GPS wajib ada sebelum absen!"
          );

          setIsTakingAttendance(
            false
          );

          return;
        }

        // ---------------------------------------------------
        // UPLOAD FOTO
        // ---------------------------------------------------

        const fileExt =
          photo.name
            ? photo.name
                .split(".")
                .pop()
            : "jpg";

        const fileName = `${userId}-${type}-${Date.now()}.${fileExt}`;

        const {
          error:
            uploadError,
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

          setIsTakingAttendance(
            false
          );

          return;
        }

        // ---------------------------------------------------
        // PUBLIC URL
        // ---------------------------------------------------

        const {
          data: publicUrlData,
        } = supabase.storage
          .from("attendances")
          .getPublicUrl(
            fileName
          );

        // ---------------------------------------------------
        // STATUS
        // ---------------------------------------------------

        const attendanceStatus =
          currentHour >= 9
            ? "late"
            : "present";

        // ---------------------------------------------------
        // INSERT
        // ---------------------------------------------------

        const {
          error,
        } = await supabase
          .from("attendance")
          .insert({
            profile_id:
              userId,

            status:
              attendanceStatus,

            check_in:
              now,

            photo_check_in:
              publicUrlData.publicUrl,

            approval_status:
              "pending",

            latitude:
              adminLocation.lat,

            longitude:
              adminLocation.lng,
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
        !adminLocation
      ) {
        alert(
          "Foto dan lokasi GPS wajib ada sebelum absen pulang!"
        );

        setIsTakingAttendance(
          false
        );

        return;
      }

      if (
        !todayAttendanceId
      ) {
        alert(
          "❌ Data absensi hari ini tidak ditemukan."
        );

        setIsTakingAttendance(
          false
        );

        return;
      }

      // -----------------------------------------------------
      // UPLOAD FOTO PULANG
      // -----------------------------------------------------

      const fileExt =
        photo.name
          ? photo.name
              .split(".")
              .pop()
          : "jpg";

      const fileName = `${userId}-${type}-${Date.now()}.${fileExt}`;

      const {
        error:
          uploadError,
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
      // PUBLIC URL
      // -----------------------------------------------------

      const {
        data: publicUrlData,
      } = supabase.storage
        .from("attendances")
        .getPublicUrl(
          fileName
        );

      // -----------------------------------------------------
      // UPDATE CHECK OUT
      // -----------------------------------------------------

      const {
        error,
      } = await supabase
        .from("attendance")
        .update({
          check_out:
            now,

          photo_check_out:
            publicUrlData.publicUrl,

          latitude_out:
            adminLocation.lat,

          longitude_out:
            adminLocation.lng,
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
        "Attendance Error:",
        error
      );

      alert(
        `❌ Error Sistem: ${
          error.message ||
          JSON.stringify(error)
        }`
      );
    }

    setIsTakingAttendance(
      false
    );
  };

  // =========================================================
  // TAMBAH HARI LIBUR
  // =========================================================

  const handleSetHoliday =
    async () => {
      if (
        !inputHolidayDate ||
        !inputHolidayDesc
      ) {
        alert(
          "Tanggal dan keterangan libur harus diisi!"
        );

        return;
      }

      setIsSettingHoliday(
        true
      );

      try {
        const {
          error,
        } = await supabase
          .from("holidays")
          .insert({
            date:
              inputHolidayDate,

            description:
              inputHolidayDesc,
          });

        if (error) {
          throw error;
        }

        alert(
          "✅ Hari libur berhasil ditambahkan!"
        );

        setInputHolidayDate(
          ""
        );

        setInputHolidayDesc(
          ""
        );

        window.location.reload();
      } catch (error: any) {
        console.error(error);

        alert(
          `❌ Gagal: ${error.message}`
        );
      }

      setIsSettingHoliday(
        false
      );
    };

  // =========================================================
  // DONUT CHART
  // =========================================================

  const donutData = [
    {
      name: "Tepat Waktu",
      value: presentCount,
      color: "#10b981",
    },
    {
      name: "Terlambat",
      value: lateCount,
      color: "#eab308",
    },
    {
      name: "Sakit",
      value: sickCount,
      color: "#f97316",
    },
    {
      name: "Izin",
      value: leaveCount,
      color: "#9333ea",
    },
    {
      name: "Belum Absen",
      value:
        missingEmployees.length,
      color: "#f87171",
    },
  ];

  const totalDataMasuk =
    presentCount +
    lateCount +
    sickCount +
    leaveCount;

  const isAttendanceDone =
    hasCheckedOut ||
    todayStatus === "sakit" ||
    todayStatus === "izin";

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-3 text-4xl">
            ⏳
          </div>

          <p className="font-semibold text-blue-600">
            Loading Admin Dashboard...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // COMPANY BELUM ADA
  // =========================================================

  if (!companyId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">

          <div className="mb-4 text-5xl">
            ⚠️
          </div>

          <h2 className="text-xl font-bold text-gray-800">
            Perusahaan Belum Terhubung
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Akun admin ini belum memiliki
            perusahaan yang terhubung.
          </p>

          <button
            onClick={
              handleLogout
            }
            className="mt-6 rounded-xl bg-red-50 px-6 py-3 text-sm font-bold text-red-600 hover:bg-red-100"
          >
            Logout
          </button>

        </div>
      </main>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className="min-h-screen bg-gray-50/50 pb-12">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur-md">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8">

          <div>
            <h1 className="text-xl font-extrabold text-blue-600">
              {companyName}
            </h1>

            <p className="text-xs font-medium text-gray-400">
              Admin Dashboard
            </p>
          </div>

          <div className="flex items-center gap-4">

            <div className="hidden text-right sm:block">

              <p className="text-sm font-bold capitalize text-gray-800">
                {userName}
              </p>

              <span className="mt-0.5 inline-block rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-purple-700">
                Admin
              </span>

            </div>

            <button
              onClick={
                handleLogout
              }
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

      <div className="mx-auto max-w-7xl space-y-8 px-4 pt-8 sm:px-8">

        {/* ===================================================
            ABSENSI ADMIN
        =================================================== */}

        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">

          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

            <div>
              <h2 className="text-2xl font-black text-gray-800">
                Absensi Saya
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Admin juga dapat melakukan absensi
                seperti karyawan.
              </p>
            </div>

            <div className="rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-blue-600">
              👤 {userName}
            </div>

          </div>

          {/* =================================================
              HARI LIBUR
          ================================================= */}

          {isTodayHoliday ? (

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-8 text-center">

              <div className="mb-3 text-5xl">
                🏖️
              </div>

              <h3 className="text-2xl font-black text-blue-800">
                Hari Ini Libur
              </h3>

              <p className="mt-2 text-sm text-blue-700">
                {holidayDesc}
              </p>

              <span className="mt-4 inline-block rounded-full bg-white px-4 py-2 text-xs font-bold text-blue-600">
                Form Absensi Dinonaktifkan
              </span>

            </div>

          ) : isAttendanceDone ? (

            /* =================================================
               ABSENSI SUDAH SELESAI
            ================================================= */

            <div
              className={`rounded-2xl border p-7 text-center ${
                todayStatus ===
                "sakit"
                  ? "border-orange-200 bg-orange-50"
                  : todayStatus ===
                    "izin"
                  ? "border-purple-200 bg-purple-50"
                  : "border-green-200 bg-green-50"
              }`}
            >

              <div className="mb-3 text-4xl">
                {todayStatus ===
                "sakit"
                  ? "🤒"
                  : todayStatus ===
                    "izin"
                  ? "📝"
                  : "🎉"}
              </div>

              <h3 className="text-xl font-black text-gray-800">
                {todayStatus ===
                "sakit"
                  ? "Pengajuan Sakit Tercatat"
                  : todayStatus ===
                    "izin"
                  ? "Pengajuan Izin Tercatat"
                  : "Absensi Hari Ini Selesai"}
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                {todayStatus ===
                  "sakit" ||
                todayStatus ===
                  "izin"
                  ? `Data ${todayStatus} sudah dikirim.`
                  : "Anda sudah melakukan check-in dan check-out hari ini."}
              </p>

            </div>

          ) : (

            <div>

              {/* =============================================
                  TAB
              ============================================= */}

              {!hasCheckedIn && (
                <div className="mx-auto mb-6 flex max-w-md rounded-xl bg-gray-100 p-1.5">

                  <button
                    onClick={() =>
                      setAttendanceTab(
                        "hadir"
                      )
                    }
                    className={`flex-1 rounded-lg py-3 text-sm font-bold ${
                      attendanceTab ===
                      "hadir"
                        ? "bg-white text-blue-600 shadow"
                        : "text-gray-500"
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
                    className={`flex-1 rounded-lg py-3 text-sm font-bold ${
                      attendanceTab ===
                      "sakit"
                        ? "bg-white text-orange-500 shadow"
                        : "text-gray-500"
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
                    className={`flex-1 rounded-lg py-3 text-sm font-bold ${
                      attendanceTab ===
                      "izin"
                        ? "bg-white text-purple-600 shadow"
                        : "text-gray-500"
                    }`}
                  >
                    📝 Izin
                  </button>

                </div>
              )}

              {/* =============================================
                  SAKIT / IZIN
              ============================================= */}

              {!hasCheckedIn &&
              attendanceTab !==
                "hadir" ? (

                <div className="mx-auto max-w-md rounded-2xl border border-gray-100 bg-gray-50 p-6">

                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    Keterangan{" "}
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
                    rows={4}
                    placeholder={`Tuliskan alasan ${attendanceTab}...`}
                    className="w-full rounded-xl border border-gray-300 p-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
                    className={`mt-4 w-full rounded-xl py-3.5 font-bold text-white disabled:opacity-50 ${
                      attendanceTab ===
                      "sakit"
                        ? "bg-orange-500 hover:bg-orange-600"
                        : "bg-purple-600 hover:bg-purple-700"
                    }`}
                  >
                    {isTakingAttendance
                      ? "Mengirim..."
                      : `Kirim ${attendanceTab}`}
                  </button>

                </div>

              ) : (

                /* =============================================
                   KAMERA HADIR
                ============================================= */

                <div className="flex flex-col items-center">

                  <div className="relative mb-5 h-[350px] w-full max-w-md overflow-hidden rounded-3xl border-4 border-gray-100 bg-black shadow-inner">

                    <canvas
                      ref={
                        canvasRef
                      }
                      className="hidden"
                    />

                    {/* FOTO */}

                    {photoPreview ? (

                      <div className="relative h-full w-full">

                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            photoPreview
                          }
                          alt="Preview absensi admin"
                          className="h-full w-full object-cover"
                        />

                        <button
                          onClick={
                            retakePhoto
                          }
                          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white px-6 py-3 text-sm font-bold text-gray-800 shadow-lg"
                        >
                          🔄 Ulangi Foto
                        </button>

                      </div>

                    ) : isCameraActive ? (

                      /* CAMERA AKTIF */

                      <div className="relative h-full w-full">

                        <video
                          ref={
                            videoRef
                          }
                          autoPlay
                          playsInline
                          muted
                          className="h-full w-full scale-x-[-1] object-cover"
                        />

                        <button
                          onClick={
                            takePhoto
                          }
                          className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-9 py-3 font-black text-white shadow-lg"
                        >
                          📸 JEPRET
                        </button>

                      </div>

                    ) : (

                      /* KAMERA BELUM AKTIF */

                      <div className="flex h-full flex-col items-center justify-center bg-gray-50 p-6 text-center">

                        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-3xl">
                          📷
                        </div>

                        <h3 className="text-lg font-bold text-gray-800">
                          Verifikasi Absensi
                        </h3>

                        <p className="mb-6 mt-2 max-w-xs text-xs text-gray-500">
                          Foto harus diambil langsung
                          menggunakan kamera.
                        </p>

                        <button
                          onClick={
                            startCamera
                          }
                          className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
                        >
                          Aktifkan Kamera
                        </button>

                      </div>
                    )}

                  </div>

                  {/* GPS */}

                  {adminLocation ? (

                    <div className="mb-5 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-bold text-green-600">
                      📍 Lokasi Terverifikasi
                    </div>

                  ) : (

                    <p className="mb-5 text-xs text-gray-400">
                      Izinkan akses lokasi GPS
                      saat kamera aktif.
                    </p>

                  )}

                  {/* BUTTON */}

                  <div className="flex flex-col gap-3 sm:flex-row">

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
                          !adminLocation
                        }
                        className="rounded-xl bg-blue-600 px-8 py-3.5 font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isTakingAttendance
                          ? "Memproses..."
                          : "Kirim Absen Masuk"}
                      </button>
                    )}

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
                            !adminLocation
                          }
                          className="rounded-xl bg-orange-500 px-8 py-3.5 font-bold text-white shadow-md hover:bg-orange-600 disabled:opacity-50"
                        >
                          {isTakingAttendance
                            ? "Memproses..."
                            : "Kirim Absen Pulang"}
                        </button>
                      )}

                  </div>

                </div>
              )}
            </div>
          )}
        </section>

        {/* ===================================================
            STATISTIK UTAMA
        =================================================== */}

        <section>

          <div className="mb-5">
            <h2 className="text-2xl font-black text-gray-800">
              Monitoring Kehadiran
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Pantau kehadiran anggota perusahaan
              hari ini.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">

            {/* TOTAL */}

            <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-3xl font-black text-gray-800">
                {employeeCount}
              </h3>

              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                Total Anggota
              </p>
            </div>

            {/* TEPAT WAKTU */}

            <div className="rounded-3xl border border-green-100 bg-white p-5 shadow-sm">
              <h3 className="text-3xl font-black text-green-500">
                {presentCount}
              </h3>

              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-green-600">
                Tepat Waktu
              </p>
            </div>

            {/* TERLAMBAT */}

            <div className="rounded-3xl border border-yellow-100 bg-white p-5 shadow-sm">
              <h3 className="text-3xl font-black text-yellow-500">
                {lateCount}
              </h3>

              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-yellow-600">
                Terlambat
              </p>
            </div>

            {/* SAKIT */}

            <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
              <h3 className="text-3xl font-black text-orange-500">
                {sickCount}
              </h3>

              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-orange-600">
                Sakit
              </p>
            </div>

            {/* IZIN */}

            <div className="rounded-3xl border border-purple-100 bg-white p-5 shadow-sm">
              <h3 className="text-3xl font-black text-purple-500">
                {leaveCount}
              </h3>

              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-purple-600">
                Izin
              </p>
            </div>

            {/* BELUM ABSEN */}

            <div className="rounded-3xl border border-red-100 bg-white p-5 shadow-sm">
              <h3 className="text-3xl font-black text-red-400">
                {missingEmployees.length}
              </h3>

              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-red-500">
                Belum Absen
              </p>
            </div>

          </div>
        </section>

        {/* ===================================================
            GRID MONITORING
        =================================================== */}

        <div className="grid gap-8 lg:grid-cols-3">

          {/* =================================================
              KIRI
          ================================================= */}

          <div className="space-y-8 lg:col-span-2">

            {/* REKAP */}

            <Link
              href="/rekap"
              className="flex w-full items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 py-3.5 text-sm font-bold text-indigo-600 transition hover:bg-indigo-100"
            >
              📊 Laporan Rekap Bulanan
            </Link>

            {/* =================================================
                DONUT
            ================================================= */}

            <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">

              <h3 className="text-xl font-bold text-gray-800">
                Statistik Kehadiran Hari Ini
              </h3>

              <p className="mb-6 text-sm text-gray-500">
                Proporsi seluruh status absensi
                anggota perusahaan.
              </p>

              <div className="flex flex-col items-center justify-between gap-8 sm:flex-row">

                {/* DONUT */}

                <div className="relative h-48 w-48">

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <PieChart>

                      <Pie
                        data={
                          donutData
                        }
                        innerRadius={
                          60
                        }
                        outerRadius={
                          80
                        }
                        paddingAngle={
                          5
                        }
                        dataKey="value"
                        stroke="none"
                      >

                        {donutData.map(
                          (
                            entry,
                            index
                          ) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                entry.color
                              }
                            />
                          )
                        )}

                      </Pie>

                      <Tooltip
                        formatter={(
                          value
                        ) => [
                          `${value} Karyawan`,
                          "Jumlah",
                        ]}
                        contentStyle={{
                          borderRadius:
                            "12px",
                          border: "none",
                          boxShadow:
                            "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />

                    </PieChart>
                  </ResponsiveContainer>

                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">

                    <span className="text-2xl font-black text-gray-800">
                      {
                        totalDataMasuk
                      }
                    </span>

                    <span className="text-[10px] font-bold uppercase text-gray-400">
                      Data Masuk
                    </span>

                  </div>
                </div>

                {/* LEGEND */}

                <div className="grid w-full flex-1 grid-cols-1 gap-3 sm:grid-cols-2">

                  {donutData.map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        key={
                          index
                        }
                        className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-3"
                      >

                        <div className="flex items-center gap-3">

                          <div
                            className="h-3 w-3 rounded-full"
                            style={{
                              backgroundColor:
                                item.color,
                            }}
                          />

                          <span className="text-sm font-bold text-gray-700">
                            {
                              item.name
                            }
                          </span>

                        </div>

                        <span className="text-sm font-black text-gray-900">
                          {
                            item.value
                          }

                          <span className="ml-1 text-[10px] font-medium text-gray-400">
                            Orang
                          </span>
                        </span>

                      </div>
                    )
                  )}

                </div>
              </div>
            </div>

            {/* =================================================
                RIWAYAT
            ================================================= */}

            <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">

              <div className="mb-6 flex items-center justify-between gap-4">

                <h3 className="text-xl font-bold text-gray-800">
                  Riwayat Absensi Terbaru
                </h3>

                <Link
                  href="/attendance"
                  className="rounded-full bg-blue-50 px-4 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100"
                >
                  Lihat Log Lengkap →
                </Link>

              </div>

              <div className="space-y-4">

                {recentAttendance.length ===
                0 ? (

                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
                    Belum ada data absensi.
                  </div>

                ) : (

                  recentAttendance.map(
                    (item) => {

                      const timeStr =
                        item.check_in
                          ? new Date(
                              item.check_in
                            ).toLocaleTimeString(
                              "id-ID",
                              {
                                hour: "2-digit",
                                minute:
                                  "2-digit",
                              }
                            )
                          : "--:--";

                      return (
                        <div
                          key={
                            item.id
                          }
                          className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                        >

                          <div className="flex items-center gap-4">

                            {/* FOTO */}

                            {item.photo_check_in ? (

                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={
                                  item.photo_check_in
                                }
                                alt="Foto absensi"
                                className="h-14 w-14 rounded-xl border border-gray-200 object-cover"
                              />

                            ) : (

                              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed bg-gray-100 text-xs font-bold text-gray-400">
                                No Pic
                              </div>

                            )}

                            <div>

                              <p className="text-base font-bold text-gray-900">
                                {
                                  item
                                    .profiles
                                    ?.full_name
                                }
                              </p>

                              <div className="mt-1 flex flex-wrap items-center gap-2">

                                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
                                  {item.status ===
                                    "sakit" ||
                                  item.status ===
                                    "izin"
                                    ? `Laporan: ${timeStr}`
                                    : `Masuk: ${timeStr}`}
                                </span>

                                {/* LOKASI MASUK */}

                                {item.latitude &&
                                  item.longitude && (

                                    <a
                                      href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-500"
                                    >
                                      📍 Lokasi Masuk
                                    </a>

                                  )}

                                {/* LOKASI PULANG */}

                                {item.latitude_out &&
                                  item.longitude_out && (

                                    <a
                                      href={`https://www.google.com/maps?q=${item.latitude_out},${item.longitude_out}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="rounded-md border border-orange-100 bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-500"
                                    >
                                      📍 Lokasi Pulang
                                    </a>

                                  )}

                              </div>

                            </div>
                          </div>

                          {/* STATUS */}

                          <span
                            className={`self-end rounded-xl border px-3 py-1.5 text-xs font-black uppercase sm:self-auto ${
                              item.status ===
                              "present"
                                ? "border-green-200 bg-green-50 text-green-600"
                                : item.status ===
                                  "late"
                                ? "border-yellow-200 bg-yellow-50 text-yellow-600"
                                : item.status ===
                                  "sakit"
                                ? "border-orange-200 bg-orange-50 text-orange-600"
                                : item.status ===
                                  "izin"
                                ? "border-purple-200 bg-purple-50 text-purple-600"
                                : "border-gray-200 bg-gray-50 text-gray-600"
                            }`}
                          >
                            {
                              item.status
                            }
                          </span>

                        </div>
                      );
                    }
                  )

                )}

              </div>
            </div>
          </div>

          {/* =================================================
              KANAN
          ================================================= */}

          <div className="flex flex-col gap-8">

            {/* =================================================
                QUICK ACTION
            ================================================= */}

            <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">

              <h3 className="text-xl font-bold text-gray-800">
                Quick Actions
              </h3>

              <p className="mb-6 text-sm text-gray-500">
                Menu navigasi cepat admin.
              </p>

              <div className="space-y-3">

                <Link
                  href="/attendance"
                  className="flex w-full items-center justify-center rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700"
                >
                  ✅ Approve Attendances
                </Link>

                <Link
                  href="/employees"
                  className="flex w-full items-center justify-center rounded-2xl border-2 border-gray-100 py-3.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                >
                  👥 Employees Directory
                </Link>

              </div>
            </div>

            {/* =================================================
                HARI LIBUR
            ================================================= */}

            <div className="rounded-3xl border border-indigo-50 bg-white p-8 shadow-sm">

              <div className="mb-6 flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-xl">
                  🏖️
                </div>

                <div>

                  <h3 className="text-lg font-bold text-indigo-600">
                    Atur Hari Libur
                  </h3>

                  <p className="text-xs text-gray-400">
                    Kunci form absensi.
                  </p>

                </div>

              </div>

              <div className="space-y-3">

                <input
                  type="date"
                  value={
                    inputHolidayDate
                  }
                  onChange={(e) =>
                    setInputHolidayDate(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-indigo-500 focus:outline-none"
                />

                <input
                  type="text"
                  value={
                    inputHolidayDesc
                  }
                  onChange={(e) =>
                    setInputHolidayDesc(
                      e.target.value
                    )
                  }
                  placeholder="Keterangan hari libur"
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-indigo-500 focus:outline-none"
                />

                <button
                  onClick={
                    handleSetHoliday
                  }
                  disabled={
                    isSettingHoliday
                  }
                  className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSettingHoliday
                    ? "Menyimpan..."
                    : "Simpan Hari Libur"}
                </button>

              </div>
            </div>

            {/* =================================================
                BELUM ABSEN
            ================================================= */}

            <div className="rounded-3xl border border-red-50 bg-white p-8 shadow-sm">

              <div className="mb-6 flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-xl">
                  ⚠️
                </div>

                <div>

                  <h3 className="text-lg font-bold text-red-500">
                    Belum Absen
                  </h3>

                  <p className="text-xs text-gray-400">
                    Daftar anggota yang belum
                    melakukan absensi.
                  </p>

                </div>

              </div>

              <Link
                href="/rekap-tidak-hadir"
                className="flex w-full items-center justify-center rounded-2xl border border-red-100 bg-red-50 py-3.5 text-sm font-bold text-red-600 hover:bg-red-100"
              >
                ⚠️ Rekap Belum Absen
              </Link>

              <div className="mt-6 max-h-[400px] space-y-3 overflow-y-auto pr-2">

                {missingEmployees.length ===
                0 ? (

                  <div className="rounded-2xl border border-green-100 bg-green-50 p-6 text-center">

                    <p className="mb-2 text-2xl">
                      🎉
                    </p>

                    <p className="text-sm font-bold text-green-700">
                      Semua sudah absen!
                    </p>

                  </div>

                ) : (

                  missingEmployees.map(
                    (person) => (
                      <div
                        key={
                          person.id
                        }
                        className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4"
                      >

                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">
                          {person.full_name
                            ?.charAt(
                              0
                            )
                            .toUpperCase() ||
                            "?"}
                        </div>

                        <div>

                          <p className="text-sm font-bold text-gray-700">
                            {
                              person.full_name
                            }
                          </p>

                          <p className="text-[10px] uppercase text-gray-400">
                            {
                              person.role
                            }
                          </p>

                        </div>

                      </div>
                    )
                  )

                )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}