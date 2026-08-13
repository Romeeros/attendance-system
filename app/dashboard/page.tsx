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
  ResponsiveContainer
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

      // JIKA OWNER / ADMIN
      if (profile.role === "owner" || profile.role === "admin") {
        if (!profile.company_id) {
            setLoading(false);
            return;
        }

        const { count: empCount } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("company_id", profile.company_id);
        const today = new Date().toISOString().split('T')[0];
        
        // Ambil data karyawan
        const { data: companyProfiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("company_id", profile.company_id);

        const profileIds = companyProfiles?.map(p => p.id) || [];
        
        let pCount = 0, lCount = 0, aCount = 0;
        let mergedRecent: any[] = [];

        if (profileIds.length > 0) {
          const { data: todayAtt } = await supabase
            .from("attendance")
            .select("status")
            .in("profile_id", profileIds)
            .gte("created_at", `${today}T00:00:00Z`);

          todayAtt?.forEach(att => {
            if (att.status === 'present') pCount++;
            if (att.status === 'late') lCount++;
            if (att.status === 'absent') aCount++;
          });

          // ✨ TAMBAHAN: Tarik juga latitude dan longitude agar admin bisa lihat
          const { data: attendanceData } = await supabase
            .from("attendance")
            .select(`id, profile_id, status, check_in, photo_check_in, created_at, latitude, longitude`)
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

        setEmployeeCount(empCount ?? 0);
        setPresentCount(pCount);
        setLateCount(lCount);
        setAbsentCount(aCount);
        setRecentAttendance(mergedRecent);
      } 
      // JIKA EMPLOYEE
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
        // ✨ TAMBAHAN PERBAIKAN: Masukkan latitude dan longitude ke database
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
        const { error } = await supabase.from("attendance").update({
          check_out: now,
          photo_check_out: photoUrl,
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

  // --- OLAHAN DATA UNTUK GRAFIK & SUMMARY EMPLOYEE ---
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

  // JIKA ADMIN / OWNER
  const totalAttended = presentCount + lateCount; 
  const attendanceRate = employeeCount > 0 ? Math.round((totalAttended / employeeCount) * 100) : 0;
  const lateRate = totalAttended > 0 ? Math.round((lateCount / totalAttended) * 100) : 0;

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
              <span className="inline-block mt-0.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border bg-purple-50 text-purple-700 border-purple-200">{userRole}</span>
            </div>
            <button onClick={handleLogout} className="rounded-2xl bg-red-50 px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-100">Logout</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-8">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border bg-white p-6 shadow-sm"><h3 className="text-3xl font-extrabold">{employeeCount}</h3><p className="text-gray-500">Total Employees</p></div>
          <div className="rounded-3xl border bg-white p-6 shadow-sm"><h3 className="text-3xl font-extrabold text-green-600">{presentCount}</h3><p className="text-gray-500">On Time</p></div>
          <div className="rounded-3xl border bg-white p-6 shadow-sm"><h3 className="text-3xl font-extrabold text-yellow-500">{lateCount}</h3><p className="text-gray-500">Late</p></div>
          <div className="rounded-3xl border bg-white p-6 shadow-sm"><h3 className="text-3xl font-extrabold text-red-500">{absentCount}</h3><p className="text-gray-500">Absent / Not In</p></div>
        </div>

        <div className="mt-8 rounded-3xl border bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold">Grafik Kehadiran Hari Ini</h3>
          <p className="text-sm text-gray-500 mb-6">Persentase karyawan yang sudah absen vs yang belum.</p>
          
          <div className="w-full h-8 flex rounded-full overflow-hidden bg-gray-100">
            <div style={{ width: `${attendanceRate - lateRate}%` }} className="bg-green-500 h-full flex items-center justify-center text-xs font-bold text-white transition-all">
              {attendanceRate - lateRate > 5 ? `${attendanceRate - lateRate}%` : ''}
            </div>
            <div style={{ width: `${lateRate}%` }} className="bg-yellow-400 h-full flex items-center justify-center text-xs font-bold text-white transition-all">
              {lateRate > 5 ? `${lateRate}%` : ''}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="rounded-3xl border bg-white p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Recent Attendance</h3>
              <Link href="/attendance" className="text-sm font-semibold text-blue-600 hover:underline">View All →</Link>
            </div>
            
            <div className="mt-6 space-y-4">
              {recentAttendance.length === 0 ? <p className="text-gray-500 text-center">Belum ada data.</p> : recentAttendance.map((item) => {
                const timeStr = item.check_in ? new Date(item.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
                return (
                  <div key={item.id} className="flex items-center justify-between rounded-2xl border bg-gray-50 p-4">
                    <div className="flex items-center gap-4">
                      {item.photo_check_in ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.photo_check_in} alt="photo" className="h-12 w-12 rounded-xl object-cover border border-gray-200 shadow-sm" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-200 text-gray-500 font-bold">?</div>
                      )}
                      <div>
                        <div className="font-semibold text-gray-800">{item.profiles?.full_name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <span>In: {timeStr}</span>
                          {/* ✨ TAMBAHAN: Link untuk melihat lokasi di Google Maps bagi Admin */}
                          {item.latitude && item.longitude && (
                            <a 
                              href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="font-medium text-blue-500 hover:underline"
                            >
                              📍 Lihat Lokasi
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {item.status}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
          
          <div className="rounded-3xl border bg-white p-6">
            <h3 className="text-lg font-bold">Quick Menu</h3>
            <div className="mt-6 space-y-3">
              <Link href="/attendance" className="block w-full rounded-2xl bg-blue-600 py-3.5 text-center text-sm font-semibold text-white shadow-md hover:bg-blue-700">Approve Attendances</Link>
              <Link href="/employees" className="block w-full rounded-2xl border py-3.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50">Employees List</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}