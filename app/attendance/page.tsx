"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    const loadAttendances = async () => {
      // 1. Cek user yang login
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserEmail(user.email ?? "");
      setUserId(user.id);

      // 2. Ambil profile untuk cek role & company_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role, company_id")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      // 3. Hanya Owner & Admin yang boleh mengakses halaman ini
      if (profile.role === "employee") {
        router.push("/dashboard");
        return;
      }
      setUserRole(profile.role);

      // 4. MENGHINDARI ERROR AMBIGUOUS JOIN: Ambil daftar karyawan di perusahaan ini dulu
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

      // 5. Jika ada karyawan, baru kita tarik riwayat absensinya (TERMASUK FOTO)
      if (profileIds.length > 0) {
        const { data: attendanceData, error } = await supabase
          .from("attendance")
          .select(`
            id,
            profile_id,
            status,
            check_in,
            check_out,
            created_at,
            approval_status,
            photo_check_in,
            photo_check_out
          `)
          .in("profile_id", profileIds) // Hanya ambil absensi milik ID karyawan di atas
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Gagal mengambil data absensi:", error.message || error);
        } else {
          // Gabungkan data nama dari profil ke dalam data absensi agar tabel UI tetap jalan
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

  // Fungsi untuk Approve atau Reject absensi
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

      alert(`Absensi berhasil di-${newStatus}.`);
    } catch (error: any) {
      console.error(error);
      alert("Terjadi kesalahan saat memproses data.");
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-xl font-semibold text-blue-600 animate-pulse">Loading Attendances...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="border-b bg-white shadow-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">Company Attendance</h1>
            <p className="text-sm text-gray-500">Attendance Approvals & Logs</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-gray-800">{userEmail}</p>
            <p className="text-sm text-gray-500 uppercase">{userRole}</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-8 py-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Attendance Logs</h2>
            <p className="mt-2 text-gray-500">Validasi, lihat foto, dan pantau absensi karyawan Anda di sini.</p>
          </div>
        </div>

        {/* Tabel Absensi */}
        <div className="mt-8 overflow-hidden rounded-3xl bg-white shadow-sm border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50/50 text-gray-600">
                <tr>
                  <th className="px-6 py-4 font-semibold">Employee</th>
                  <th className="px-6 py-4 font-semibold">Photo (In / Out)</th>
                  <th className="px-6 py-4 font-semibold">Date & Time</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-center">Approval</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {attendances.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Belum ada data absensi yang masuk.
                    </td>
                  </tr>
                ) : (
                  attendances.map((item) => {
                    const name = item.profiles?.full_name || "Unknown";
                    const statusText = item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : "-";
                    
                    // Format Waktu
                    const dateObj = new Date(item.created_at);
                    const dateStr = dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
                    const timeIn = item.check_in ? new Date(item.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--";
                    const timeOut = item.check_out ? new Date(item.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--";

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-800">
                          {name}
                        </td>

                        {/* Kolom Foto Baru */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {/* Foto Check In */}
                            {item.photo_check_in ? (
                              <a href={item.photo_check_in} target="_blank" rel="noreferrer" title="Lihat Foto Masuk">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={item.photo_check_in} alt="In" className="h-10 w-10 rounded-lg object-cover border border-gray-200 shadow-sm hover:scale-110 transition-transform" />
                              </a>
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 border border-dashed">No In</div>
                            )}

                            {/* Foto Check Out */}
                            {item.photo_check_out ? (
                              <a href={item.photo_check_out} target="_blank" rel="noreferrer" title="Lihat Foto Pulang">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={item.photo_check_out} alt="Out" className="h-10 w-10 rounded-lg object-cover border border-gray-200 shadow-sm hover:scale-110 transition-transform" />
                              </a>
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 border border-dashed">No Out</div>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 text-gray-600">
                          <div className="font-medium text-gray-900">{dateStr}</div>
                          <div className="text-xs mt-1">In: <span className="font-semibold text-blue-600">{timeIn}</span> | Out: <span className="font-semibold text-orange-500">{timeOut}</span></div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                            item.status === "present" ? "bg-green-100 text-green-700" : 
                            item.status === "late" ? "bg-yellow-100 text-yellow-700" : 
                            "bg-red-100 text-red-700"
                          }`}>
                            {statusText}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
                            item.approval_status === "approved" ? "bg-green-50 text-green-700 border-green-200" : 
                            item.approval_status === "rejected" ? "bg-red-50 text-red-700 border-red-200" : 
                            "bg-orange-50 text-orange-700 border-orange-200"
                          }`}>
                            {item.approval_status === "approved" && "✅ Approved"}
                            {item.approval_status === "rejected" && "❌ Rejected"}
                            {item.approval_status === "pending" && "⏳ Pending"}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {item.approval_status === "pending" ? (
                              <>
                                <button
                                  onClick={() => handleApproval(item.id, 'approved')}
                                  className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 hover:bg-green-100 transition-colors border border-green-200"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleApproval(item.id, 'rejected')}
                                  className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors border border-red-200"
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-gray-400 italic">No action needed</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}