"use client";

import { useEffect, useState, Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function MyAttendancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const fetchHistory = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Ambil nama user
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
        
      if (profile) setUserName(profile.full_name || "Employee");

      // Ambil seluruh riwayat absensi user ini dari yang terbaru
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setHistory(data);
      }
      setLoading(false);
    };

    fetchHistory();
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50/50 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-8">
          <div>
            <h1 className="text-xl font-extrabold text-blue-600">Riwayat Absensiku</h1>
            <p className="text-xs font-medium text-gray-400 capitalize">{userName}</p>
          </div>
          <Link href="/dashboard" className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 hover:text-blue-600 transition-all shadow-sm border border-gray-200">
            ← Kembali
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold text-gray-900">Detail Kehadiran</h2>
          <p className="mt-1 text-sm text-gray-500">Pantau catatan jam masuk, pulang, serta riwayat izin/sakit kamu di sini.</p>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-lg border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs">Tanggal</th>
                  <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs">Jam Masuk</th>
                  <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs">Jam Pulang</th>
                  <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs text-center">Status</th>
                  <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-gray-500">
                      <p className="text-3xl mb-2">📭</p>
                      <p className="font-bold">Belum ada riwayat absensi.</p>
                    </td>
                  </tr>
                ) : (
                  history.map((item) => {
                    const dateObj = new Date(item.created_at);
                    const dateStr = dateObj.toLocaleDateString("id-ID", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                    
                    const timeIn = item.check_in ? new Date(item.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--";
                    const timeOut = item.check_out ? new Date(item.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--";
                    
                    const isSakitOrIzin = item.status === 'sakit' || item.status === 'izin';

                    return (
                      <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                        {/* Tanggal */}
                        <td className="px-6 py-4 font-bold text-gray-800">{dateStr}</td>
                        
                        {/* Jam Masuk */}
                        <td className="px-6 py-4">
                          {isSakitOrIzin ? (
                            <span className="text-gray-400 italic text-xs">-</span>
                          ) : (
                            <span className="font-black text-blue-600">{timeIn}</span>
                          )}
                        </td>

                        {/* Jam Pulang */}
                        <td className="px-6 py-4">
                          {isSakitOrIzin ? (
                            <span className="text-gray-400 italic text-xs">-</span>
                          ) : (
                            item.check_out ? (
                              <span className="font-black text-orange-500">{timeOut}</span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600 border border-red-100">
                                ⚠️ Belum Pulang
                              </span>
                            )
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs font-black tracking-widest uppercase border ${
                            item.status === 'present' ? 'bg-green-50 text-green-600 border-green-200' : 
                            item.status === 'late' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                            item.status === 'sakit' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                            item.status === 'izin' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                            'bg-gray-50 text-gray-600 border-gray-200'
                          }`}>
                            {item.status}
                          </span>
                        </td>

                        {/* Keterangan */}
                        <td className="px-6 py-4">
                          {item.reason ? (
                            <span className="text-xs font-medium text-gray-600 italic">"{item.reason}"</span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
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