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
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // State User Umum
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState(""); 
  const [userName, setUserName] = useState("");
  const [companyName, setCompanyName] = useState("Company Attendance");
  const [userId, setUserId] = useState("");
  
  // STATE UNTUK ADMIN/OWNER
  const [employeeCount, setEmployeeCount] = useState(0);
  const [presentCount, setPresentCount] = useState(0);
  const [lateCount, setLateCount] = useState(0);
  const [sickCount, setSickCount] = useState(0);   
  const [leaveCount, setLeaveCount] = useState(0); 
  const [absentCount, setAbsentCount] = useState(0);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [missingEmployees, setMissingEmployees] = useState<any[]>([]);
  
  // ✨ STATE BARU UNTUK FITUR LIBUR (ADMIN)
  const [inputHolidayDate, setInputHolidayDate] = useState("");
  const [inputHolidayDesc, setInputHolidayDesc] = useState("");
  const [isSettingHoliday, setIsSettingHoliday] = useState(false);

  // STATE UNTUK EMPLOYEE
  const [todayAttendanceId, setTodayAttendanceId] = useState<string | null>(null);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [hasCheckedOut, setHasCheckedOut] = useState(false);
  const [todayStatus, setTodayStatus] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [employeeLocation, setEmployeeLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isTakingAttendance, setIsTakingAttendance] = useState(false);
  const [myAttendanceHistory, setMyAttendanceHistory] = useState<any[]>([]); 
  
  // ✨ STATE BARU UNTUK FITUR LIBUR (EMPLOYEE)
  const [isTodayHoliday, setIsTodayHoliday] = useState(false);
  const [holidayDesc, setHolidayDesc] = useState("");

  // STATE UNTUK FITUR SAKIT & IZIN
  const [attendanceTab, setAttendanceTab] = useState<"hadir" | "sakit" | "izin">("hadir");
  const [reasonText, setReasonText] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    return () => stopCamera();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (attendanceTab !== "hadir") {
      stopCamera();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendanceTab]);

  useEffect(() => {
    const loadDashboard = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      setUserEmail(user.email ?? "");
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*, companies(name)")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) {
        setUserRole("employee");
        setUserName(user.email?.split('@')[0] || "User");
        setLoading(false);
        return;
      }

      setUserRole(profile.role);
      setUserName(profile.full_name || user.email?.split('@')[0] || "Employee");

      if (profile?.companies) {
        const companyData = profile.companies as any;
        setCompanyName(companyData.name || "Company Attendance");
      }

      const todayStr = new Date().toISOString().split('T')[0];

      // Cek apakah hari ini libur
      const { data: holidayData } = await supabase
        .from("holidays")
        .select("description")
        .eq("date", todayStr)
        .maybeSingle();

      if (holidayData) {
        setIsTodayHoliday(true);
        setHolidayDesc(holidayData.description);
      }

      // ==========================================
      // JIKA OWNER / ADMIN
      // ==========================================
      if (profile.role === "owner" || profile.role === "admin") {
        if (!profile.company_id) {
            setLoading(false);
            return;
        }

        const { data: companyProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .eq("company_id", profile.company_id)
          .neq("role", "owner"); 

        const profileIds = companyProfiles?.map(p => p.id) || [];
        const totalEmp = profileIds.length;
        
        let pCount = 0, lCount = 0, aCount = 0, sCount = 0, iCount = 0;
        let mergedRecent: any[] = [];
        let missing: any[] = companyProfiles || []; 

        if (profileIds.length > 0) {
          const { data: todayAtt } = await supabase
            .from("attendance")
            .select("profile_id, status")
            .in("profile_id", profileIds)
            .gte("created_at", `${todayStr}T00:00:00Z`);

          todayAtt?.forEach(att => {
            if (att.status === 'present') pCount++;
            if (att.status === 'late') lCount++;
            if (att.status === 'sakit') sCount++;
            if (att.status === 'izin') iCount++;
            if (att.status === 'absent') aCount++;
          });

          const attendedProfileIds = todayAtt?.map(att => att.profile_id) || [];
          missing = (companyProfiles || []).filter(p => !attendedProfileIds.includes(p.id));

          const { data: attendanceData } = await supabase
            .from("attendance")
            .select(`id, profile_id, status, check_in, photo_check_in, created_at, latitude, longitude, latitude_out, longitude_out`)
            .in("profile_id", profileIds)
            .order("created_at", { ascending: false })
            .limit(5);

          mergedRecent = attendanceData?.map(att => ({
            ...att,
            profiles: {
              full_name: companyProfiles?.find(p => p.id === att.profile_id)?.full_name || "Unknown"
            }
          })) || [];
        }

        setEmployeeCount(totalEmp); 
        setPresentCount(pCount);
        setLateCount(lCount);
        setSickCount(sCount);
        setLeaveCount(iCount);
        setAbsentCount(aCount);
        setRecentAttendance(mergedRecent);
        setMissingEmployees(missing); 
      } 
      // ==========================================
      // JIKA EMPLOYEE
      // ==========================================
      else {
        const { data: myTodayAttendance } = await supabase
          .from("attendance")
          .select("*")
          .eq("profile_id", user.id)
          .gte("created_at", `${todayStr}T00:00:00Z`)
          .lte("created_at", `${todayStr}T23:59:59Z`)
          .maybeSingle();

        if (myTodayAttendance) {
          setTodayAttendanceId(myTodayAttendance.id);
          setHasCheckedIn(!!myTodayAttendance.check_in);
          setHasCheckedOut(!!myTodayAttendance.check_out);
          setTodayStatus(myTodayAttendance.status); 
        }

        const { data: myHistory } = await supabase
          .from("attendance")
          .select("created_at, status, check_in")
          .eq("profile_id", user.id)
          .order("created_at", { ascending: false })
          .limit(30);
        
        setMyAttendanceHistory(myHistory ?? []);
      }
      setLoading(false);
    };

    loadDashboard();
  }, [router]);

  useEffect(() => {
    if (isCameraActive && videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [isCameraActive, mediaStream]);

  const handleLogout = async () => {
    stopCamera();
    await supabase.auth.signOut();
    router.push("/login");
  };

  // ✨ FUNGSI ADMIN UNTUK MENGIRIM JADWAL LIBUR
  const handleSetHoliday = async () => {
    if (!inputHolidayDate || !inputHolidayDesc) {
      alert("Tanggal dan Keterangan libur harus diisi!");
      return;
    }
    setIsSettingHoliday(true);
    try {
      const { error } = await supabase.from("holidays").insert({
        date: inputHolidayDate,
        description: inputHolidayDesc
      });
      if (error) throw error;
      alert("✅ Hari libur berhasil ditambahkan!");
      setInputHolidayDate("");
      setInputHolidayDesc("");
      window.location.reload();
    } catch (error: any) {
      alert(`❌ Gagal: ${error.message}`);
    }
    setIsSettingHoliday(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user" },
        audio: false 
      });
      
      setMediaStream(stream); 
      setIsCameraActive(true); 
      setPhoto(null);
      setPhotoPreview(null);
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setEmployeeLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          },
          () => console.warn("GPS belum aktif/diizinkan")
        );
      }
    } catch (err) {
      console.error(err);
      alert("Gagal mengakses kamera! Pastikan izin kamera telah diberikan di browser.");
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext("2d");
      if (context) {
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "selfie-live.jpg", { type: "image/jpeg" });
            setPhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
            stopCamera();
          }
        }, "image/jpeg", 0.8);
      }
    }
  };

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setMediaStream(null);
    setIsCameraActive(false);
  };

  const retakePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    startCamera();
  };

  const submitAttendance = async (type: "check_in" | "check_out") => {
    setIsTakingAttendance(true);
    try {
      const now = new Date().toISOString();
      const currentHour = new Date().getHours();

      if (type === "check_in") {
        if (attendanceTab === "sakit" || attendanceTab === "izin") {
          if (!reasonText.trim()) {
            alert(`Keterangan ${attendanceTab} tidak boleh kosong!`);
            setIsTakingAttendance(false);
            return;
          }
          const { error } = await supabase.from("attendance").insert({
            profile_id: userId,
            status: attendanceTab, 
            reason: reasonText,    
            check_in: now,
            approval_status: "pending",
          }).select().single(); 

          if (error) throw error;
          alert(`✅ Berhasil mengirim pengajuan ${attendanceTab}! Semoga hari Anda lancar.`);
          window.location.reload();
          return;
        } else {
          if (!photo || !employeeLocation) {
            alert("Foto dan Lokasi GPS wajib ada sebelum absen!");
            setIsTakingAttendance(false);
            return;
          }
          const fileExt = photo.name ? photo.name.split('.').pop() : 'jpg';
          const fileName = `${userId}-${type}-${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('attendances').upload(fileName, photo);
          if (uploadError) {
            alert(`❌ Gagal Upload Foto: ${uploadError.message}`);
            setIsTakingAttendance(false);
            return;
          }
          const { data: publicUrlData } = supabase.storage.from('attendances').getPublicUrl(fileName);
          const attStatus = currentHour >= 9 ? "late" : "present"; 
          const { error } = await supabase.from("attendance").insert({
            profile_id: userId,
            status: attStatus, 
            check_in: now,
            photo_check_in: publicUrlData.publicUrl,
            approval_status: "pending",
            latitude: employeeLocation.lat,
            longitude: employeeLocation.lng
          }).select().single(); 

          if (error) throw error;
          alert("✅ Berhasil Check-In!");
          window.location.reload();
          return;
        }
      } else {
        if (!photo || !employeeLocation) {
          alert("Foto dan Lokasi GPS wajib ada sebelum absen pulang!");
          setIsTakingAttendance(false);
          return;
        }
        if (!todayAttendanceId) {
          alert("❌ ID Absensi hari ini tidak ditemukan");
          setIsTakingAttendance(false);
          return;
        }
        const fileExt = photo.name ? photo.name.split('.').pop() : 'jpg';
        const fileName = `${userId}-${type}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('attendances').upload(fileName, photo);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('attendances').getPublicUrl(fileName);
        const { error } = await supabase.from("attendance").update({
          check_out: now,
          photo_check_out: publicUrlData.publicUrl,
          latitude_out: employeeLocation.lat,
          longitude_out: employeeLocation.lng
        }).eq("id", todayAttendanceId);

        if (error) throw error;
        alert("✅ Berhasil Check-Out!");
        window.location.reload();
      }
    } catch (error: any) {
      console.error("Catch Error:", error);
      alert(`❌ Error Sistem: ${error.message || JSON.stringify(error)}`);
    }
    setIsTakingAttendance(false);
  };

  // LOGIKA STATISTIK EMPLOYEE
  let myPresentCount = 0;
  let myLateCount = 0;
  let mySickCount = 0;
  let myLeaveCount = 0;
  let myAbsentCount = 0;

  myAttendanceHistory.forEach(att => {
    if (att.status === 'present') myPresentCount++;
    if (att.status === 'late') myLateCount++;
    if (att.status === 'sakit') mySickCount++;
    if (att.status === 'izin') myLeaveCount++;
    if (att.status === 'absent') myAbsentCount++;
  });

  const myTotalMasuk = myPresentCount + myLateCount;

  const chartData = myAttendanceHistory
    .filter(item => item.check_in && (item.status === 'present' || item.status === 'late')) 
    .map(item => {
      const dateObj = new Date(item.check_in);
      const hours = dateObj.getHours() + dateObj.getMinutes() / 60;
      return {
        tanggal: dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        jamDesimal: parseFloat(hours.toFixed(2)),
        waktuAsli: dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        status: item.status
      };
    })
    .reverse();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-lg">
          <p className="font-bold text-gray-800">{label}</p>
          <p className="text-sm font-semibold text-blue-600">Jam Masuk: {payload[0].payload.waktuAsli}</p>
          <p className="text-xs text-gray-500 capitalize mt-1">Status: {payload[0].payload.status}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center font-semibold text-blue-600">Loading Dashboard...</div>;

  // ==========================================
  // TAMPILAN EMPLOYEE
  // ==========================================
  if (userRole === "employee") {
    const isAttendanceDone = hasCheckedOut || todayStatus === 'sakit' || todayStatus === 'izin';
    return (
      <main className="min-h-screen bg-gray-50/50 pb-12">
        <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-8">
            <div>
              <h1 className="text-xl font-extrabold text-blue-600">{companyName}</h1>
              <p className="text-xs font-medium text-gray-400">Employee Portal</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold text-gray-800 capitalize">{userName}</p>
                <span className="inline-block mt-0.5 rounded-full bg-green-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-green-700 border border-green-200 shadow-sm">Employee</span>
              </div>
              <button onClick={handleLogout} className="rounded-2xl bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 border border-red-100">
                Logout
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-4xl px-4 pt-8 space-y-6">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm text-center">
            <h2 className="text-2xl font-bold text-gray-800">Absensi Hari Ini</h2>
            <p className="mt-1 text-sm text-gray-500">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

            {/* ✨ LOGIKA PEMBLOKIRAN SAAT HARI LIBUR */}
            {isTodayHoliday ? (
              <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-8 text-center text-blue-800 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                <p className="mb-3 text-5xl">🏖️</p>
                <h3 className="text-2xl font-black mb-1">Hari Ini Libur!</h3>
                <p className="text-sm font-medium opacity-80 mb-4">{holidayDesc}</p>
                <span className="text-xs font-bold text-blue-600 bg-white/60 px-4 py-2 rounded-full border border-blue-100">
                  Form Absensi Dinonaktifkan
                </span>
              </div>
            ) : hasCheckedIn && isAttendanceDone ? (
              <div className={`mt-8 rounded-2xl p-6 border ${
                todayStatus === 'sakit' ? 'bg-orange-50 text-orange-800 border-orange-200' :
                todayStatus === 'izin' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                'bg-green-50 text-green-700 border-green-100'
              }`}>
                <h3 className="text-xl font-bold">
                  {todayStatus === 'sakit' ? '🤒 Semoga lekas sembuh!' : todayStatus === 'izin' ? '📝 Pengajuan Izin Tercatat' : '🎉 Terima kasih!'}
                </h3>
                <p className="mt-2 text-sm font-medium">
                  {todayStatus === 'sakit' || todayStatus === 'izin' 
                    ? `Data ketidakhadiran dengan alasan ${todayStatus} telah terkirim ke HRD.` 
                    : 'Anda sudah menyelesaikan absensi pulang hari ini. Selamat beristirahat!'}
                </p>
              </div>
            ) : (
              <div className="mt-8">
                {!hasCheckedIn && (
                  <div className="mx-auto mb-6 flex w-full max-w-sm rounded-xl bg-gray-100 p-1.5 shadow-inner">
                    <button onClick={() => setAttendanceTab("hadir")} className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${attendanceTab === "hadir" ? "bg-white text-blue-600 shadow" : "text-gray-500 hover:text-gray-700"}`}>
                      🏢 Hadir
                    </button>
                    <button onClick={() => setAttendanceTab("sakit")} className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${attendanceTab === "sakit" ? "bg-white text-orange-500 shadow" : "text-gray-500 hover:text-gray-700"}`}>
                      🤒 Sakit
                    </button>
                    <button onClick={() => setAttendanceTab("izin")} className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${attendanceTab === "izin" ? "bg-white text-purple-600 shadow" : "text-gray-500 hover:text-gray-700"}`}>
                      📝 Izin
                    </button>
                  </div>
                )}

                {(!hasCheckedIn && attendanceTab !== "hadir") ? (
                  <div className="mx-auto w-full max-w-sm text-left animate-in fade-in slide-in-from-bottom-4 duration-300 border border-gray-100 p-5 rounded-2xl bg-gray-50">
                    <label className="mb-2 block text-sm font-bold text-gray-700">Keterangan / Alasan {attendanceTab === "sakit" ? "Sakit" : "Izin"}</label>
                    <textarea 
                      value={reasonText} 
                      onChange={(e) => setReasonText(e.target.value)} 
                      placeholder={`Tuliskan secara detail alasan kenapa Anda ${attendanceTab} hari ini...`}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      rows={4}
                    />
                    <button 
                      onClick={() => submitAttendance("check_in")} 
                      disabled={isTakingAttendance || !reasonText.trim()} 
                      className={`mt-5 w-full rounded-xl py-3.5 font-bold text-white shadow-md transition disabled:opacity-50 ${
                        attendanceTab === "sakit" ? "bg-orange-500 hover:bg-orange-600" : "bg-purple-600 hover:bg-purple-700"
                      }`}
                    >
                      {isTakingAttendance ? "Memproses..." : `Kirim Pengajuan ${attendanceTab === "sakit" ? "Sakit" : "Izin"}`}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mx-auto mb-6 flex h-[350px] w-full max-w-sm flex-col items-center justify-center overflow-hidden rounded-3xl border-4 border-gray-100 bg-black relative shadow-inner animate-in fade-in zoom-in-95 duration-300">
                      <canvas ref={canvasRef} className="hidden" />
                      {photoPreview ? (
                        <div className="relative h-full w-full">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                          <button onClick={retakePhoto} className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-white/90 px-5 py-2.5 text-sm font-bold text-gray-800 shadow-lg backdrop-blur-md hover:bg-white transition-all border border-gray-200 hover:scale-105">
                            🔄 Ulangi Foto
                          </button>
                        </div>
                      ) : isCameraActive ? (
                        <div className="relative h-full w-full bg-black">
                          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover scale-x-[-1]" />
                          <div className="absolute inset-0 border-[40px] border-black/20 pointer-events-none rounded-[100px]"></div>
                          <button onClick={takePhoto} className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-blue-600 px-8 py-3 text-sm font-black text-white shadow-lg border-2 border-white/50 hover:bg-blue-700 hover:scale-105 transition-all">
                            📸 JEPRET
                          </button>
                        </div>
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center bg-gray-50 p-6 text-center">
                          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-3xl">📷</div>
                          <h3 className="mb-2 text-lg font-bold text-gray-800">Verifikasi Wajah</h3>
                          <p className="mb-6 text-xs font-medium text-gray-500">Foto harus diambil langsung, fitur upload galeri dinonaktifkan.</p>
                          <button onClick={startCamera} className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition hover:-translate-y-0.5">
                            Aktifkan Kamera
                          </button>
                        </div>
                      )}
                    </div>
                    {employeeLocation ? (
                      <p className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-600 border border-green-200 animate-in fade-in zoom-in-95">📍 Lokasi Terverifikasi</p>
                    ) : (
                      <p className="mb-6 text-xs font-medium text-gray-400">Izinkan akses lokasi GPS saat kamera menyala.</p>
                    )}
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                      {!hasCheckedIn && (
                        <button onClick={() => submitAttendance("check_in")} disabled={isTakingAttendance || !photo || !employeeLocation} className="rounded-xl bg-blue-600 px-8 py-3.5 font-bold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50 animate-in slide-in-from-bottom-4 duration-300">
                          {isTakingAttendance ? "Memproses..." : "1. Kirim Absen Masuk"}
                        </button>
                      )}
                      {hasCheckedIn && !hasCheckedOut && (
                        <button onClick={() => submitAttendance("check_out")} disabled={isTakingAttendance || !photo || !employeeLocation} className="rounded-xl bg-orange-500 px-8 py-3.5 font-bold text-white shadow-md transition hover:bg-orange-600 disabled:opacity-50 animate-in slide-in-from-bottom-4 duration-300">
                          {isTakingAttendance ? "Memproses..." : "2. Kirim Absen Pulang"}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end mb-2">
            <Link href="/my-attendance" className="inline-flex items-center gap-2 rounded-2xl bg-indigo-50 px-6 py-3 text-sm font-bold text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm hover:shadow hover:-translate-y-0.5">
              📅 Lihat Riwayat Lengkapku →
            </Link>
          </div>

          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 mb-6">
            <div className="rounded-3xl border bg-white p-5 shadow-sm border-blue-100">
              <h3 className="text-xs font-bold text-blue-500 uppercase tracking-wider">Total Masuk</h3>
              <p className="mt-2 text-3xl font-black text-blue-600">{myTotalMasuk} <span className="text-xs text-gray-400 font-medium">Hari</span></p>
            </div>
            <div className="rounded-3xl border bg-white p-5 shadow-sm border-orange-100">
              <h3 className="text-xs font-bold text-orange-500 uppercase tracking-wider">Sakit</h3>
              <p className="mt-2 text-3xl font-black text-orange-600">{mySickCount} <span className="text-xs text-gray-400 font-medium">Hari</span></p>
            </div>
            <div className="rounded-3xl border bg-white p-5 shadow-sm border-purple-100">
              <h3 className="text-xs font-bold text-purple-500 uppercase tracking-wider">Izin</h3>
              <p className="mt-2 text-3xl font-black text-purple-600">{myLeaveCount} <span className="text-xs text-gray-400 font-medium">Hari</span></p>
            </div>
            <div className="rounded-3xl border bg-white p-5 shadow-sm border-red-100">
              <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider">Alpa</h3>
              <p className="mt-2 text-3xl font-black text-red-600">{myAbsentCount} <span className="text-xs text-gray-400 font-medium">Hari</span></p>
            </div>
          </div>
          

          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-1 flex flex-col gap-4">
              <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-500">Tepat Waktu</h3>
                <p className="mt-2 text-4xl font-extrabold text-green-600">{myPresentCount} <span className="text-sm font-medium text-gray-400">Hari</span></p>
              </div>
              <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-500">Terlambat</h3>
                <p className="mt-2 text-4xl font-extrabold text-yellow-500">{myLateCount} <span className="text-sm font-medium text-gray-400">Hari</span></p>
              </div>
            </div>

            <div className="md:col-span-2 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-1">Tren Waktu Kedatangan</h3>
              <p className="text-xs text-gray-500 mb-6">Riwayat jam masuk kamu beberapa hari terakhir (diluar sakit/izin).</p>
              
              {chartData.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="tanggal" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
                      <YAxis domain={['dataMin - 1', 'dataMax + 1']} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={(val) => `${Math.floor(val)}:00`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="jamDesimal" stroke="#2563eb" strokeWidth={4} dot={{ r: 4, strokeWidth: 2, fill: "#fff", stroke: "#2563eb" }} activeDot={{ r: 6, stroke: "#2563eb", strokeWidth: 2, fill: "#fff" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 w-full flex items-center justify-center rounded-2xl bg-gray-50 border border-dashed border-gray-200">
                  <p className="text-sm text-gray-400">Belum ada riwayat absensi masuk untuk ditampilkan.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // TAMPILAN ADMIN / OWNER
  // ==========================================
  const donutData = [
    { name: 'Tepat Waktu', value: presentCount, color: '#10b981' }, 
    { name: 'Terlambat', value: lateCount, color: '#eab308' }, 
    { name: 'Sakit', value: sickCount, color: '#f97316' },  
    { name: 'Izin', value: leaveCount, color: '#9333ea' },  
    { name: 'Belum Absen', value: missingEmployees.length, color: '#f87171' }, 
  ];

  return (
    <main className="min-h-screen bg-gray-50/50 pb-12 font-sans">
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8">
          <div>
            <h1 className="text-xl font-extrabold text-blue-600">{companyName}</h1>
            <p className="text-xs font-medium text-gray-400">Management Dashboard</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-gray-800 capitalize">{userName}</p>
              <span className="inline-block mt-0.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border bg-purple-50 text-purple-700 border-purple-200 shadow-sm">{userRole}</span>
            </div>
            <button onClick={handleLogout} className="rounded-2xl bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 border border-red-100">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-8">
        
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6 mb-8">
          <div className="rounded-3xl border bg-white p-5 shadow-sm border-gray-100 hover:shadow-md transition">
            <h3 className="text-3xl font-black text-gray-800">{employeeCount}</h3>
            <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-wider">Total Karyawan</p>
          </div>
          <div className="rounded-3xl border bg-white p-5 shadow-sm border-green-100 hover:shadow-md transition">
            <h3 className="text-3xl font-black text-green-500">{presentCount}</h3>
            <p className="text-xs font-bold text-green-600 mt-1 uppercase tracking-wider">Tepat Waktu</p>
          </div>
          <div className="rounded-3xl border bg-white p-5 shadow-sm border-yellow-100 hover:shadow-md transition">
            <h3 className="text-3xl font-black text-yellow-500">{lateCount}</h3>
            <p className="text-xs font-bold text-yellow-600 mt-1 uppercase tracking-wider">Terlambat</p>
          </div>
          <div className="rounded-3xl border bg-white p-5 shadow-sm border-orange-100 hover:shadow-md transition">
            <h3 className="text-3xl font-black text-orange-500">{sickCount}</h3>
            <p className="text-xs font-bold text-orange-600 mt-1 uppercase tracking-wider">Sakit</p>
          </div>
          <div className="rounded-3xl border bg-white p-5 shadow-sm border-purple-100 hover:shadow-md transition">
            <h3 className="text-3xl font-black text-purple-500">{leaveCount}</h3>
            <p className="text-xs font-bold text-purple-600 mt-1 uppercase tracking-wider">Izin</p>
          </div>
          <div className="rounded-3xl border bg-white p-5 shadow-sm border-red-100 hover:shadow-md transition">
            <h3 className="text-3xl font-black text-red-400">{missingEmployees.length}</h3>
            <p className="text-xs font-bold text-red-500 mt-1 uppercase tracking-wider">Belum Absen</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <Link href="/rekap" className="flex w-full items-center justify-center rounded-2xl bg-indigo-50 py-3.5 text-sm font-bold text-indigo-600 hover:bg-indigo-100 border border-indigo-100 hover:-translate-y-0.5 transition-all mt-3">
              📊 Laporan Rekap Bulanan
            </Link>
            
            <div className="rounded-3xl border bg-white p-8 shadow-sm border-gray-100">
              <h3 className="text-xl font-bold text-gray-800">Statistik Kehadiran Hari Ini</h3>
              <p className="text-sm text-gray-500 mb-6">Proporsi seluruh status absensi karyawan hari ini.</p>
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
                <div className="h-48 w-48 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value} Karyawan`, 'Jumlah']}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-gray-800">{presentCount + lateCount + sickCount + leaveCount}</span>
                    <span className="text-[10px] font-bold uppercase text-gray-400">Data Masuk</span>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  {donutData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-sm font-bold text-gray-700">{item.name}</span>
                      </div>
                      <span className="text-sm font-black text-gray-900">
                        {item.value} <span className="text-[10px] font-medium text-gray-400">Orang</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border bg-white p-8 shadow-sm border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">Riwayat Masuk Terbaru</h3>
                <Link href="/attendance" className="rounded-full bg-blue-50 px-4 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100 transition">Lihat Log Lengkap →</Link>
              </div>
              
              <div className="space-y-4">
                {recentAttendance.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-gray-500">
                    Belum ada data absensi hari ini.
                  </div>
                ) : (
                  recentAttendance.map((item) => {
                    const timeStr = item.check_in ? new Date(item.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
                    return (
                      <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition gap-4">
                        <div className="flex items-center gap-4">
                          {item.photo_check_in ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.photo_check_in} alt="photo" className="h-14 w-14 rounded-xl object-cover border border-gray-200 shadow-sm" />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-gray-400 font-bold border border-dashed text-xs">No Pic</div>
                          )}
                          <div>
                            <div className="font-bold text-gray-900 text-base">{item.profiles?.full_name}</div>
                            
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                {(item.status === 'sakit' || item.status === 'izin') ? `Laporan: ${timeStr}` : `Masuk: ${timeStr}`}
                              </span>
                              
                              {item.latitude && item.longitude && (
                                <a href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`} target="_blank" rel="noreferrer" 
                                  className="text-[10px] font-bold text-blue-500 hover:text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
                                  📍 Lokasi Masuk
                                </a>
                              )}
                              
                              {item.latitude_out && item.longitude_out && (
                                <a href={`https://www.google.com/maps?q=${item.latitude_out},${item.longitude_out}`} target="_blank" rel="noreferrer" 
                                  className="text-[10px] font-bold text-orange-500 hover:text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100 flex items-center gap-1">
                                  📍 Lokasi Pulang
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="self-end sm:self-auto">
                          <span className={`rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-wider border ${
                            item.status === 'present' ? 'bg-green-50 text-green-600 border-green-200' : 
                            item.status === 'late' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                            item.status === 'sakit' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                            item.status === 'izin' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                            'bg-gray-50 text-gray-600 border-gray-200'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-8">
            <div className="rounded-3xl border bg-white p-8 shadow-sm border-gray-100">
              <h3 className="text-xl font-bold text-gray-800">Quick Actions</h3>
              <p className="text-sm text-gray-500 mb-6">Menu navigasi cepat admin.</p>
              <div className="space-y-3">
                <Link href="/attendance" className="flex w-full items-center justify-center rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all">
                  Approve Attendances
                </Link>
                <Link href="/employees" className="flex w-full items-center justify-center rounded-2xl border-2 border-gray-100 py-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:-translate-y-0.5 transition-all">
                  Employees Directory
                </Link>
              </div>
            </div>

            {/* ✨ PANEL ADMIN UNTUK SETTING HARI LIBUR */}
            <div className="rounded-3xl border bg-white p-8 shadow-sm border-indigo-50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-xl">🏖️</div>
                <div>
                  <h3 className="text-lg font-bold text-indigo-600">Atur Hari Libur</h3>
                  <p className="text-xs font-medium text-gray-400">Kunci form absensi karyawan.</p>
                </div>
              </div>
              <div className="space-y-3">
                <input 
                  type="date" 
                  value={inputHolidayDate} 
                  onChange={(e) => setInputHolidayDate(e.target.value)} 
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-indigo-500 focus:outline-none" 
                />
                <input 
                  type="text" 
                  placeholder="Keterangan (Cth: Libur Idul Fitri)" 
                  value={inputHolidayDesc} 
                  onChange={(e) => setInputHolidayDesc(e.target.value)} 
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-indigo-500 focus:outline-none" 
                />
                <button 
                  onClick={handleSetHoliday} 
                  disabled={isSettingHoliday} 
                  className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition disabled:opacity-50 mt-2"
                >
                  {isSettingHoliday ? "Menyimpan..." : "Simpan Hari Libur"}
                </button>
              </div>
            </div>

            <div className="rounded-3xl border bg-white p-8 shadow-sm border-red-50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-xl">⚠️</div>
                <div>
                  <h3 className="text-lg font-bold text-red-500">Belum Absen</h3>
                  <p className="text-xs font-medium text-gray-400">Harus ditegur nih!</p>
                </div>
              </div>
              <Link href="/rekap-tidak-hadir" className="flex w-full items-center justify-center rounded-2xl bg-red-50 py-3.5 text-sm font-bold text-red-600 hover:bg-red-100 border border-red-100 hover:-translate-y-0.5 transition-all mt-3">
                ⚠️ Rekap Belum Absen (Alpa)
              </Link>
              
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar mt-6">
                {missingEmployees.length === 0 ? (
                  <div className="rounded-2xl bg-green-50 p-6 text-center border border-green-100">
                    <p className="text-2xl mb-2">🎉</p>
                    <p className="text-sm font-bold text-green-700">Luar biasa!</p>
                    <p className="text-xs text-green-600 mt-1">Semua karyawan sudah absen hari ini.</p>
                  </div>
                ) : (
                  missingEmployees.map(emp => (
                    <div key={emp.id} className="group flex items-center justify-between rounded-2xl bg-gray-50 p-4 border border-gray-100 hover:border-red-200 hover:bg-red-50/50 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-xs group-hover:bg-red-100 group-hover:text-red-500 transition">
                          {emp.full_name?.charAt(0) || "?"}
                        </div>
                        <span className="text-sm font-bold text-gray-700 group-hover:text-red-700 transition">{emp.full_name}</span>
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