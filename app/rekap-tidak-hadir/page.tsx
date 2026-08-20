"use client";

import { useEffect, useState, Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Profile {
  id: string;
  full_name: string;
}

interface DailyAbsence {
  dateObj: Date;
  dateString: string;
  isWeekend: boolean;
  missingEmployees: Profile[];
}

export default function LaporanTidakHadirPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("Company Attendance");
  
  // State Filter Bulan
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  const [absenceData, setAbsenceData] = useState<DailyAbsence[]>([]);
  const [totalMissingThisMonth, setTotalMissingThisMonth] = useState(0);

  useEffect(() => {
    const fetchAbsenceData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // 1. Ambil Data Perusahaan & Cek Role Admin/Owner
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

      // 2. Ambil Daftar Karyawan (Selain Owner)
      const { data: employees } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("company_id", profile.company_id)
        .neq("role", "owner");

      if (!employees || employees.length === 0) {
        setAbsenceData([]);
        setLoading(false);
        return;
      }

      const employeeIds = employees.map(emp => emp.id);

      // 3. Tentukan Rentang Tanggal
      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr) - 1; 

      const today = new Date();
      // Tentukan hari terakhir yang harus dicek (Jika bulan ini, maka sampai hari ini. Jika bulan lalu, sampai akhir bulan)
      let lastDayToCheck = new Date(year, month + 1, 0).getDate();
      if (year === today.getFullYear() && month === today.getMonth()) {
        lastDayToCheck = today.getDate();
      } else if (year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth())) {
        lastDayToCheck = 0; // Bulan di masa depan, tidak ada data
      }

      // 4. Ambil Semua Data Absensi di Bulan Tersebut
      const startDate = new Date(year, month, 1).toISOString();
      const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      const { data: attendances } = await supabase
        .from("attendance")
        .select("profile_id, created_at")
        .in("profile_id", employeeIds)
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      // 5. Olah Data: Cek siapa yang absen HARI DEMI HARI
      const dailyReports: DailyAbsence[] = [];
      let missingCount = 0;

      for (let day = lastDayToCheck; day >= 1; day--) { // Looping mundur agar tanggal terbaru di atas
        const currentDate = new Date(year, month, day);
        const dayOfWeek = currentDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Minggu = 0, Sabtu = 6

        // Cari siapa saja yang absen di tanggal ini
        const attsOnThisDate = (attendances || []).filter(att => {
          const attDate = new Date(att.created_at);
          return attDate.getFullYear() === currentDate.getFullYear() &&
                 attDate.getMonth() === currentDate.getMonth() &&
                 attDate.getDate() === currentDate.getDate();
        });

        const attendedProfileIds = attsOnThisDate.map(a => a.profile_id);
        
        // Filter karyawan yang ID-nya TIDAK ADA di attendedProfileIds
        const missingEmployees = employees.filter(emp => !attendedProfileIds.includes(emp.id));

        if (!isWeekend) {
          missingCount += missingEmployees.length;
        }

        dailyReports.push({
          dateObj: currentDate,
          dateString: currentDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
          isWeekend,
          missingEmployees
        });
      }

      setAbsenceData(dailyReports);
      setTotalMissingThisMonth(missingCount);
      setLoading(false);
    };

    fetchAbsenceData();
  }, [selectedMonth, router]);

  const getFormattedMonthName = () => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && absenceData.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-2xl font-black text-red-500 animate-pulse tracking-widest">MEMUAT DATA ALPA...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50/50 print:bg-white pb-12 font-sans">
      {/* HEADER UTAMA */}
      <header className="border-b bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-10 print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">{companyName}</h1>
            <p className="text-sm font-semibold text-gray-400 tracking-wide">Monitoring Karyawan Mangkir</p>
          </div>
          <Link href="/dashboard" className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 hover:text-red-600 transition-all">
            ← Kembali
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8 print:p-0">
        
        {/* KONTROL & JUDUL */}
        <div className="mb-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-2xl">⚠️</div>
              <h2 className="text-3xl font-extrabold text-gray-900">Rekap Belum Absen</h2>
            </div>
            <p className="text-gray-500 font-medium max-w-xl text-sm leading-relaxed">
              Daftar historis karyawan yang tidak melakukan *Check-In* sama sekali per harinya. Cocok untuk bahan evaluasi.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 print:hidden">
            <div className="flex flex-col">
              <label htmlFor="month-filter" className="text-xs font-bold text-gray-500 mb-1 ml-1 uppercase tracking-wider">Pilih Bulan</label>
              <input 
                type="month" 
                id="month-filter"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 focus:border-red-500 focus:ring-0 outline-none transition-all shadow-sm"
              />
            </div>

            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-red-500 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-red-200 hover:bg-red-600 hover:-translate-y-0.5 active:scale-95 transition-all h-[42px]"
            >
              🖨️ Cetak PDF
            </button>
          </div>
        </div>

        {/* HEADER KHUSUS PRINT */}
        <div className="hidden print:block mb-8 text-center border-b-2 border-black pb-6">
          <h1 className="text-3xl font-black text-black">{companyName}</h1>
          <h2 className="text-xl font-bold mt-2">Laporan Rekapitulasi Karyawan Tidak Hadir / Alpa</h2>
          <p className="text-md font-semibold mt-1 uppercase">Periode: {getFormattedMonthName()}</p>
        </div>

        {/* STATISTIK RINGKASAN */}
        <div className="mb-8 rounded-3xl border bg-white p-6 shadow-sm border-red-50 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Total Indikasi Mangkir</h3>
            <p className="text-sm text-gray-500">Jumlah akumulasi karyawan tidak hadir di bulan {getFormattedMonthName()} (Diluar hari libur).</p>
          </div>
          <div className="flex items-center gap-4 bg-red-50 px-6 py-3 rounded-2xl border border-red-100">
            <span className="text-4xl font-black text-red-600">{totalMissingThisMonth}</span>
            <span className="text-sm font-bold text-red-400 uppercase tracking-widest leading-tight">Kejadian<br/>Alpa</span>
          </div>
        </div>

        {/* TABEL REKAPITULASI */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-lg border border-gray-100 print:shadow-none print:border-none print:rounded-none">
          {loading ? (
            <div className="p-12 text-center text-gray-400 font-bold animate-pulse">Memperbarui data...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 print:bg-transparent print:border-b-2 print:border-black">
                  <tr>
                    <th className="px-6 py-5 font-extrabold uppercase tracking-widest text-xs w-1/4">Tanggal</th>
                    <th className="px-6 py-5 font-extrabold uppercase tracking-widest text-xs w-1/4">Status Hari</th>
                    <th className="px-6 py-5 font-extrabold uppercase tracking-widest text-xs text-center w-1/6">Total Alpa</th>
                    <th className="px-6 py-5 font-extrabold uppercase tracking-widest text-xs">Daftar Karyawan Tidak Hadir</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {absenceData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-16 text-center">
                        <p className="text-3xl mb-2">🏖️</p>
                        <p className="text-base font-bold text-gray-400">Belum ada hari yang terekam di bulan ini.</p>
                      </td>
                    </tr>
                  ) : (
                    absenceData.map((dayData, index) => {
                      // Kondisi untuk render UI
                      const isWeekend = dayData.isWeekend;
                      const hasMissing = dayData.missingEmployees.length > 0;
                      
                      return (
                        <tr key={index} className={`transition-colors print:break-inside-avoid ${isWeekend ? 'bg-gray-50/50' : 'hover:bg-red-50/20'}`}>
                          
                          {/* 1. Tanggal */}
                          <td className="px-6 py-5">
                            <span className={`font-bold ${isWeekend ? 'text-gray-500' : 'text-gray-900'} text-base`}>
                              {dayData.dateString}
                            </span>
                          </td>
                          
                          {/* 2. Status Hari */}
                          <td className="px-6 py-5">
                            {isWeekend ? (
                              <span className="inline-flex items-center rounded-lg bg-gray-200 px-3 py-1 text-xs font-bold text-gray-600 print:bg-transparent print:text-black">
                                ☕ Libur Akhir Pekan
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600 border border-blue-100 print:border-none print:bg-transparent print:text-black">
                                💼 Hari Kerja
                              </span>
                            )}
                          </td>
                          
                          {/* 3. Total Mangkir */}
                          <td className="px-6 py-5 text-center">
                            {isWeekend ? (
                              <span className="text-gray-400 font-bold">-</span>
                            ) : (
                              <span className={`inline-block min-w-[3rem] rounded-lg px-3 py-1 font-black print:border-none print:bg-transparent print:text-black ${
                                hasMissing ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-green-100 text-green-600 border border-green-200'
                              }`}>
                                {dayData.missingEmployees.length}
                              </span>
                            )}
                          </td>
                          
                          {/* 4. Daftar Nama */}
                          <td className="px-6 py-5">
                            {isWeekend ? (
                              <span className="text-xs font-medium text-gray-400 italic">Tidak ada absensi di hari libur.</span>
                            ) : !hasMissing ? (
                              <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 w-max px-3 py-1.5 rounded-xl border border-green-100 print:border-none print:bg-transparent print:text-black">
                                🎉 Semua Karyawan Hadir!
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {dayData.missingEmployees.map(emp => (
                                  <span key={emp.id} className="inline-flex items-center rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-red-600 border-2 border-red-100 shadow-sm print:border print:border-gray-300 print:text-black print:shadow-none">
                                    {emp.full_name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                        </tr>
                      );
                    })
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