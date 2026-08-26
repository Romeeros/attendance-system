"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ✨ UPDATE: Tambahkan tipe data untuk Sakit dan Izin
interface EmployeeSummary {
  id: string;
  name: string;
  present: number;
  late: number;
  sick: number;    // Kolom Sakit
  leave: number;   // Kolom Izin
  absent: number;
  totalAttendances: number; // Hanya menghitung present + late
}

export default function MonthlyReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("Company Attendance");

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  const [reportData, setReportData] = useState<EmployeeSummary[]>([]);
  const [totalCompanyAttendances, setTotalCompanyAttendances] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0); // Untuk cek apakah ada data sama sekali

  useEffect(() => {
    const fetchMonthlyReport = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role, company_id, companies(name)")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role === "employee") {
        router.push("/dashboard");
        return;
      }

      if (profile?.companies) {
        const compData = profile.companies as any;
        setCompanyName(compData.name || "Company Attendance");
      }

      const { data: employees } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("company_id", profile.company_id)
        .neq("role", "owner");

      if (!employees || employees.length === 0) {
        setReportData([]);
        setLoading(false);
        return;
      }

      const employeeIds = employees.map(emp => emp.id);

      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr) - 1; 

      const startDate = new Date(year, month, 1).toISOString();
      const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString(); 

      const { data: attendances } = await supabase
        .from("attendance")
        .select("profile_id, status")
        .in("profile_id", employeeIds)
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      setTotalRecords(attendances?.length || 0); // Simpan total semua data yang masuk

      let totalHadirAll = 0;
      const summary: EmployeeSummary[] = employees.map(emp => {
        const empAttendances = attendances?.filter(att => att.profile_id === emp.id) || [];

        const presentCount = empAttendances.filter(att => att.status === 'present').length;
        const lateCount = empAttendances.filter(att => att.status === 'late').length;
        // ✨ UPDATE: Filter data Sakit dan Izin
        const sickCount = empAttendances.filter(att => att.status === 'sakit').length;
        const leaveCount = empAttendances.filter(att => att.status === 'izin').length;
        const absentCount = empAttendances.filter(att => att.status === 'absent').length;
        
        // ✨ UPDATE: Total masuk hanya dihitung dari present dan late
        const totalMasuk = presentCount + lateCount;

        totalHadirAll += totalMasuk;

        return {
          id: emp.id,
          name: emp.full_name,
          present: presentCount,
          late: lateCount,
          sick: sickCount,
          leave: leaveCount,
          absent: absentCount,
          totalAttendances: totalMasuk,
        };
      });

      // Urutkan berdasarkan yang paling sering masuk
      summary.sort((a, b) => b.totalAttendances - a.totalAttendances);

      setReportData(summary);
      setTotalCompanyAttendances(totalHadirAll);
      setLoading(false);
    };

    fetchMonthlyReport();
  }, [selectedMonth, router]);

  const getFormattedMonthName = () => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && reportData.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          <p className="text-sm font-bold text-gray-500 animate-pulse tracking-widest">MENYIAPKAN DATA...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50/50 print:bg-white pb-12">
      <header className="border-b bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-10 print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{companyName}</h1>
            <p className="text-sm font-semibold text-gray-400 tracking-wide">Monthly Performance</p>
          </div>
          <Link href="/dashboard" className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 hover:text-blue-600 transition-all shadow-sm border border-gray-200">
            ← Kembali ke Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8 print:p-0">

        <div className="mb-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900">Rekap Kehadiran Bulanan</h2>
            <p className="mt-2 text-gray-500 font-medium">Pantau total masuk, keterlambatan, sakit, izin, dan alpa tim kamu disini.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 print:hidden">
            <div className="flex flex-col">
              <label htmlFor="month-filter" className="text-xs font-bold text-gray-500 mb-1 ml-1 uppercase tracking-wider">Filter Bulan</label>
              <input 
                type="month" 
                id="month-filter"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 focus:border-blue-500 focus:ring-0 outline-none transition-all shadow-sm bg-white cursor-pointer hover:border-blue-300"
              />
            </div>

            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 active:scale-95 transition-all h-[42px]"
            >
              🖨️ Cetak PDF
            </button>
          </div>
        </div>

        <div className="hidden print:block mb-8 text-center border-b-2 border-black pb-6">
          <h1 className="text-3xl font-black text-black">{companyName}</h1>
          <h2 className="text-xl font-bold mt-2">Laporan Rekapitulasi Kehadiran Karyawan</h2>
          <p className="text-md font-semibold mt-1 uppercase">Periode: {getFormattedMonthName()}</p>
        </div>

        {totalRecords > 0 && (
          <div className="grid gap-5 sm:grid-cols-3 mb-8 print:hidden">
            <div className="rounded-3xl border bg-white p-6 shadow-sm border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Karyawan</p>
                <h3 className="text-4xl font-black text-gray-800 mt-1">{reportData.length}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center text-2xl">👥</div>
            </div>
            <div className="rounded-3xl border bg-white p-6 shadow-sm border-blue-50 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-blue-400 uppercase tracking-wider">Total Kehadiran</p>
                <h3 className="text-4xl font-black text-blue-600 mt-1">{totalCompanyAttendances}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-2xl">📊</div>
            </div>
            <div className="rounded-3xl border bg-white p-6 shadow-sm border-green-50 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-green-500 uppercase tracking-wider">Periode Aktif</p>
                <h3 className="text-xl font-black text-green-700 mt-2">{getFormattedMonthName()}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center text-2xl">🗓️</div>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-3xl bg-white shadow-lg border border-gray-100 print:shadow-none print:border-none print:rounded-none">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500 mb-4"></div>
              <p className="text-gray-400 font-bold animate-pulse">Menghitung rekap absensi...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                
                {totalRecords > 0 && (
                  <thead className="bg-gradient-to-r from-gray-50 to-white text-gray-600 print:bg-transparent print:border-b-2 print:border-black">
                    <tr>
                      <th className="px-6 py-5 font-extrabold uppercase tracking-widest text-xs">Rank</th>
                      <th className="px-6 py-5 font-extrabold uppercase tracking-widest text-xs">Nama Karyawan</th>
                      <th className="px-6 py-5 font-extrabold uppercase tracking-widest text-xs text-center text-green-600 print:text-black">Tepat Waktu</th>
                      <th className="px-6 py-5 font-extrabold uppercase tracking-widest text-xs text-center text-yellow-500 print:text-black">Terlambat</th>
                      {/* ✨ UPDATE: Header Kolom Sakit & Izin */}
                      <th className="px-6 py-5 font-extrabold uppercase tracking-widest text-xs text-center text-orange-500 print:text-black">Sakit</th>
                      <th className="px-6 py-5 font-extrabold uppercase tracking-widest text-xs text-center text-purple-600 print:text-black">Izin</th>
                      <th className="px-6 py-5 font-extrabold uppercase tracking-widest text-xs text-center text-red-500 print:text-black">Alpa</th>
                      <th className="px-6 py-5 font-extrabold uppercase tracking-widest text-xs text-center text-blue-600 print:text-black">Total Masuk</th>
                    </tr>
                  </thead>
                )}

                <tbody className="divide-y divide-gray-50">
                  {totalRecords === 0 ? (
                    <tr>
                      {/* ✨ UPDATE: colSpan diubah jadi 8 karena ada penambahan 2 kolom */}
                      <td colSpan={8} className="px-6 py-24 text-center bg-gray-50/30">
                        <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                          
                          <div className="h-28 w-28 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center mb-6 shadow-inner border border-blue-100/50 relative">
                            <span className="text-6xl absolute -top-2 hover:-translate-y-2 transition-transform cursor-pointer">📭</span>
                            <div className="absolute -bottom-2 -right-2 h-8 w-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 text-sm">✨</div>
                          </div>
                          
                          <h3 className="text-2xl font-black text-gray-800 mb-3 tracking-tight">Wah, masih kosong nih!</h3>
                          <p className="text-sm font-medium text-gray-500 leading-relaxed px-4">
                            Belum ada satupun data absensi (termasuk izin/sakit) di bulan <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{getFormattedMonthName()}</span>. 
                            Mungkin bulannya belum dimulai, atau tim kamu lagi libur panjang? 🏖️
                          </p>
                          
                          <div className="mt-8 flex items-center gap-3 text-xs font-bold text-gray-400 bg-white px-5 py-3 rounded-2xl border border-gray-200 shadow-sm">
                            <span className="text-lg">💡</span> 
                            <span>Coba ganti filter ke bulan sebelumnya di pojok kanan atas.</span>
                          </div>

                        </div>
                      </td>
                    </tr>
                  ) : (
                    reportData.map((emp, index) => (
                      <tr key={emp.id} className="hover:bg-blue-50/30 transition-colors print:break-inside-avoid">

                        <td className="px-6 py-5">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full font-black text-xs ${
                            index === 0 ? "bg-gradient-to-br from-yellow-200 to-yellow-400 text-yellow-900 border border-yellow-300 shadow-sm shadow-yellow-200/50" :
                            index === 1 ? "bg-gradient-to-br from-gray-200 to-gray-300 text-gray-700 border border-gray-400 shadow-sm" :
                            index === 2 ? "bg-gradient-to-br from-orange-200 to-orange-300 text-orange-900 border border-orange-400 shadow-sm" :
                            "bg-gray-50 text-gray-400"
                          }`}>
                            #{index + 1}
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <div className="font-bold text-gray-900 text-base">{emp.name}</div>
                          {index === 0 && <div className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest mt-0.5">Karyawan Teladan 🏆</div>}
                        </td>

                        <td className="px-6 py-5 text-center">
                          <span className="inline-block min-w-[3rem] rounded-lg bg-green-50 px-3 py-1 font-black text-green-600 border border-green-100 print:border-none print:bg-transparent print:text-black">
                            {emp.present}
                          </span>
                        </td>

                        <td className="px-6 py-5 text-center">
                          <span className="inline-block min-w-[3rem] rounded-lg bg-yellow-50 px-3 py-1 font-black text-yellow-600 border border-yellow-100 print:border-none print:bg-transparent print:text-black">
                            {emp.late}
                          </span>
                        </td>

                        {/* ✨ UPDATE: Cell Kolom Sakit */}
                        <td className="px-6 py-5 text-center">
                          <span className="inline-block min-w-[3rem] rounded-lg bg-orange-50 px-3 py-1 font-black text-orange-500 border border-orange-100 print:border-none print:bg-transparent print:text-black">
                            {emp.sick}
                          </span>
                        </td>

                        {/* ✨ UPDATE: Cell Kolom Izin */}
                        <td className="px-6 py-5 text-center">
                          <span className="inline-block min-w-[3rem] rounded-lg bg-purple-50 px-3 py-1 font-black text-purple-600 border border-purple-100 print:border-none print:bg-transparent print:text-black">
                            {emp.leave}
                          </span>
                        </td>

                        <td className="px-6 py-5 text-center">
                          <span className="inline-block min-w-[3rem] rounded-lg bg-red-50 px-3 py-1 font-black text-red-500 border border-red-100 print:border-none print:bg-transparent print:text-black">
                            {emp.absent}
                          </span>
                        </td>

                        <td className="px-6 py-5 text-center">
                          <span className="inline-block min-w-[4rem] rounded-xl bg-blue-100 px-4 py-1.5 text-sm font-black text-blue-700 border border-blue-200 print:border-none print:bg-transparent print:text-black shadow-sm">
                            {emp.totalAttendances} Hari
                          </span>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}