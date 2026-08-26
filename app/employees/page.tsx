"use client";

import { useEffect, useState, Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const DIVISIONS_LIST = ["BOD", "Support", "Kurasi", "IT", "Marketing", "Finance", "HRD", "Tecno"];

type Employee = {
  id: string;
  full_name: string;
  email: string;
  role: "owner" | "admin" | "employee";
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radius?: number | null;
  division?: string | null;
};

export default function EmployeesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("");

  // State Form CREATE
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "employee">("employee");
  const [division, setDivision] = useState(""); 
  const [companyId, setCompanyId] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // State Form EDIT
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editRole, setEditRole] = useState<"admin" | "employee">("employee");
  const [editDivision, setEditDivision] = useState<string>(""); 
  const [editLat, setEditLat] = useState<string>("");
  const [editLng, setEditLng] = useState<string>("");
  const [editRadius, setEditRadius] = useState<string>("100");
  const [editPassword, setEditPassword] = useState<string>("");

  useEffect(() => {
    const loadEmployees = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserEmail(user.email ?? "");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, company_id, role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) return;

      if (profile.role !== "owner" && profile.role !== "admin") {
        router.push("/dashboard");
        return;
      }

      setCurrentUserRole(profile.role);
      setCompanyId(profile.company_id);

      if (!profile.company_id) {
        setLoading(false);
        return;
      }

      const { data: employeeData } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, phone, latitude, longitude, radius, division")
        .eq("company_id", profile.company_id)
        .order("role", { ascending: false });

      setEmployees(employeeData ?? []);
      setLoading(false);
    };

    loadEmployees();
  }, [router]);

  // CREATE USER
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role, company_id: companyId, division }),
      });
      const result = await response.json();
      if (!response.ok) {
        setErrorMessage(result.error || "Gagal membuat user.");
        setSaving(false);
        return;
      }
      window.location.reload();
    } catch (error) {
      setErrorMessage("Terjadi kesalahan saat membuat user.");
      setSaving(false);
    }
  };

  // DELETE USER 
  const handleDelete = async (employeeId: string, employeeName: string) => {
    if (!confirm(`Yakin ingin menghapus ${employeeName} secara permanen?`)) return;
    try {
      const response = await fetch("/api/users/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: employeeId }),
      });
      const result = await response.json();
      if (!response.ok) {
        alert(`❌ Gagal: ${result.error || "Kesalahan Server"}`);
        return;
      }
      setEmployees((prev) => prev.filter((emp) => emp.id !== employeeId));
    } catch (error: any) {
      alert(`❌ Terjadi kesalahan sistem: ${error.message}`);
    }
  };

  // EDIT USER
  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditRole(emp.role === "owner" ? "admin" : emp.role); 
    setEditDivision(emp.division || ""); 
    setEditLat(emp.latitude ? emp.latitude.toString() : "");
    setEditLng(emp.longitude ? emp.longitude.toString() : "");
    setEditRadius(emp.radius ? emp.radius.toString() : "100");
    setEditPassword("");
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    setSaving(true);

    try {
      const response = await fetch("/api/users/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingEmployee.id,
          role: editingEmployee.role === "owner" ? "owner" : editRole, 
          division: editDivision,
          latitude: editLat,
          longitude: editLng,
          radius: editRadius,
          password: editPassword, 
        }),
      });

      if (!response.ok) throw new Error("Gagal update data");

      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === editingEmployee.id
            ? {
                ...emp,
                role: editingEmployee.role === "owner" ? "owner" : editRole,
                division: editDivision,
                latitude: parseFloat(editLat),
                longitude: parseFloat(editLng),
                radius: parseInt(editRadius),
              }
            : emp
        )
      );
      setEditingEmployee(null);
      alert("✅ Data berhasil diupdate!"); 
    } catch (error) {
      alert("Terjadi kesalahan saat menyimpan data.");
    }
    setSaving(false);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Browser Anda tidak mendukung deteksi lokasi.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setEditLat(position.coords.latitude.toString());
        setEditLng(position.coords.longitude.toString());
      },
      (error) => {
        alert("Gagal mendapatkan lokasi. Pastikan izin GPS aktif.");
      }
    );
  };

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
        <p className="text-sm font-bold tracking-widest text-indigo-400 uppercase">Memuat Data...</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-slate-50 pb-12 font-sans">
      {/* HEADER MODERN */}
      <header className="bg-white shadow-sm sticky top-0 z-20 border-b border-slate-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Manajemen Karyawan</h1>
            <p className="text-sm font-medium text-slate-500 mt-0.5">Kelola data, divisi, dan lokasi absensi.</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="font-bold text-slate-800">{userEmail}</p>
            <span className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold uppercase text-indigo-600 mt-1">
              {currentUserRole}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* KONTROL ATAS */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
          <Link href="/dashboard" className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">
            ← Kembali ke Dashboard
          </Link>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
          >
            {showForm ? "Tutup Form" : "➕ Tambah Karyawan Baru"}
          </button>
        </div>

        {/* ========================================= */}
        {/* FORM ADD USER (DESAIN BARU) */}
        {/* ========================================= */}
        {showForm && (
          <div className="mb-8 rounded-2xl bg-white p-6 sm:p-8 shadow-sm ring-1 ring-slate-200 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-xl font-bold text-slate-900">Form Pendaftaran Karyawan</h2>
              <p className="text-sm text-slate-500 mt-1">Masukkan data diri dan pilih divisi karyawan dengan benar.</p>
            </div>
            
            {errorMessage && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600">
                ⚠️ {errorMessage}
              </div>
            )}
            
            <form onSubmit={handleCreateUser} className="grid gap-6 md:grid-cols-2">
              <div className="flex flex-col">
                <label className="mb-1.5 text-sm font-bold text-slate-700">Nama Lengkap</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Misal: Romeero Nayotama" required className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition-all focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100" />
              </div>

              <div className="flex flex-col">
                <label className="mb-1.5 text-sm font-bold text-slate-700">Alamat Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="karyawan@perusahaan.com" required className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition-all focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100" />
              </div>

              <div className="flex flex-col">
                <label className="mb-1.5 text-sm font-bold text-slate-700">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 6 Karakter" required minLength={6} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition-all focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="mb-1.5 text-sm font-bold text-slate-700">Hak Akses</label>
                  <select value={role} onChange={(e) => setRole(e.target.value as "admin" | "employee")} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition-all focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100" disabled={currentUserRole === "admin"}>
                    <option value="employee">Employee</option>
                    {currentUserRole === "owner" && <option value="admin">Admin</option>}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="mb-1.5 text-sm font-bold text-slate-700">Divisi</label>
                  <select value={division} onChange={(e) => setDivision(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition-all focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100" required>
                    <option value="" disabled>-- Pilih --</option>
                    {DIVISIONS_LIST.map((div) => (
                      <option key={div} value={div}>{div}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 mt-4 border-t border-slate-100 pt-6">
                <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-8 py-3 text-sm font-bold text-white transition-all hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-200">
                  {saving ? "Menyimpan Data..." : "Simpan Karyawan Baru"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================= */}
        {/* MODAL EDIT (DESAIN BARU) */}
        {/* ========================================= */}
        {editingEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm overflow-y-auto pt-20 pb-10">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl my-auto animate-in zoom-in-95 duration-200">
              <div className="mb-6">
                <h3 className="text-xl font-black text-slate-900">Edit Data: {editingEmployee.full_name}</h3>
                <p className="mt-1 text-sm font-medium text-slate-500">Ubah peran, divisi, koordinat, atau reset password.</p>
              </div>
              
              <form onSubmit={handleUpdateUser} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  {editingEmployee.role !== "owner" && (
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Role</label>
                      <select value={editRole} onChange={(e) => setEditRole(e.target.value as "admin" | "employee")} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100" disabled={currentUserRole === "admin"}>
                        <option value="employee">Employee</option>
                        {currentUserRole === "owner" && <option value="admin">Admin</option>}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Divisi</label>
                    <select value={editDivision} onChange={(e) => setEditDivision(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100">
                      <option value="">Pilih Divisi</option>
                      {DIVISIONS_LIST.map((div) => (
                        <option key={div} value={div}>{div}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-indigo-900">📍 Pengaturan Lokasi WFO</h4>
                    <button type="button" onClick={handleGetCurrentLocation} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                      Ambil Lokasiku
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600">Latitude</label>
                      <input type="text" value={editLat} onChange={(e) => setEditLat(e.target.value)} placeholder="-6.200" className="w-full rounded-xl border border-white bg-white px-4 py-2.5 shadow-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600">Longitude</label>
                      <input type="text" value={editLng} onChange={(e) => setEditLng(e.target.value)} placeholder="106.816" className="w-full rounded-xl border border-white bg-white px-4 py-2.5 shadow-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-600">Radius Toleransi (Meter)</label>
                    <input type="number" value={editRadius} onChange={(e) => setEditRadius(e.target.value)} placeholder="100" className="w-full rounded-xl border border-white bg-white px-4 py-2.5 shadow-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100" />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Reset Password <span className="text-slate-400 font-medium normal-case tracking-normal">(Opsional)</span></label>
                  <input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Ketik di sini untuk mereset password" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" />
                </div>

                <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
                  <button type="button" onClick={() => setEditingEmployee(null)} className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                    Batal
                  </button>
                  <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-200">
                    {saving ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================= */}
        {/* TABEL DATA KARYAWAN */}
        {/* ========================================= */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap sm:whitespace-normal">
              <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-5 font-extrabold uppercase tracking-wider text-xs">Profil Karyawan</th>
                  <th className="px-6 py-5 font-extrabold uppercase tracking-wider text-xs">Kontak & Akses</th>
                  <th className="px-6 py-5 font-extrabold uppercase tracking-wider text-xs">Titik Lokasi WFO</th>
                  <th className="px-6 py-5 text-right font-extrabold uppercase tracking-wider text-xs">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        {/* Inisial Nama Avatar */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-700 font-bold shadow-sm ring-1 ring-indigo-200">
                          {employee.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-base">{employee.full_name}</p>
                          {employee.division ? (
                            <span className="inline-block mt-0.5 rounded-md bg-purple-50 border border-purple-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-purple-700">
                              DIVISI {employee.division}
                            </span>
                          ) : (
                            <span className="inline-block mt-0.5 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                              BELUM ADA DIVISI
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 align-middle">
                      <p className="text-slate-600 font-medium">{employee.email}</p>
                      <span className="inline-block mt-1 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-blue-700">
                        {employee.role}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 align-middle">
                      {employee.latitude && employee.longitude ? (
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-700">{employee.latitude}, {employee.longitude}</span>
                          <span className="text-xs font-bold text-emerald-600 mt-0.5 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                            Radius: {employee.radius}m
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-md border border-rose-100">
                          ⚠️ Lokasi Belum Diatur
                        </span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 text-right align-middle">
                      <div className="flex items-center justify-end gap-2">
                        {(currentUserRole === "owner" || (currentUserRole === "admin" && employee.role === "employee")) && (
                          <button onClick={() => openEditModal(employee)} className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 hover:border-indigo-200 transition-colors">
                            Edit
                          </button>
                        )}
                        {((currentUserRole === "owner" && employee.role !== "owner") || (currentUserRole === "admin" && employee.role === "employee")) && (
                          <button onClick={() => handleDelete(employee.id, employee.full_name)} className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 hover:border-rose-200 transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
                            Hapus
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}