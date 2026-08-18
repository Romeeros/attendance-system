"use client";

import { useEffect, useState } from "react";
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
  const [companyName, setCompanyName] = useState("Company Attendance");
  const [userId, setUserId] = useState("");
  
  // STATE UNTUK ADMIN/OWNER
  const [employeeCount, setEmployeeCount] = useState(0);
  const [presentCount, setPresentCount] = useState(0);
  const [lateCount, setLateCount] = useState(0);
  const [absentCount, setAbsentCount] = useState(0);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [missingEmployees, setMissingEmployees] = useState<any[]>([]);

  // STATE UNTUK EMPLOYEE
  const [todayAttendanceId, setTodayAttendanceId] = useState<string | null>(null);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [hasCheckedOut, setHasCheckedOut] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [employeeLocation, setEmployeeLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isTakingAttendance, setIsTakingAttendance] = useState(false);
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
        setUserRole("employee");
        setLoading(false);
        return;
      }

      setUserRole(profile.role);
      if (profile?.companies) {
        const companyData = profile.companies as any;
        setCompanyName(companyData.name || "Company Attendance");
      }

      // ==========================================
      // JIKA OWNER / ADMIN
      // ==========================================
      if (profile.role === "owner" || profile.role === "admin") {
        if (!profile.company_id) {
            setLoading(false);
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        
        // ✨ PERBAIKAN: Ambil data karyawan HANYA yang BUKAN owner
        const { data: companyProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .eq("company_id", profile.company_id)
          .neq("role", "owner"); 

        const profileIds = companyProfiles?.map(p => p.id) || [];
        const totalEmp = profileIds.length;
        
        let pCount = 0, lCount = 0, aCount = 0;
        let mergedRecent: any[] = [];
        let missing: any[] = companyProfiles || []; 

        if (profileIds.length > 0) {
          const { data: todayAtt } = await supabase
            .from("attendance")
            .select("profile_id, status")
            .in("profile_id", profileIds)
            .gte("created_at", `${today}T00:00:00Z`);

          todayAtt?.forEach(att => {
            if (att.status === 'present') pCount++;
            if (att.status === 'late') lCount++;
            if (att.status === 'absent') aCount++;
          });

          // Filter siapa saja yang BELUM absen
          const attendedProfileIds = todayAtt?.map(att => att.profile_id) || [];
          missing = (companyProfiles || []).filter(p => !attendedProfileIds.includes(p.id));

          // ✨ DITAMBAHKAN: Tarik data latitude_out dan longitude_out
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

        setEmployeeCount(totalEmp); // Total yang tampil akurat tanpa owner
        setPresentCount(pCount);
        setLateCount(lCount);
        setAbsentCount(aCount);
        setRecentAttendance(mergedRecent);
        setMissingEmployees(missing); 
      } 
      // ==========================================
      // JIKA EMPLOYEE
      // ==========================================
      else {
        const today = new Date().toISOString().split('T')[0];
        const { data: myTodayAttendance } = await supabase
          .from("attendance")
          .select("*")
          .eq("profile_id", user.id)
          .gte("created_at", `${today}T00:00:00Z`)
          .lte("created_at", `${today}T23:59:59Z`)
          .maybeSingle();

        if (myTodayAttendance) {
          setTodayAttendanceId(myTodayAttendance.id);
          setHasCheckedIn(!!myTodayAttendance.check_in);
          setHasCheckedOut(!!myTodayAttendance.check_out);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setEmployeeLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          },
          () => alert("Gagal mendapatkan lokasi GPS!")
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
      const fileExt = photo.name ? photo.name.split('.').pop() : 'jpg';
      const fileName = `${userId}-${type}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('attendances')
        .upload(fileName, photo);

      if (uploadError) {
        console.error("Storage Error:", uploadError);
        alert(`❌ Gagal Upload Foto: ${uploadError.message}`);
        setIsTakingAttendance(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from('attendances').getPublicUrl(fileName);
      const photoUrl = publicUrlData.publicUrl;

      const now = new Date().toISOString();
      const currentHour = new Date().getHours();
      const attStatus = (type === "check_in" && currentHour >= 8) ? "late" : "present"; 

      if (type === "check_in") {
        const { data, error } = await supabase.from("attendance").insert({
          profile_id: userId,
          status: attStatus,
          check_in: now,
          photo_check_in: photoUrl,
          approval_status: "pending",
          latitude: employeeLocation.lat,
          longitude: employeeLocation.lng
        }).select().single(); 

        if (error) {
          console.error("Insert Error:", error);
          alert(`❌ Gagal Simpan DB (Check-in): ${error.message}`);
          setIsTakingAttendance(false);
          return;
        }

        if (data) {
          setTodayAttendanceId(data.id);
          setHasCheckedIn(true);
        }
      } else {
        if (!todayAttendanceId) {
          alert("❌ ID Absensi hari ini tidak ditemukan");
          setIsTakingAttendance(false);
          return;
        }
        
        // ✨ PERBAIKAN: Masukkan lokasi ke latitude_out dan longitude_out saat checkout
        const { error } = await supabase.from("attendance").update({
          check_out: now,
          photo_check_out: photoUrl,
          latitude_out: employeeLocation.lat,
          longitude_out: employeeLocation.lng
        }).eq("id", todayAttendanceId);

        if (error) {
          console.error("Update Error:", error);
          alert(`❌ Gagal Simpan DB (Check-out): ${error.message}`);
          setIsTakingAttendance(false);
          return;
        }
        setHasCheckedOut(true);
      }

      alert(`✅ Berhasil ${type === "check_in" ? "Check-In" : "Check-Out"}!`);
      window.location.reload();
    } catch (error: any) {
      console.error("Catch Error:", error);
      alert(`❌ Error Sistem: ${error.message || JSON.stringify(error)}`);
    }
    
    setIsTakingAttendance(false);
  };

  // --- OLAHAN DATA GRAFIK EMPLOYEE ---
  let myPresentCount = 0;
  let myLateCount = 0;
  
  myAttendanceHistory.forEach(att => {
    if (att.status === 'present') myPresentCount++;
    if (att.status === 'late') myLateCount++;
  });

  const chartData = myAttendanceHistory
    .filter(item => item.check_in)
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
    return (
      <main className="min-h-screen bg-gray-50/50 pb-12">
        <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-8">
            <div>
              <h1 className="text-xl font-extrabold text-blue-600">{companyName}</h1>
              <p className="text-xs font-medium text-gray-400">Employee Portal</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-green-700 border border-green-200">Employee</span>
              <button onClick={handleLogout} className="text-sm font-bold text-red-600">Logout</button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-4xl px-4 pt-8 space-y-6">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm text-center">
            <h2 className="text-2xl font-bold text-gray-800">Absensi Hari Ini</h2>
            <p className="mt-1 text-sm text-gray-500">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

            {hasCheckedIn && hasCheckedOut ? (
              <div className="mt-8 rounded-2xl bg-green-50 p-6 text-green-700 border border-green-100">
                <h3 className="text-xl font-bold">🎉 Terima kasih!</h3>
                <p className="mt-2 text-sm">Anda sudah menyelesaikan absensi hari ini. Selamat beristirahat!</p>
              </div>
            ) : (
              <div className="mt-8">
                <div className="mx-auto mb-6 flex h-64 w-full max-w-sm flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 relative group">
                  {photoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-center text-gray-400 p-4 transition-transform group-hover:scale-105">
                      <p className="text-3xl mb-2">📸</p>
                      <p className="text-sm font-medium">Ambil foto selfie untuk absen</p>
                    </div>
                  )}
                  <input type="file" accept="image/*" capture="user" onChange={handlePhotoCapture} className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" />
                </div>

                {employeeLocation && <p className="mb-6 text-xs font-semibold text-green-600">✓ Lokasi GPS Terdeteksi</p>}

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  {!hasCheckedIn && (
                    <button onClick={() => submitAttendance("check_in")} disabled={isTakingAttendance || !photo || !employeeLocation} className="rounded-xl bg-blue-600 px-8 py-3.5 font-bold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50">
                      {isTakingAttendance ? "Mengunggah..." : "1. Absen Masuk"}
                    </button>
                  )}
                  {hasCheckedIn && !hasCheckedOut && (
                    <button onClick={() => submitAttendance("check_out")} disabled={isTakingAttendance || !photo || !employeeLocation} className="rounded-xl bg-orange-500 px-8 py-3.5 font-bold text-white shadow-md transition hover:bg-orange-600 disabled:opacity-50">
                      {isTakingAttendance ? "Mengunggah..." : "2. Absen Pulang"}
                    </button>
                  )}
                </div>
              </div>
            )}
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
              <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-500">Total Kehadiran</h3>
                <p className="mt-2 text-4xl font-extrabold text-blue-600">{myAttendanceHistory.length} <span className="text-sm font-medium text-gray-400">Hari</span></p>
              </div>
            </div>

            <div className="md:col-span-2 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-1">Tren Waktu Kedatangan</h3>
              <p className="text-xs text-gray-500 mb-6">Riwayat jam masuk kamu beberapa hari terakhir.</p>
              
              {chartData.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis 
                        dataKey="tanggal" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#9ca3af' }} 
                        dy={10}
                      />
                      <YAxis 
                        domain={['dataMin - 1', 'dataMax + 1']} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#9ca3af' }}
                        tickFormatter={(val) => `${Math.floor(val)}:00`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="jamDesimal" 
                        stroke="#2563eb" 
                        strokeWidth={4}
                        dot={{ r: 4, strokeWidth: 2, fill: "#fff", stroke: "#2563eb" }}
                        activeDot={{ r: 6, stroke: "#2563eb", strokeWidth: 2, fill: "#fff" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 w-full flex items-center justify-center rounded-2xl bg-gray-50 border border-dashed border-gray-200">
                  <p className="text-sm text-gray-400">Belum ada riwayat absensi untuk ditampilkan.</p>
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
  
  // Data Grafik Bulat (Donut Chart)
  const donutData = [
    { name: 'Tepat Waktu', value: presentCount, color: '#10b981' }, // emerald-500
    { name: 'Terlambat', value: lateCount, color: '#eab308' }, // yellow-500
    { name: 'Belum Absen', value: missingEmployees.length, color: '#f87171' }, // red-400
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
              <p className="text-sm font-bold text-gray-800">{userEmail}</p>
              <span className="inline-block mt-0.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border bg-purple-50 text-purple-700 border-purple-200">{userRole}</span>
            </div>
            <button onClick={handleLogout} className="rounded-2xl bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 border border-red-100">Logout</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-8">
        {/* KARTU STATISTIK ATAS */}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4 mb-8">
          <div className="rounded-3xl border bg-white p-6 shadow-sm border-gray-100 hover:shadow-md transition">
            <h3 className="text-4xl font-black text-gray-800">{employeeCount}</h3>
            <p className="text-sm font-medium text-gray-500 mt-1">Total Karyawan</p>
          </div>
          <div className="rounded-3xl border bg-white p-6 shadow-sm border-gray-100 hover:shadow-md transition">
            <h3 className="text-4xl font-black text-green-500">{presentCount}</h3>
            <p className="text-sm font-medium text-gray-500 mt-1">Hadir Tepat Waktu</p>
          </div>
          <div className="rounded-3xl border bg-white p-6 shadow-sm border-gray-100 hover:shadow-md transition">
            <h3 className="text-4xl font-black text-yellow-500">{lateCount}</h3>
            <p className="text-sm font-medium text-gray-500 mt-1">Hadir Terlambat</p>
          </div>
          <div className="rounded-3xl border bg-white p-6 shadow-sm border-gray-100 hover:shadow-md transition">
            <h3 className="text-4xl font-black text-red-400">{missingEmployees.length}</h3>
            <p className="text-sm font-medium text-gray-500 mt-1">Belum Absen</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* KOLOM KIRI (LEBIH LEBAR): Grafik & Recent */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* ✨ KOTAK GRAFIK KEREN */}
            <div className="rounded-3xl border bg-white p-8 shadow-sm border-gray-100">
              <h3 className="text-xl font-bold text-gray-800">Statistik Kehadiran Hari Ini</h3>
              <p className="text-sm text-gray-500 mb-6">Proporsi karyawan yang sudah masuk vs yang belum.</p>
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
                {/* Donut Chart */}
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
                  {/* Teks di tengah Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-gray-800">{presentCount + lateCount}</span>
                    <span className="text-[10px] font-bold uppercase text-gray-400">Sudah Absen</span>
                  </div>
                </div>

                {/* Legend Cantik */}
                <div className="flex-1 space-y-4 w-full">
                  {donutData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-sm font-bold text-gray-700">{item.name}</span>
                      </div>
                      <span className="text-sm font-black text-gray-900">
                        {item.value} <span className="text-xs font-medium text-gray-400">Orang</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RECENT ATTENDANCE */}
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
                            
                            {/* ✨ PERBAIKAN: MENAMPILKAN 2 LOKASI (MASUK & PULANG) */}
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">Masuk: {timeStr}</span>
                              
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
                            item.status === 'present' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-yellow-50 text-yellow-600 border-yellow-200'
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
          
          {/* KOLOM KANAN: Menu & Missing List */}
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

            {/* DAFTAR BELUM ABSEN (TANPA OWNER) */}
            <div className="rounded-3xl border bg-white p-8 shadow-sm border-red-50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-xl">⚠️</div>
                <div>
                  <h3 className="text-lg font-bold text-red-500">Belum Absen</h3>
                  <p className="text-xs font-medium text-gray-400">Harus ditegur nih!</p>
                </div>
              </div>
              
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
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