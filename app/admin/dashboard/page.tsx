"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import { supabase } from "@/lib/supabase";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
});

/* =============================================================
   ICONS (inline SVG — no extra dependency, consistent stroke set)
============================================================= */

const Icon = {
  Logout: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Camera: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  Pin: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  Check: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Chevron: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Users: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Palm: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 22V12" />
      <path d="M12 12c-3-4-9-4-10-1 3 2 7 2 10 1z" />
      <path d="M12 12c3-4 9-4 10-1-3 2-7 2-10 1z" />
      <path d="M12 12c-2-5-1-9 1-11 2 2 2 6 0 11z" />
    </svg>
  ),
  Note: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  ),
  Alert: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Sparkle: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </svg>
  ),
  Trend: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
};

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
  // RIWAYAT ABSENSI ADMIN SENDIRI
  // =========================================================

  const [myAttendanceHistory, setMyAttendanceHistory] =
    useState<any[]>([]);

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

  // ---------------------------------------------------------
  // DAFTAR HARI LIBUR AKTIF (HARI INI & AKAN DATANG)
  // ---------------------------------------------------------

  const [holidays, setHolidays] = useState<any[]>([]);

  // ---------------------------------------------------------
  // PEMBATALAN HARI LIBUR
  // ---------------------------------------------------------

  const [cancellingId, setCancellingId] =
    useState<string | null>(null);

  const [cancelReason, setCancelReason] = useState("");

  const [isCancellingHoliday, setIsCancellingHoliday] =
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
        // FIX: tambahkan filter is_cancelled = false, karena
        // pembatalan hari libur hanya meng-UPDATE row (bukan
        // menghapusnya). Tanpa filter ini, hari libur yang
        // sudah dibatalkan tetap terbaca "libur" di sisi admin
        // sehingga form absensi admin tetap terkunci.
        // =====================================================

        const { data: holidayData, error: holidayError } =
          await supabase
            .from("holidays")
            .select("description")
            .eq("date", todayStr)
            .eq("is_cancelled", false)
            .maybeSingle();

        if (holidayError) {
          console.error(
            "Holiday Error:",
            holidayError
          );
        }

        if (holidayData) {
          setIsTodayHoliday(true);
          setHolidayDesc(
            holidayData.description
          );
        } else {
          setIsTodayHoliday(false);
          setHolidayDesc("");
        }

        // =====================================================
        // AMBIL HARI LIBUR AKTIF (HARI INI & AKAN DATANG)
        // TIDAK TERMASUK YANG SUDAH DIBATALKAN
        // (untuk daftar + fitur batalkan)
        // =====================================================

        const {
          data: holidayList,
          error: holidayListError,
        } = await supabase
          .from("holidays")
          .select("*")
          .eq("is_cancelled", false)
          .gte("date", todayStr)
          .order("date", {
            ascending: true,
          })
          .limit(10);

        if (holidayListError) {
          console.error(
            "Holiday List Error:",
            holidayListError
          );
        }

        setHolidays(holidayList || []);

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
        // RIWAYAT ABSENSI ADMIN SENDIRI
        // (dipakai untuk ringkasan "absen berapa kali",
        // sama seperti dashboard karyawan)
        // =====================================================

        const {
          data: myHistory,
          error: myHistoryError,
        } = await supabase
          .from("attendance")
          .select(
            "created_at, status, check_in"
          )
          .eq(
            "profile_id",
            user.id
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(30);

        if (myHistoryError) {
          console.error(
            "My History Error:",
            myHistoryError
          );
        }

        setMyAttendanceHistory(
          myHistory ?? []
        );

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
  // BUKA / TUTUP FORM PEMBATALAN HARI LIBUR
  // =========================================================

  const openCancelForm = (holidayId: string) => {
    setCancellingId(holidayId);
    setCancelReason("");
  };

  const closeCancelForm = () => {
    setCancellingId(null);
    setCancelReason("");
  };

  // =========================================================
  // BATALKAN HARI LIBUR
  // ALASAN WAJIB DIISI. SETELAH DIBATALKAN, TANGGAL TERSEBUT
  // TIDAK LAGI DIANGGAP LIBUR SEHINGGA KARYAWAN & ADMIN
  // BISA ABSEN KEMBALI.
  // =========================================================

  const handleCancelHoliday = async (
    holidayId: string
  ) => {
    if (!cancelReason.trim()) {
      alert(
        "Alasan pembatalan wajib diisi!"
      );

      return;
    }

    setIsCancellingHoliday(true);

    try {
      const { error } =
        await supabase
          .from("holidays")
          .update({
            is_cancelled: true,
            cancel_reason:
              cancelReason.trim(),
            cancelled_at:
              new Date().toISOString(),
            cancelled_by: userId,
          })
          .eq("id", holidayId);

      if (error) {
        throw error;
      }

      alert(
        "✅ Hari libur dibatalkan. Karyawan & admin sudah bisa absen kembali pada tanggal tersebut."
      );

      closeCancelForm();

      window.location.reload();
    } catch (error: any) {
      console.error(error);

      alert(
        `❌ Gagal membatalkan: ${error.message}`
      );
    }

    setIsCancellingHoliday(false);
  };

  // =========================================================
  // FORMAT TANGGAL HARI LIBUR
  // =========================================================

  const formatHolidayDate = (dateStr: string) => {
    try {
      return new Date(
        `${dateStr}T00:00:00`
      ).toLocaleDateString("id-ID", {
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
  // STATISTIK ABSENSI ADMIN SENDIRI
  // (SAMA SEPERTI DASHBOARD KARYAWAN)
  // =========================================================

  let myPresentCount = 0;
  let myLateCount = 0;
  let mySickCount = 0;
  let myLeaveCount = 0;
  let myAbsentCount = 0;

  myAttendanceHistory.forEach((att) => {
    if (att.status === "present") {
      myPresentCount++;
    }

    if (att.status === "late") {
      myLateCount++;
    }

    if (att.status === "sakit") {
      mySickCount++;
    }

    if (att.status === "izin") {
      myLeaveCount++;
    }

    if (att.status === "absent") {
      myAbsentCount++;
    }
  });

  const myTotalMasuk =
    myPresentCount + myLateCount;

  // =========================================================
  // DATA GRAFIK TREN JAM MASUK ADMIN
  // =========================================================

  const chartData = myAttendanceHistory
    .filter(
      (item) =>
        item.check_in &&
        (item.status === "present" ||
          item.status === "late")
    )
    .map((item) => {
      const dateObj = new Date(item.check_in);

      const hours =
        dateObj.getHours() +
        dateObj.getMinutes() / 60;

      return {
        tanggal: dateObj.toLocaleDateString(
          "id-ID",
          { day: "numeric", month: "short" }
        ),

        jamDesimal: parseFloat(
          hours.toFixed(2)
        ),

        waktuAsli: dateObj.toLocaleTimeString(
          "id-ID",
          { hour: "2-digit", minute: "2-digit" }
        ),

        status: item.status,
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
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-black/5 bg-white p-3 shadow-lg">
          <p className="font-bold text-[#10151A]">
            {label}
          </p>

          <p className="text-sm font-semibold text-[#0E7C6B]">
            Jam masuk:{" "}
            {payload[0].payload.waktuAsli}
          </p>

          <p className="mt-1 text-xs capitalize text-[#6B7280]">
            Status:{" "}
            {payload[0].payload.status}
          </p>
        </div>
      );
    }

    return null;
  };

  // =========================================================
  // DONUT CHART
  // =========================================================

  const donutData = [
    {
      name: "Tepat waktu",
      value: presentCount,
      color: "#0E9F6E",
    },
    {
      name: "Terlambat",
      value: lateCount,
      color: "#D9A017",
    },
    {
      name: "Sakit",
      value: sickCount,
      color: "#C2661E",
    },
    {
      name: "Izin",
      value: leaveCount,
      color: "#6D4FD1",
    },
    {
      name: "Belum absen",
      value:
        missingEmployees.length,
      color: "#D6493F",
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
      <div className={`${jakarta.className} flex min-h-screen items-center justify-center bg-[#F5F6F4] px-6`}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-[#0E7C6B]/20" />
            <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#0E7C6B] text-white">
              <Icon.Sparkle className="h-5 w-5" />
            </span>
          </div>
          <p className="text-sm font-semibold tracking-tight text-[#10151A]">
            Menyiapkan dashboard admin…
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
      <main className={`${jakarta.className} flex min-h-screen items-center justify-center bg-[#F5F6F4] px-4`}>
        <div className="w-full max-w-sm rounded-[28px] border border-black/5 bg-white p-8 text-center shadow-[0_1px_2px_rgba(16,21,26,0.04),0_16px_40px_-16px_rgba(16,21,26,0.18)]">

          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FBE9E7] text-[#C2453B]">
            <Icon.Alert className="h-7 w-7" />
          </div>

          <h2 className="text-lg font-bold tracking-tight text-[#10151A]">
            Perusahaan belum terhubung
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
            Akun admin ini belum memiliki perusahaan yang
            terhubung. Hubungi pemilik akun untuk mengaitkan
            perusahaan Anda.
          </p>

          <button
            onClick={handleLogout}
            className="mt-6 w-full rounded-2xl bg-[#FBE9E7] px-6 py-3 text-sm font-bold text-[#C2453B] transition hover:bg-[#F6D8D4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2453B]/40"
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
    <main className={`${jakarta.className} min-h-screen bg-[#F5F6F4] pb-16`}>

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="sticky top-0 z-30 border-b border-black/5 bg-[#F5F6F4]/85 backdrop-blur-md">

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">

          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#10151A] text-[15px] font-bold text-white">
              {companyName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold tracking-tight text-[#10151A] sm:text-lg">
                {companyName}
              </h1>
              <p className="text-xs font-medium text-[#8A9099]">
                Dashboard admin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">

            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold capitalize text-[#10151A]">
                {userName}
              </p>
              <span className="mt-0.5 inline-block rounded-full border border-[#6D4FD1]/25 bg-[#6D4FD1]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#6D4FD1]">
                Admin
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-black/5 bg-white px-3 py-2 text-xs font-bold text-[#C2453B] shadow-sm transition hover:bg-[#FBE9E7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2453B]/40 sm:px-4"
            >
              <Icon.Logout className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>

          </div>
        </div>
      </header>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="mx-auto max-w-7xl space-y-6 px-4 pt-6 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">

        {/* ===================================================
            ABSENSI ADMIN
        =================================================== */}

        <section className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(16,21,26,0.03)] sm:p-8">

          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#10151A] sm:text-2xl">
                Absensi saya
              </h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                Admin juga melakukan absensi seperti karyawan.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#0E7C6B]/10 px-4 py-2 text-xs font-bold text-[#0E7C6B]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0E7C6B] text-[10px] font-bold text-white">
                {userName.charAt(0).toUpperCase()}
              </span>
              {userName}
            </div>

          </div>

          {/* =================================================
              HARI LIBUR
          ================================================= */}

          {isTodayHoliday ? (

            <div className="rounded-2xl border border-[#0E7C6B]/20 bg-[#0E7C6B]/[0.06] p-8 text-center">

              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#0E7C6B] shadow-sm">
                <Icon.Palm className="h-7 w-7" />
              </div>

              <h3 className="text-xl font-bold tracking-tight text-[#10151A]">
                Hari ini libur
              </h3>

              <p className="mt-2 text-sm text-[#6B7280]">
                {holidayDesc}
              </p>

              <span className="mt-4 inline-block rounded-full bg-white px-4 py-2 text-xs font-bold text-[#0E7C6B] shadow-sm">
                Form absensi dinonaktifkan
              </span>

            </div>

          ) : isAttendanceDone ? (

            /* =================================================
               ABSENSI SUDAH SELESAI
            ================================================= */

            <div
              className={`rounded-2xl border p-7 text-center ${
                todayStatus === "sakit"
                  ? "border-[#C2661E]/20 bg-[#C2661E]/[0.06]"
                  : todayStatus === "izin"
                  ? "border-[#6D4FD1]/20 bg-[#6D4FD1]/[0.06]"
                  : "border-[#0E9F6E]/20 bg-[#0E9F6E]/[0.06]"
              }`}
            >

              <div
                className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ${
                  todayStatus === "sakit"
                    ? "text-[#C2661E]"
                    : todayStatus === "izin"
                    ? "text-[#6D4FD1]"
                    : "text-[#0E9F6E]"
                }`}
              >
                {todayStatus === "sakit" ? (
                  <Icon.Note className="h-7 w-7" />
                ) : todayStatus === "izin" ? (
                  <Icon.Note className="h-7 w-7" />
                ) : (
                  <Icon.Check className="h-7 w-7" />
                )}
              </div>

              <h3 className="text-lg font-bold tracking-tight text-[#10151A]">
                {todayStatus === "sakit"
                  ? "Pengajuan sakit tercatat"
                  : todayStatus === "izin"
                  ? "Pengajuan izin tercatat"
                  : "Absensi hari ini selesai"}
              </h3>

              <p className="mt-2 text-sm text-[#6B7280]">
                {todayStatus === "sakit" || todayStatus === "izin"
                  ? `Data ${todayStatus} sudah dikirim untuk ditinjau.`
                  : "Anda sudah melakukan check-in dan check-out hari ini."}
              </p>

            </div>

          ) : (

            <div>

              {/* =============================================
                  TAB
              ============================================= */}

              {!hasCheckedIn && (
                <div className="mx-auto mb-6 flex max-w-md rounded-2xl bg-[#F1F2F0] p-1.5">

                  <button
                    onClick={() => setAttendanceTab("hadir")}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
                      attendanceTab === "hadir"
                        ? "bg-white text-[#0E7C6B] shadow-sm"
                        : "text-[#8A9099]"
                    }`}
                  >
                    Hadir
                  </button>

                  <button
                    onClick={() => setAttendanceTab("sakit")}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
                      attendanceTab === "sakit"
                        ? "bg-white text-[#C2661E] shadow-sm"
                        : "text-[#8A9099]"
                    }`}
                  >
                    Sakit
                  </button>

                  <button
                    onClick={() => setAttendanceTab("izin")}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
                      attendanceTab === "izin"
                        ? "bg-white text-[#6D4FD1] shadow-sm"
                        : "text-[#8A9099]"
                    }`}
                  >
                    Izin
                  </button>

                </div>
              )}

              {/* =============================================
                  SAKIT / IZIN
              ============================================= */}

              {!hasCheckedIn && attendanceTab !== "hadir" ? (

                <div className="mx-auto max-w-md rounded-2xl border border-black/5 bg-[#FAFAF9] p-6">

                  <label className="mb-2 block text-sm font-bold text-[#10151A]">
                    Keterangan {attendanceTab === "sakit" ? "sakit" : "izin"}
                  </label>

                  <textarea
                    value={reasonText}
                    onChange={(e) => setReasonText(e.target.value)}
                    rows={4}
                    placeholder={`Tuliskan alasan ${attendanceTab}...`}
                    className="w-full rounded-xl border border-black/10 bg-white p-4 text-sm text-[#10151A] placeholder:text-[#B0B5BC] focus:border-[#0E7C6B] focus:outline-none focus:ring-2 focus:ring-[#0E7C6B]/20"
                  />

                  <button
                    onClick={() => submitAttendance("check_in")}
                    disabled={isTakingAttendance || !reasonText.trim()}
                    className={`mt-4 w-full rounded-xl py-3.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      attendanceTab === "sakit"
                        ? "bg-[#C2661E] hover:bg-[#A8541A]"
                        : "bg-[#6D4FD1] hover:bg-[#5E42B8]"
                    }`}
                  >
                    {isTakingAttendance ? "Mengirim…" : `Kirim ${attendanceTab}`}
                  </button>

                </div>

              ) : (

                /* =============================================
                   KAMERA HADIR
                ============================================= */

                <div className="flex flex-col items-center">

                  <div className="relative mb-5 aspect-[4/5] w-full max-w-sm overflow-hidden rounded-[24px] border border-black/10 bg-[#10151A] shadow-inner sm:aspect-square">

                    <canvas ref={canvasRef} className="hidden" />

                    {/* FOTO */}

                    {photoPreview ? (

                      <div className="relative h-full w-full">

                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoPreview}
                          alt="Preview absensi admin"
                          className="h-full w-full object-cover"
                        />

                        <button
                          onClick={retakePhoto}
                          className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-5 py-2.5 text-xs font-bold text-[#10151A] shadow-lg transition hover:bg-[#F1F2F0]"
                        >
                          Ulangi foto
                        </button>

                      </div>

                    ) : isCameraActive ? (

                      /* CAMERA AKTIF */

                      <div className="relative h-full w-full">

                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="h-full w-full scale-x-[-1] object-cover"
                        />

                        <div className="pointer-events-none absolute inset-4 rounded-2xl border-2 border-white/50" />

                        <button
                          onClick={takePhoto}
                          aria-label="Ambil foto"
                          className="absolute bottom-5 left-1/2 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-white shadow-lg transition hover:scale-105"
                        >
                          <span className="h-12 w-12 rounded-full border-4 border-[#0E7C6B]" />
                        </button>

                      </div>

                    ) : (

                      /* KAMERA BELUM AKTIF */

                      <div className="flex h-full flex-col items-center justify-center bg-[#161C22] p-6 text-center">

                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white">
                          <Icon.Camera className="h-8 w-8" />
                        </div>

                        <h3 className="text-base font-bold text-white">
                          Verifikasi absensi
                        </h3>

                        <p className="mb-6 mt-2 max-w-xs text-xs leading-relaxed text-white/60">
                          Foto diambil langsung dari kamera untuk
                          memastikan keaslian absensi.
                        </p>

                        <button
                          onClick={startCamera}
                          className="rounded-xl bg-[#0E7C6B] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0B6A5B] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                        >
                          Aktifkan kamera
                        </button>

                      </div>
                    )}

                  </div>

                  {/* GPS */}

                  {adminLocation ? (

                    <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-[#0E9F6E]/20 bg-[#0E9F6E]/10 px-4 py-2 text-xs font-bold text-[#0E9F6E]">
                      <Icon.Pin className="h-3.5 w-3.5" />
                      Lokasi terverifikasi
                    </div>

                  ) : (

                    <p className="mb-5 flex items-center gap-1.5 text-xs text-[#8A9099]">
                      <Icon.Pin className="h-3.5 w-3.5" />
                      Izinkan akses lokasi GPS saat kamera aktif.
                    </p>

                  )}

                  {/* BUTTON */}

                  <div className="flex w-full max-w-sm flex-col gap-3 sm:flex-row">

                    {!hasCheckedIn && (
                      <button
                        onClick={() => submitAttendance("check_in")}
                        disabled={isTakingAttendance || !photo || !adminLocation}
                        className="w-full rounded-xl bg-[#0E7C6B] px-8 py-3.5 text-sm font-bold text-white shadow-md shadow-[#0E7C6B]/20 transition hover:bg-[#0B6A5B] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isTakingAttendance ? "Memproses…" : "Kirim absen masuk"}
                      </button>
                    )}

                    {hasCheckedIn && !hasCheckedOut && (
                      <button
                        onClick={() => submitAttendance("check_out")}
                        disabled={isTakingAttendance || !photo || !adminLocation}
                        className="w-full rounded-xl bg-[#C2661E] px-8 py-3.5 text-sm font-bold text-white shadow-md shadow-[#C2661E]/20 transition hover:bg-[#A8541A] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isTakingAttendance ? "Memproses…" : "Kirim absen pulang"}
                      </button>
                    )}

                  </div>

                </div>
              )}
            </div>
          )}
        </section>

        {/* ===================================================
            RINGKASAN ABSENSI SAYA
            (SAMA SEPERTI DASHBOARD KARYAWAN — "absen berapa kali")
        =================================================== */}

        <section>

          <div className="mb-5">
            <h2 className="text-xl font-bold tracking-tight text-[#10151A] sm:text-2xl">
              Ringkasan absensi saya
            </h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              Riwayat dan performa kehadiran Anda sebagai admin.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">

            {[
              { label: "Total masuk", value: myTotalMasuk, color: "#10151A" },
              { label: "Tepat waktu", value: myPresentCount, color: "#0E9F6E" },
              { label: "Terlambat", value: myLateCount, color: "#D9A017" },
              { label: "Sakit / izin", value: mySickCount + myLeaveCount, color: "#6D4FD1" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5"
              >
                <h3
                  className="text-2xl font-extrabold tracking-tight tabular-nums sm:text-3xl"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </h3>
                <p className="mt-1 text-xs font-semibold text-[#6B7280]">
                  {stat.label}
                </p>
              </div>
            ))}

          </div>

          <div className="mt-4 grid gap-6 sm:gap-8 lg:grid-cols-[0.8fr_1.7fr]">

            {/* DETAIL STATISTIK */}

            <div className="rounded-[28px] border border-black/5 bg-white p-6 shadow-sm sm:p-7">

              <div className="mb-6">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A9099]">
                  Attendance rate
                </p>
                <h3 className="mt-1 text-lg font-bold tracking-tight text-[#10151A]">
                  Detail statistik
                </h3>
              </div>

              <div className="space-y-3">

                <div className="flex items-center justify-between rounded-xl bg-[#0E9F6E]/[0.06] p-4">
                  <div>
                    <p className="text-xs font-bold text-[#10151A]">Tepat waktu</p>
                    <p className="text-[10px] text-[#8A9099]">Sebelum pukul 09:00</p>
                  </div>
                  <p className="text-xl font-extrabold text-[#0E9F6E]">{myPresentCount}</p>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#D9A017]/[0.08] p-4">
                  <div>
                    <p className="text-xs font-bold text-[#10151A]">Terlambat</p>
                    <p className="text-[10px] text-[#8A9099]">Pukul 09:00 ke atas</p>
                  </div>
                  <p className="text-xl font-extrabold text-[#B5860F]">{myLateCount}</p>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#D6493F]/[0.06] p-4">
                  <div>
                    <p className="text-xs font-bold text-[#10151A]">Alpa</p>
                    <p className="text-[10px] text-[#8A9099]">Tidak ada catatan kehadiran</p>
                  </div>
                  <p className="text-xl font-extrabold text-[#D6493F]">{myAbsentCount}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="rounded-xl border border-black/5 bg-[#FAFAF9] p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A9099]">Sakit</p>
                    <p className="mt-1 text-lg font-extrabold text-[#C2661E]">{mySickCount}</p>
                  </div>
                  <div className="rounded-xl border border-black/5 bg-[#FAFAF9] p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A9099]">Izin</p>
                    <p className="mt-1 text-lg font-extrabold text-[#6D4FD1]">{myLeaveCount}</p>
                  </div>
                </div>

              </div>
            </div>

            {/* TREN JAM MASUK */}

            <div className="min-w-0 rounded-[28px] border border-black/5 bg-white p-6 shadow-sm sm:p-7">

              <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0E7C6B]">
                    Attendance analytics
                  </p>
                  <h3 className="mt-1 text-lg font-bold tracking-tight text-[#10151A]">
                    Tren waktu kedatangan
                  </h3>
                  <p className="mt-1 text-xs text-[#8A9099]">
                    Perubahan jam masuk Anda dalam beberapa hari terakhir.
                  </p>
                </div>
                <div className="w-fit rounded-full bg-[#0E7C6B]/10 px-3 py-1.5 text-[10px] font-black text-[#0E7C6B]">
                  {chartData.length} data
                </div>
              </div>

              {chartData.length > 0 ? (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 8, left: -18, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#EEF2F0" />
                      <XAxis
                        dataKey="tanggal"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#8A9099" }}
                        dy={10}
                      />
                      <YAxis
                        domain={["dataMin - 1", "dataMax + 1"]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#8A9099" }}
                        tickFormatter={(val) => `${Math.floor(val)}:00`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="jamDesimal"
                        stroke="#0E7C6B"
                        strokeWidth={3}
                        dot={{ r: 4, strokeWidth: 2, fill: "#fff", stroke: "#0E7C6B" }}
                        activeDot={{ r: 7, stroke: "#fff", strokeWidth: 3, fill: "#0E7C6B" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-black/10 bg-[#FAFAF9] text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#8A9099] shadow-sm">
                    <Icon.Trend className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-[#374151]">Belum ada data grafik</p>
                  <p className="mt-1 max-w-xs text-xs leading-5 text-[#8A9099]">
                    Riwayat jam masuk akan muncul di sini setelah Anda melakukan absensi.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ===================================================
            STATISTIK UTAMA (MONITORING KEHADIRAN COMPANY)
        =================================================== */}

        <section>

          <div className="mb-5">
            <h2 className="text-xl font-bold tracking-tight text-[#10151A] sm:text-2xl">
              Monitoring kehadiran
            </h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              Pantau kehadiran anggota perusahaan hari ini.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">

            {[
              { label: "Total anggota", value: employeeCount, color: "#10151A", bg: "bg-white", border: "border-black/5" },
              { label: "Tepat waktu", value: presentCount, color: "#0E9F6E", bg: "bg-white", border: "border-[#0E9F6E]/15" },
              { label: "Terlambat", value: lateCount, color: "#D9A017", bg: "bg-white", border: "border-[#D9A017]/15" },
              { label: "Sakit", value: sickCount, color: "#C2661E", bg: "bg-white", border: "border-[#C2661E]/15" },
              { label: "Izin", value: leaveCount, color: "#6D4FD1", bg: "bg-white", border: "border-[#6D4FD1]/15" },
              { label: "Belum absen", value: missingEmployees.length, color: "#D6493F", bg: "bg-white", border: "border-[#D6493F]/15" },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`rounded-2xl border ${stat.border} ${stat.bg} p-4 shadow-sm sm:p-5`}
              >
                <h3
                  className="text-2xl font-extrabold tracking-tight tabular-nums sm:text-3xl"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </h3>
                <p className="mt-1 text-xs font-semibold text-[#6B7280]">
                  {stat.label}
                </p>
              </div>
            ))}

          </div>
        </section>

        {/* ===================================================
            GRID MONITORING
        =================================================== */}

        <div className="grid gap-6 sm:gap-8 lg:grid-cols-3">

          {/* =================================================
              KIRI
          ================================================= */}

          <div className="space-y-6 sm:space-y-8 lg:col-span-2">

            {/* REKAP */}

            <Link
              href="/rekap"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#0E7C6B]/15 bg-[#0E7C6B]/[0.06] py-3.5 text-sm font-bold text-[#0E7C6B] transition hover:bg-[#0E7C6B]/10"
            >
              Laporan rekap bulanan
              <Icon.Chevron className="h-4 w-4" />
            </Link>

            {/* =================================================
                DONUT
            ================================================= */}

            <div className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm sm:p-8">

              <h3 className="text-lg font-bold tracking-tight text-[#10151A] sm:text-xl">
                Statistik kehadiran hari ini
              </h3>

              <p className="mb-6 text-sm text-[#6B7280]">
                Proporsi seluruh status absensi anggota perusahaan.
              </p>

              <div className="flex flex-col items-center justify-between gap-8 sm:flex-row">

                {/* DONUT */}

                <div className="relative h-48 w-48 shrink-0">

                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>

                      <Pie
                        data={donutData}
                        innerRadius={62}
                        outerRadius={82}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >

                        {donutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}

                      </Pie>

                      <Tooltip
                        formatter={(value) => [`${value} orang`, "Jumlah"]}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid rgba(0,0,0,0.06)",
                          boxShadow: "0 8px 24px -8px rgba(16,21,26,0.2)",
                          fontFamily: "var(--font-jakarta)",
                        }}
                      />

                    </PieChart>
                  </ResponsiveContainer>

                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-extrabold tabular-nums text-[#10151A]">
                      {totalDataMasuk}
                    </span>
                    <span className="text-[11px] font-semibold text-[#8A9099]">
                      Data masuk
                    </span>
                  </div>
                </div>

                {/* LEGEND */}

                <div className="grid w-full flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2">

                  {donutData.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-xl border border-black/5 bg-[#FAFAF9] px-3.5 py-2.5"
                    >

                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm font-semibold text-[#374151]">
                          {item.name}
                        </span>
                      </div>

                      <span className="text-sm font-bold tabular-nums text-[#10151A]">
                        {item.value}
                      </span>

                    </div>
                  ))}

                </div>
              </div>
            </div>

            {/* =================================================
                RIWAYAT
            ================================================= */}

            <div className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm sm:p-8">

              <div className="mb-6 flex items-center justify-between gap-4">

                <h3 className="text-lg font-bold tracking-tight text-[#10151A] sm:text-xl">
                  Riwayat absensi terbaru
                </h3>

                <Link
                  href="/attendance"
                  className="flex shrink-0 items-center gap-1 rounded-full bg-[#0E7C6B]/10 px-3.5 py-1.5 text-xs font-bold text-[#0E7C6B] transition hover:bg-[#0E7C6B]/15"
                >
                  Log lengkap
                  <Icon.Chevron className="h-3.5 w-3.5" />
                </Link>

              </div>

              <div className="space-y-3">

                {recentAttendance.length === 0 ? (

                  <div className="rounded-2xl border border-dashed border-black/10 bg-[#FAFAF9] p-8 text-center text-sm text-[#8A9099]">
                    Belum ada data absensi.
                  </div>

                ) : (

                  recentAttendance.map((item) => {

                    const timeStr = item.check_in
                      ? new Date(item.check_in).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "--:--";

                    const statusStyle: Record<string, string> = {
                      present: "border-[#0E9F6E]/20 bg-[#0E9F6E]/10 text-[#0E9F6E]",
                      late: "border-[#D9A017]/20 bg-[#D9A017]/10 text-[#B5860F]",
                      sakit: "border-[#C2661E]/20 bg-[#C2661E]/10 text-[#C2661E]",
                      izin: "border-[#6D4FD1]/20 bg-[#6D4FD1]/10 text-[#6D4FD1]",
                    };

                    return (
                      <div
                        key={item.id}
                        className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-4 transition hover:border-black/10 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                      >

                        <div className="flex items-center gap-4 min-w-0">

                          {/* FOTO */}

                          {item.photo_check_in ? (

                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.photo_check_in}
                              alt="Foto absensi"
                              className="h-14 w-14 shrink-0 rounded-xl border border-black/10 object-cover"
                            />

                          ) : (

                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-black/10 bg-[#F1F2F0] text-[10px] font-bold text-[#B0B5BC]">
                              No pic
                            </div>

                          )}

                          <div className="min-w-0">

                            <p className="truncate text-sm font-bold text-[#10151A] sm:text-base">
                              {item.profiles?.full_name}
                            </p>

                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">

                              <span className="rounded-md bg-[#F1F2F0] px-2 py-0.5 text-[11px] font-semibold text-[#6B7280]">
                                {item.status === "sakit" || item.status === "izin"
                                  ? `Laporan ${timeStr}`
                                  : `Masuk ${timeStr}`}
                              </span>

                              {/* LOKASI MASUK */}

                              {item.latitude && item.longitude && (

                                <a
                                  href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1 rounded-md border border-[#0E7C6B]/15 bg-[#0E7C6B]/10 px-2 py-0.5 text-[10px] font-bold text-[#0E7C6B]"
                                >
                                  <Icon.Pin className="h-2.5 w-2.5" />
                                  Masuk
                                </a>

                              )}

                              {/* LOKASI PULANG */}

                              {item.latitude_out && item.longitude_out && (

                                <a
                                  href={`https://www.google.com/maps?q=${item.latitude_out},${item.longitude_out}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1 rounded-md border border-[#C2661E]/15 bg-[#C2661E]/10 px-2 py-0.5 text-[10px] font-bold text-[#C2661E]"
                                >
                                  <Icon.Pin className="h-2.5 w-2.5" />
                                  Pulang
                                </a>

                              )}

                            </div>

                          </div>
                        </div>

                        {/* STATUS */}

                        <span
                          className={`self-start rounded-lg border px-3 py-1.5 text-xs font-bold capitalize sm:self-auto ${
                            statusStyle[item.status] ||
                            "border-black/10 bg-[#F1F2F0] text-[#6B7280]"
                          }`}
                        >
                          {item.status}
                        </span>

                      </div>
                    );
                  })

                )}

              </div>
            </div>
          </div>

          {/* =================================================
              KANAN
          ================================================= */}

          <div className="flex flex-col gap-6 sm:gap-8">

            {/* =================================================
                QUICK ACTION
            ================================================= */}

            <div className="rounded-[28px] border border-black/5 bg-white p-6 shadow-sm sm:p-8">

              <h3 className="text-lg font-bold tracking-tight text-[#10151A]">
                Aksi cepat
              </h3>

              <p className="mb-6 text-sm text-[#6B7280]">
                Menu navigasi cepat admin.
              </p>

              <div className="space-y-3">

                <Link
                  href="/attendance"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#10151A] py-3.5 text-sm font-bold text-white shadow-md shadow-black/10 transition hover:bg-[#252B32]"
                >
                  <Icon.Check className="h-4 w-4" />
                  Approve attendances
                </Link>

                <Link
                  href="/employees"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-black/5 py-3.5 text-sm font-bold text-[#374151] transition hover:bg-[#FAFAF9]"
                >
                  <Icon.Users className="h-4 w-4" />
                  Employees directory
                </Link>

              </div>
            </div>

            {/* =================================================
                HARI LIBUR (TAMBAH + BATALKAN)
            ================================================= */}

            <div className="rounded-[28px] border border-black/5 bg-white p-6 shadow-sm sm:p-8">

              <div className="mb-6 flex items-center gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6D4FD1]/10 text-[#6D4FD1]">
                  <Icon.Palm className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="text-base font-bold tracking-tight text-[#10151A]">
                    Atur hari libur
                  </h3>
                  <p className="text-xs text-[#8A9099]">
                    Mengunci form absensi pada tanggal tersebut.
                  </p>
                </div>

              </div>

              <div className="space-y-3">

                <input
                  type="date"
                  value={inputHolidayDate}
                  onChange={(e) => setInputHolidayDate(e.target.value)}
                  className="w-full rounded-xl border border-black/10 p-3 text-sm text-[#10151A] focus:border-[#6D4FD1] focus:outline-none focus:ring-2 focus:ring-[#6D4FD1]/20"
                />

                <input
                  type="text"
                  value={inputHolidayDesc}
                  onChange={(e) => setInputHolidayDesc(e.target.value)}
                  placeholder="Keterangan hari libur"
                  className="w-full rounded-xl border border-black/10 p-3 text-sm text-[#10151A] placeholder:text-[#B0B5BC] focus:border-[#6D4FD1] focus:outline-none focus:ring-2 focus:ring-[#6D4FD1]/20"
                />

                <button
                  onClick={handleSetHoliday}
                  disabled={isSettingHoliday}
                  className="w-full rounded-xl bg-[#6D4FD1] py-3 text-sm font-bold text-white transition hover:bg-[#5E42B8] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSettingHoliday ? "Menyimpan…" : "Simpan hari libur"}
                </button>

              </div>

              {/* =================================================
                  DAFTAR HARI LIBUR AKTIF + BATALKAN
              ================================================= */}

              {holidays.length > 0 && (

                <div className="mt-6 space-y-3 border-t border-black/5 pt-6">

                  <p className="text-xs font-bold uppercase tracking-wider text-[#8A9099]">
                    Hari libur aktif
                  </p>

                  {holidays.map((holiday) => {

                    const isThisOneCancelling =
                      cancellingId === holiday.id;

                    return (
                      <div
                        key={holiday.id}
                        className={`rounded-2xl border p-4 transition ${
                          isThisOneCancelling
                            ? "border-[#D6493F]/20 bg-[#D6493F]/[0.04]"
                            : "border-black/5 bg-[#FAFAF9]"
                        }`}
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#10151A]">
                              {formatHolidayDate(holiday.date)}
                            </p>

                            <p className="mt-0.5 text-xs text-[#6B7280]">
                              {holiday.description}
                            </p>
                          </div>

                          {!isThisOneCancelling && (
                            <button
                              onClick={() => openCancelForm(holiday.id)}
                              className="shrink-0 rounded-lg border border-[#D6493F]/15 bg-[#D6493F]/10 px-3 py-1.5 text-xs font-bold text-[#D6493F] transition hover:bg-[#D6493F]/15"
                            >
                              Batalkan
                            </button>
                          )}
                        </div>

                        {/* FORM ALASAN PEMBATALAN */}

                        {isThisOneCancelling && (

                          <div className="mt-3 space-y-2 border-t border-[#D6493F]/15 pt-3">

                            <label className="block text-xs font-bold text-[#374151]">
                              Alasan pembatalan (wajib diisi)
                            </label>

                            <textarea
                              value={cancelReason}
                              onChange={(e) => setCancelReason(e.target.value)}
                              rows={3}
                              placeholder="Contoh: Operasional tetap berjalan karena ada kebutuhan mendadak dari klien"
                              className="w-full rounded-xl border border-black/10 bg-white p-3 text-sm text-[#10151A] focus:border-[#D6493F] focus:outline-none focus:ring-2 focus:ring-[#D6493F]/15"
                            />

                            <p className="text-[11px] text-[#8A9099]">
                              Setelah dibatalkan, karyawan dan admin bisa
                              absen kembali pada tanggal ini.
                            </p>

                            <div className="flex gap-2 pt-1">

                              <button
                                onClick={() => handleCancelHoliday(holiday.id)}
                                disabled={isCancellingHoliday || !cancelReason.trim()}
                                className="flex-1 rounded-xl bg-[#D6493F] py-2.5 text-xs font-bold text-white transition hover:bg-[#B8392F] disabled:opacity-50"
                              >
                                {isCancellingHoliday ? "Memproses…" : "Konfirmasi pembatalan"}
                              </button>

                              <button
                                onClick={closeCancelForm}
                                disabled={isCancellingHoliday}
                                className="rounded-xl border border-black/10 px-4 py-2.5 text-xs font-bold text-[#374151] transition hover:bg-[#F1F2F0]"
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
            </div>

            {/* =================================================
                BELUM ABSEN
            ================================================= */}

            <div className="rounded-[28px] border border-black/5 bg-white p-6 shadow-sm sm:p-8">

              <div className="mb-6 flex items-center gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D6493F]/10 text-[#D6493F]">
                  <Icon.Alert className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="text-base font-bold tracking-tight text-[#D6493F]">
                    Belum absen
                  </h3>
                  <p className="text-xs text-[#8A9099]">
                    Anggota yang belum melakukan absensi hari ini.
                  </p>
                </div>

              </div>

              <Link
                href="/rekap-tidak-hadir"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#D6493F]/15 bg-[#D6493F]/[0.06] py-3.5 text-sm font-bold text-[#D6493F] transition hover:bg-[#D6493F]/10"
              >
                Rekap belum absen
                <Icon.Chevron className="h-4 w-4" />
              </Link>

              <div className="mt-6 max-h-[400px] space-y-2.5 overflow-y-auto pr-1">

                {missingEmployees.length === 0 ? (

                  <div className="rounded-2xl border border-[#0E9F6E]/15 bg-[#0E9F6E]/[0.06] p-6 text-center">
                    <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#0E9F6E] shadow-sm">
                      <Icon.Check className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-bold text-[#0E9F6E]">
                      Semua sudah absen
                    </p>
                  </div>

                ) : (

                  missingEmployees.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center gap-3 rounded-xl border border-black/5 bg-[#FAFAF9] p-3.5"
                    >

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E5E7EB] text-xs font-bold text-[#6B7280]">
                        {person.full_name?.charAt(0).toUpperCase() || "?"}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#374151]">
                          {person.full_name}
                        </p>
                        <p className="text-[10px] font-medium text-[#8A9099]">
                          {person.role}
                        </p>
                      </div>

                    </div>
                  ))

                )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}