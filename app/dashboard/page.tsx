"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // State User Umum
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState(""); 
  const [companyName, setCompanyName] = useState("Company Attendance");
  const [userId, setUserId] = useState("");
  
  // ==========================================
  // STATE UNTUK ADMIN/OWNER
  // ==========================================
  const [employeeCount, setEmployeeCount] = useState(0);
  const [presentCount, setPresentCount] = useState(0);
  const [lateCount, setLateCount] = useState(0);
  const [absentCount, setAbsentCount] = useState(0);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);

  // ==========================================
  // STATE UNTUK EMPLOYEE
  // ==========================================
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [hasCheckedOut, setHasCheckedOut] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [employeeLocation, setEmployeeLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isTakingAttendance, setIsTakingAttendance] = useState(false);
  // Data dummy untuk kalender (nanti kita ganti dari database)
  const [myAttendanceHistory, setMyAttendanceHistory] = useState<any[]>([]); 

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
        // Fallback jika profile belum ada
        setUserRole("employee");
        setLoading(false);
        return;
      }

      setUserRole(profile.role);
      
      if (profile?.companies) {
        const companyData = profile.companies as any;
        setCompanyName(companyData.name || "Company Attendance");
      }

      // ----------------------------------------
      // JIKA OWNER / ADMIN -> Muat Data Statistik
      // ----------------------------------------
      if (profile.role === "owner" || profile.role === "admin") {
        const { count: empCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
        const { count: present } = await supabase.from("attendance").select("*", { count: "exact", head: true }).eq("status", "present");
        const { count: late } = await supabase.from("attendance").select("*", { count: "exact", head: true }).eq("status", "late");
        const { count: absent } = await supabase.from("attendance").select("*", { count: "exact", head: true }).eq("status", "absent");
        
        setEmployeeCount(empCount ?? 0);
        setPresentCount(present ?? 0);
        setLateCount(late ?? 0);
        setAbsentCount(absent ?? 0);

        const { data: attendanceData } = await supabase
          .from("attendance")
          .select(`id, status, check_in, created_at, profiles (full_name)`)
          .order("created_at", { ascending: false })
          .limit(5);

        setRecentAttendance(attendanceData ?? []);
      } 
      // ----------------------------------------
      // JIKA EMPLOYEE -> Muat Data Personal
      // ----------------------------------------
      else {
        // Cek apakah hari ini sudah check-in atau check-out
        const today = new Date().toISOString().split('T')[0];
        const { data: myTodayAttendance } = await supabase
          .from("attendance")
          .select("*")
          .eq("profile_id", user.id)
          .gte("created_at", `${today}T00:00:00Z`)
          .lte("created_at", `${today}T23:59:59Z`)
          .maybeSingle();

        if (myTodayAttendance) {
          setHasCheckedIn(!!myTodayAttendance.check_in);
          setHasCheckedOut(!!myTodayAttendance.check_out);
        }

        // Ambil riwayat absen bulan ini untuk Kalender
        const { data: myHistory } = await supabase
          .from("attendance")
          .select("created_at, status")
          .eq("profile_id", user.id)
          .order("created_at", { ascending: false })
          .limit(30);
        
        setMyAttendanceHistory(myHistory ?? []);
      }

      setLoading(false);
    };

    loadDashboard();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // ==========================================
  // FUNGSI ABSENSI EMPLOYEE (KAMERA & GPS)
  // ==========================================
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      
      // Otomatis deteksi GPS saat foto diambil
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setEmployeeLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => {
            alert("Gagal mendapatkan lokasi. Pastikan izin GPS aktif di browser Anda!");
          }
        );
      }
    }
  };

  const submitAttendance = async (type: "check_in" | "check_out") => {
    if (!photo || !employeeLocation) {
      alert("Foto dan Lokasi GPS wajib ada sebelum absen!");
      return;
    }

    setIsTakingAttendance(true);
    try {
      // LOGIKA SEMENTARA: Cuma simulasi UI berhasil
      // Nanti kita akan buat API /api/attendance/submit untuk validasi radius dan upload foto
      await new Promise(resolve => setTimeout(resolve, 1500)); 
      
      alert(`Berhasil ${type === "check_in" ? "Check-In" : "Check-Out"}! (Data dikirim: Lokasi ${employeeLocation.lat}, ${employeeLocation.lng})`);
      
      if (type === "check_in") setHasCheckedIn(true);
      if (type === "check_out") setHasCheckedOut(true);
      
      setPhoto(null);
      setPhotoPreview(null);
    } catch (error) {
      alert("Gagal melakukan absensi.");
    }
    setIsTakingAttendance(false);
  };


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-xl font-semibold text-blue-600">
        <div className="flex items-center gap-3">Loading Dashboard...</div>
      </div>
    );
  }

  // ==========================================
  // RENDER TAMPILAN EMPLOYEE
  // ==========================================
  if (userRole === "employee") {
    return (
      <main className="min-h-screen bg-gray-50/50 pb-12">
        <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-8">
            <div>
              <h1 className="text-xl font-extrabold text-blue-600">{companyName}</h1>
              <p className="text-xs font-medium text-gray-400">Employee Portal</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-green-700 border border-green-200">
                Employee
              </span>
              <button onClick={handleLogout} className="text-sm font-bold text-red-600">Logout</button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-4 pt-8">
          {/* Box Absensi Hari Ini */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm text-center">
            <h2 className="text-2xl font-bold text-gray-800">Absensi Hari Ini</h2>
            <p className="mt-1 text-sm text-gray-500">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            {/* Jika sudah check-in dan check-out */}
            {hasCheckedIn && hasCheckedOut ? (
              <div className="mt-8 rounded-2xl bg-green-50 p-6 text-green-700">
                <h3 className="text-xl font-bold">🎉 Terima kasih!</h3>
                <p className="mt-2 text-sm">Anda sudah menyelesaikan absensi hari ini.</p>
              </div>
            ) : (
              <div className="mt-8">
                {/* Area Preview Foto */}
                <div className="mx-auto mb-6 flex h-64 w-full max-w-sm flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 relative">
                  {photoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-center text-gray-400 p-4">
                      <svg className="mx-auto mb-2 h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-sm font-medium">Ambil foto (selfie) untuk absen</p>
                    </div>
                  )}
                  
                  {/* Trik memanggil kamera depan (capture="user") & memblokir file upload biasa */}
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={handlePhotoCapture}
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                  />
                </div>

                {/* Status GPS */}
                {employeeLocation && (
                  <p className="mb-6 text-xs font-semibold text-green-600">
                    ✓ Lokasi GPS Terdeteksi ({employeeLocation.lat.toFixed(4)}, {employeeLocation.lng.toFixed(4)})
                  </p>
                )}

                {/* Tombol Aksi */}
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  {!hasCheckedIn && (
                    <button
                      onClick={() => submitAttendance("check_in")}
                      disabled={isTakingAttendance || !photo || !employeeLocation}
                      className="w-full sm:w-auto rounded-xl bg-blue-600 px-8 py-3.5 font-bold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isTakingAttendance ? "Memproses..." : "1. Absen Masuk (07:00)"}
                    </button>
                  )}
                  
                  {hasCheckedIn && !hasCheckedOut && (
                    <button
                      onClick={() => submitAttendance("check_out")}
                      disabled={isTakingAttendance || !photo || !employeeLocation}
                      className="w-full sm:w-auto rounded-xl bg-orange-500 px-8 py-3.5 font-bold text-white shadow-md transition hover:bg-orange-600 disabled:opacity-50"
                    >
                      {isTakingAttendance ? "Memproses..." : "2. Absen Pulang (17:00)"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Kalender / Riwayat Kehadiran */}
          <div className="mt-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900">Riwayat Kehadiran (30 Hari Terakhir)</h3>
            <p className="text-sm text-gray-500 mb-4">Hijau = Hadir, Hitam = Tidak Hadir / Alpha</p>
            
            {/* Tampilan Grid Tanggal Sederhana */}
            <div className="grid grid-cols-7 gap-2 text-center">
              {/* Dummy Render 30 hari ke belakang */}
              {Array.from({ length: 30 }).map((_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - i);
                
                // Cek status dari history database
                const historyRecord = myAttendanceHistory.find(
                  h => h.created_at.startsWith(date.toISOString().split('T')[0])
                );

                // Jika ada record = hijau, jika tidak ada/absent = hitam
                const isPresent = historyRecord && historyRecord.status === 'present';
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                return (
                  <div 
                    key={i} 
                    className={`flex h-10 w-full items-center justify-center rounded-lg text-xs font-bold ${
                      isWeekend ? 'bg-gray-100 text-gray-400' // Libur
                      : isPresent ? 'bg-green-500 text-white shadow-sm' // Hadir
                      : 'bg-gray-800 text-white' // Tidak hadir / Hitam
                    }`}
                    title={date.toDateString()}
                  >
                    {date.getDate()}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </main>
    );
  }

  // ==========================================
  // RENDER TAMPILAN ADMIN / OWNER
  // ==========================================
  return (
    <main className="min-h-screen bg-gray-50/50 pb-12">
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8">
          <div>
            <h1 className="text-xl font-extrabold text-blue-600">{companyName}</h1>
            <p className="text-xs font-medium text-gray-400">Management Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-gray-800">{userEmail}</p>
              <span className="inline-block mt-0.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border bg-purple-50 text-purple-700 border-purple-200">
                {userRole}
              </span>
            </div>
            <button onClick={handleLogout} className="rounded-2xl bg-red-50 px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-100">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-8">
        <div className="mb-8 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 sm:p-8 text-white shadow-xl">
          <h2 className="text-2xl font-extrabold">Welcome Back 👋</h2>
          <p className="mt-2 text-sm text-blue-100">Ringkasan absensi harian perusahaan Anda untuk hari ini.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border bg-white p-6 shadow-sm"><h3 className="text-3xl font-extrabold">{employeeCount}</h3><p className="text-gray-500">Total Employees</p></div>
          <div className="rounded-3xl border bg-white p-6 shadow-sm"><h3 className="text-3xl font-extrabold text-green-600">{presentCount}</h3><p className="text-gray-500">Present</p></div>
          <div className="rounded-3xl border bg-white p-6 shadow-sm"><h3 className="text-3xl font-extrabold text-yellow-500">{lateCount}</h3><p className="text-gray-500">Late</p></div>
          <div className="rounded-3xl border bg-white p-6 shadow-sm"><h3 className="text-3xl font-extrabold text-red-500">{absentCount}</h3><p className="text-gray-500">Absent</p></div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="rounded-3xl border bg-white p-6 lg:col-span-2">
            <h3 className="text-lg font-bold">Recent Attendance</h3>
            <div className="mt-6 space-y-4">
              {recentAttendance.length === 0 ? <p className="text-gray-500 text-center">Belum ada data.</p> : recentAttendance.map((item) => (
                <div key={item.id} className="flex justify-between rounded-2xl border bg-gray-50 p-4">
                  <div className="font-semibold">{item.profiles?.full_name}</div>
                  <span className="rounded-full px-3 py-1 text-xs font-bold bg-green-100 text-green-700">{item.status}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="rounded-3xl border bg-white p-6">
            <h3 className="text-lg font-bold">Quick Menu</h3>
            <div className="mt-6 space-y-3">
              <Link href="/employees" className="block w-full rounded-2xl border py-3.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50">Employees List</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}