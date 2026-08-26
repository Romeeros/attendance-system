"use client";

import { useEffect, useState, Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AttendancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // State User
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userId, setUserId] = useState("");

  // State Data Absensi
  const [attendances, setAttendances] = useState<any[]>([]);
  
  // State untuk Fitur Cetak PDF
  const [printDate, setPrintDate] = useState<string | null>(null);

  useEffect(() => {
    const loadAttendances = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserEmail(user.email ?? "");
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role, company_id")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      if (profile.role === "employee") {
        router.push("/dashboard");
        return;
      }
      setUserRole(profile.role);

      const { data: companyProfiles, error: profileErr } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("company_id", profile.company_id);

      if (profileErr) {
        console.error("Gagal mengambil data karyawan:", profileErr.message);
        setLoading(false);
        return;
      }

      const profileIds = companyProfiles?.map(p => p.id) || [];

      if (profileIds.length > 0) {
        // ✨ PASTIKAN KOLOM 'reason' ADA DI DALAM SELECT
        const { data: attendanceData, error } = await supabase
          .from("attendance")
          .select(`
            id,
            profile_id,
            status,
            reason,
            check_in,
            check_out,
            created_at,
            approval_status,
            photo_check_in,
            photo_check_out,
            latitude,
            longitude,
            latitude_out,
            longitude_out
          `) 
          .in("profile_id", profileIds) 
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Gagal mengambil data absensi:", error.message || error);
        } else {
          const mergedData = attendanceData?.map(att => ({
            ...att,
            profiles: {
              full_name: companyProfiles.find(p => p.id === att.profile_id)?.full_name || "Unknown"
            }
          }));
          setAttendances(mergedData ?? []);
        }
      } else {
        setAttendances([]);
      }
      
      setLoading(false);
    };

    loadAttendances();
  }, [router]);

  // Fungsi Approve / Reject
  const handleApproval = async (attendanceId: string, newStatus: 'approved' | 'rejected') => {
    if (!confirm(`Apakah Anda yakin ingin melakukan ${newStatus.toUpperCase()} pada absensi ini?`)) return;

    try {
      const { error } = await supabase
        .from("attendance")
        .update({
          approval_status: newStatus,
          approved_by: userId,
          approved_at: new Date().toISOString(),
        })
        .eq("id", attendanceId);

      if (error) throw error;

      setAttendances((prev) =>
        prev.map((item) =>
          item.id === attendanceId
            ? { ...item, approval_status: newStatus }
            : item
        )
      );
    } catch (error: any) {
      console.error(error);
      alert("Terjadi kesalahan saat memproses data.");
    }
  };

  // Fungsi untuk cetak PDF
  const handlePrintPDF = (date: string) => {
    setPrintDate(date);
    setTimeout(() => {
      window.print();
      setPrintDate(null); 
    }, 150);
  };

  // Mengelompokkan data berdasarkan tanggal
  const groupedAttendances = attendances.reduce((acc, curr) => {
    const dateObj = new Date(curr.created_at);
    const dateStr = dateObj.toLocaleDateString("id-ID", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(curr);
    return acc;
  }, {} as Record<string, any[]>);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-2xl font-black text-blue-600 animate-pulse tracking-widest">LOADING...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50/50 print:bg-white">
      <header className="border-b bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-10 print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Company Attendance</h1>
            <p className="text-sm font-semibold text-gray-400 tracking-wide">Attendance Approvals & Logs</p>
          </div>
          <div className="text-right flex items-center gap-4">
            <div className="text-right">
              <p className="font-bold text-gray-800">{userEmail}</p>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{userRole}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8 print:p-0">
        
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end mb-8 print:hidden">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900">Attendance Logs</h2>
            <p className="mt-2 text-gray-500 font-medium">Validasi, lihat foto, dan pantau lokasi absensi tim.</p>
          </div>
          <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-gray-600 shadow-sm border border-gray-200 hover:bg-gray-50 hover:text-blue-600 transition-all hover:-translate-y-0.5">
            ← Back to Dashboard
          </Link>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-lg border border-gray-100 print:shadow-none print:border-none print:rounded-none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              
              <thead className="bg-gray-50 text-gray-600 print:bg-transparent print:border-b-2 print:border-black">
                <tr>
                  <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs">Employee</th>
                  <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs print:hidden">Photo</th>
                  <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs">Time (In/Out)</th>
                  <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs">Keterangan / Lokasi</th>
                  <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs text-center">Status</th>
                  <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs text-center">Approval</th>
                  <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs text-right print:hidden">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {Object.keys(groupedAttendances).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <p className="text-4xl mb-3">📭</p>
                      <p className="text-lg font-bold text-gray-400">Belum ada data absensi sama sekali.</p>
                    </td>
                  </tr>
                ) : (
                  Object.keys(groupedAttendances).map((dateKey) => {
                    const isHiddenDuringPrint = printDate && printDate !== dateKey ? "print:hidden" : "";
                    
                    return (
                      <Fragment key={dateKey}>
                        <tr className={`bg-gradient-to-r from-blue-50/50 to-transparent border-t-2 border-blue-100 ${isHiddenDuringPrint}`}>
                          <td colSpan={7} className="px-6 py-4">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-blue-800 text-base tracking-wide">
                                📅 {dateKey}
                              </span>
                              <button 
                                onClick={() => handlePrintPDF(dateKey)}
                                className="print:hidden flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-red-200 hover:bg-red-600 hover:-translate-y-0.5 active:scale-95 transition-all"
                              >
                                📄 Download PDF
                              </button>
                            </div>
                          </td>
                        </tr>

                        {groupedAttendances[dateKey].map((item: any) => {
                          const name = item.profiles?.full_name || "Unknown";
                          const timeIn = item.check_in ? new Date(item.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--";
                          const timeOut = item.check_out ? new Date(item.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--";
                          const statusText = item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : "-";
                          
                          // ✨ LOGIKA PENGECEKAN STATUS
                          const isSakitOrIzin = item.status === 'sakit' || item.status === 'izin';

                          return (
                            <tr key={item.id} className={`hover:bg-blue-50/30 transition-colors ${isHiddenDuringPrint} print:break-inside-avoid`}>
                              
                              {/* 1. Kolom Nama & Label Kecil */}
                              <td className="px-6 py-5">
                                <div className="font-bold text-gray-900 text-base">{name}</div>
                                <div className="text-[10px] font-semibold text-gray-400 mt-0.5 uppercase tracking-wider">
                                  {item.status === 'present' ? 'Hadir' : item.status === 'late' ? 'Telat' : item.status === 'sakit' ? 'Sakit' : item.status === 'izin' ? 'Izin' : 'Alpa'}
                                </div>
                              </td>

                              {/* 2. Kolom Foto */}
                              <td className="px-6 py-5 print:hidden">
                                {isSakitOrIzin ? (
                                  <span className="text-xs italic text-gray-400 font-medium">Tanpa Foto</span>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    {item.photo_check_in ? (
                                      <a href={item.photo_check_in} target="_blank" rel="noreferrer" className="block relative group">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={item.photo_check_in} alt="In" className="h-12 w-12 rounded-xl object-cover border-2 border-white shadow-md group-hover:scale-110 transition-transform" />
                                        <span className="absolute -bottom-2 -right-2 bg-blue-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-white">IN</span>
                                      </a>
                                    ) : (
                                      <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400 border border-dashed">No In</div>
                                    )}
                                    
                                    {item.photo_check_out ? (
                                      <a href={item.photo_check_out} target="_blank" rel="noreferrer" className="block relative group">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={item.photo_check_out} alt="Out" className="h-12 w-12 rounded-xl object-cover border-2 border-white shadow-md group-hover:scale-110 transition-transform" />
                                        <span className="absolute -bottom-2 -right-2 bg-orange-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-white">OUT</span>
                                      </a>
                                    ) : (
                                      <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400 border border-dashed">No Out</div>
                                    )}
                                  </div>
                                )}
                              </td>
                              
                              {/* 3. Kolom Jam Masuk/Pulang */}
                              <td className="px-6 py-5">
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-block w-8 text-xs font-bold text-gray-400">
                                      {isSakitOrIzin ? "JAM:" : "IN:"}
                                    </span>
                                    <span className="font-black text-blue-600">{timeIn}</span>
                                  </div>
                                  
                                  {/* Hanya tampilkan OUT jika BUKAN sakit/izin */}
                                  {!isSakitOrIzin && (
                                    <div className="flex items-center gap-2">
                                      <span className="inline-block w-8 text-xs font-bold text-gray-400">OUT:</span>
                                      <span className="font-black text-orange-500">{timeOut}</span>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* 4. Kolom Keterangan / Lokasi GPS */}
                              <td className="px-6 py-5">
                                {isSakitOrIzin ? (
                                  <div className="max-w-[200px] rounded-lg bg-gray-50 border border-gray-200 p-2.5 text-xs text-gray-600 shadow-sm">
                                    <span className="font-bold text-gray-800 block mb-1">Alasan {statusText}:</span>
                                    <p className="italic">{item.reason || "Tidak ada keterangan."}</p>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-2">
                                    {item.latitude && item.longitude ? (
                                      <a href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`} target="_blank" rel="noreferrer" 
                                         className="inline-flex w-max items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 transition-all shadow-sm">
                                        📍 Masuk
                                      </a>
                                    ) : (
                                      <span className="text-[10px] text-gray-400 font-medium italic">- No GPS In -</span>
                                    )}

                                    {item.latitude_out && item.longitude_out ? (
                                      <a href={`https://www.google.com/maps?q=${item.latitude_out},${item.longitude_out}`} target="_blank" rel="noreferrer" 
                                         className="inline-flex w-max items-center gap-1.5 rounded-lg bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-600 hover:bg-orange-600 hover:text-white border border-orange-200 transition-all shadow-sm">
                                        📍 Pulang
                                      </a>
                                    ) : (
                                      <span className="text-[10px] text-gray-400 font-medium italic">- No GPS Out -</span>
                                    )}
                                  </div>
                                )}
                              </td>
                              
                              {/* 5. Kolom Status Keterlambatan */}
                              <td className="px-6 py-5 text-center">
                                <span className={`inline-flex items-center justify-center rounded-xl px-4 py-1.5 text-xs font-black tracking-widest uppercase border ${
                                  item.status === "present" ? "bg-green-50 text-green-600 border-green-200 print:bg-transparent print:border-none print:text-black" : 
                                  item.status === "late" ? "bg-yellow-50 text-yellow-600 border-yellow-200 print:bg-transparent print:border-none print:text-black" : 
                                  item.status === "sakit" ? "bg-orange-50 text-orange-600 border-orange-200 print:bg-transparent print:border-none print:text-black" :
                                  item.status === "izin" ? "bg-purple-50 text-purple-600 border-purple-200 print:bg-transparent print:border-none print:text-black" :
                                  "bg-red-50 text-red-600 border-red-200 print:bg-transparent print:border-none print:text-black"
                                }`}>
                                  {statusText}
                                </span>
                              </td>
                              
                              {/* 6. Kolom Status Approval */}
                              <td className="px-6 py-5 text-center">
                                <div className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold border ${
                                  item.approval_status === "approved" ? "bg-green-50 text-green-700 border-green-200 shadow-sm print:bg-transparent print:border-none print:shadow-none print:text-black" : 
                                  item.approval_status === "rejected" ? "bg-red-50 text-red-700 border-red-200 shadow-sm print:bg-transparent print:border-none print:shadow-none print:text-black" : 
                                  "bg-gray-100 text-gray-600 border-gray-200 print:bg-transparent print:border-none print:text-black"
                                }`}>
                                  {item.approval_status === "approved" && "✅ Approved"}
                                  {item.approval_status === "rejected" && "❌ Rejected"}
                                  {item.approval_status === "pending" && "⏳ Pending"}
                                </div>
                              </td>
                              
                              {/* 7. Kolom Aksi (Approve/Reject) */}
                              <td className="px-6 py-5 text-right print:hidden">
                                <div className="flex items-center justify-end gap-2">
                                  {item.approval_status === "pending" ? (
                                    <>
                                      <button
                                        onClick={() => handleApproval(item.id, 'approved')}
                                        className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-green-600 hover:bg-green-50 hover:text-green-700 transition-all border border-green-200 shadow-sm hover:shadow"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => handleApproval(item.id, 'rejected')}
                                        className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-all border border-red-200 shadow-sm hover:shadow"
                                      >
                                        Reject
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-md">Done</span>
                                  )}
                                </div>
                              </td>

                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}