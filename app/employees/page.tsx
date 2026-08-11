"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Employee = {
  id: string;
  full_name: string;
  email: string;
  role: "owner" | "admin" | "employee";
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radius?: number | null;
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
  const [companyId, setCompanyId] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // State Form EDIT
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editRole, setEditRole] = useState<"admin" | "employee">("employee");
  const [editLat, setEditLat] = useState<string>("");
  const [editLng, setEditLng] = useState<string>("");
  const [editRadius, setEditRadius] = useState<string>("100");

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

      // Tarik juga latitude, longitude, dan radius
      const { data: employeeData } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, phone, latitude, longitude, radius")
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
        body: JSON.stringify({ name, email, password, role, company_id: companyId }),
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
    if (!confirm(`Hapus ${employeeName} permanen?`)) return;
    try {
      const response = await fetch("/api/users/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: employeeId }),
      });
      if (!response.ok) {
        alert("Gagal menghapus user.");
        return;
      }
      setEmployees((prev) => prev.filter((emp) => emp.id !== employeeId));
    } catch (error) {
      alert("Terjadi kesalahan sistem.");
    }
  };

  // EDIT USER
  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditRole(emp.role === "owner" ? "admin" : emp.role); // Cegah error tipe
    setEditLat(emp.latitude ? emp.latitude.toString() : "");
    setEditLng(emp.longitude ? emp.longitude.toString() : "");
    setEditRadius(emp.radius ? emp.radius.toString() : "100");
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
          role: editingEmployee.role === "owner" ? "owner" : editRole, // Jangan ubah owner jadi yg lain
          latitude: editLat,
          longitude: editLng,
          radius: editRadius,
        }),
      });

      if (!response.ok) throw new Error("Gagal update data");

      // Update UI langsung
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === editingEmployee.id
            ? {
                ...emp,
                role: editingEmployee.role === "owner" ? "owner" : editRole,
                latitude: parseFloat(editLat),
                longitude: parseFloat(editLng),
                radius: parseInt(editRadius),
              }
            : emp
        )
      );
      setEditingEmployee(null);
    } catch (error) {
      alert("Terjadi kesalahan saat menyimpan data.");
    }
    setSaving(false);
  };

  // Ambil lokasi GPS dari Browser
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

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
          <h1 className="text-2xl font-bold text-blue-600">Company Attendance</h1>
          <div className="text-right">
            <p className="font-semibold">{userEmail}</p>
            <p className="text-sm text-gray-500 uppercase">{currentUserRole}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-8 py-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h2 className="text-3xl font-bold">Employees</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 shadow-sm"
          >
            {showForm ? "Close Form" : "+ Add User"}
          </button>
        </div>

        {/* MODAL EDIT (Muncul menimpa layar jika editingEmployee ada) */}
        {editingEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-gray-900">Edit Profil & Lokasi</h3>
              <p className="mt-1 text-sm text-gray-500">Atur hak akses dan titik presensi untuk {editingEmployee.full_name}.</p>
              
              <form onSubmit={handleUpdateUser} className="mt-6 space-y-4">
                
                {/* ROLE - Disembunyikan jika yang diedit adalah owner */}
                {editingEmployee.role !== "owner" && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Role</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as "admin" | "employee")}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
                      disabled={currentUserRole === "admin"} // Admin gabisa ubah role
                    >
                      <option value="employee">Employee</option>
                      {currentUserRole === "owner" && <option value="admin">Admin</option>}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Latitude</label>
                    <input
                      type="text"
                      value={editLat}
                      onChange={(e) => setEditLat(e.target.value)}
                      placeholder="-6.200000"
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Longitude</label>
                    <input
                      type="text"
                      value={editLng}
                      onChange={(e) => setEditLng(e.target.value)}
                      placeholder="106.816666"
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Radius Absensi (meter)</label>
                  <input
                    type="number"
                    value={editRadius}
                    onChange={(e) => setEditRadius(e.target.value)}
                    placeholder="100"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                  />
                  <p className="mt-1 text-xs text-gray-500">Jarak maksimal karyawan bisa melakukan presensi dari titik kordinat.</p>
                </div>

                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  📍 Gunakan Lokasi Saya Saat Ini
                </button>

                <div className="mt-8 flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setEditingEmployee(null)}
                    className="rounded-xl border px-5 py-2.5 font-semibold hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ... FORM ADD USER SAMA SEPERTI SEBELUMNYA ... */}
        {showForm && (
          <div className="mt-8 rounded-2xl bg-white p-6 shadow">
            {/* Form Create (Sudah ada di kodemu sebelumnya) */}
             <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Add New User</h2>
              </div>
            </div>
            {errorMessage && <div className="mt-4 text-red-600">{errorMessage}</div>}
            <form onSubmit={handleCreateUser} className="mt-6 grid gap-5 md:grid-cols-2">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" required className="rounded-xl border px-4 py-3" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="rounded-xl border px-4 py-3" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (Min 6)" required minLength={6} className="rounded-xl border px-4 py-3" />
              <select value={role} onChange={(e) => setRole(e.target.value as "admin" | "employee")} className="rounded-xl border px-4 py-3" disabled={currentUserRole === "admin"}>
                <option value="employee">Employee</option>
                {currentUserRole === "owner" && <option value="admin">Admin</option>}
              </select>
              <div className="md:col-span-2 flex justify-end gap-3">
                <button type="submit" className="rounded-xl bg-blue-600 px-5 py-3 text-white">Create User</button>
              </div>
            </form>
          </div>
        )}

        {/* TABLE */}
        <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50/50 text-gray-600">
                <tr>
                  <th className="px-6 py-4 font-semibold">Name</th>
                  <th className="px-6 py-4 font-semibold">Email / Role</th>
                  <th className="px-6 py-4 font-semibold">Lokasi (Lat, Lng)</th>
                  <th className="px-6 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-800">{employee.full_name}</td>
                    <td className="px-6 py-4">
                      <p>{employee.email}</p>
                      <span className="inline-block mt-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                        {employee.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {employee.latitude && employee.longitude ? (
                        <>
                          <div>{employee.latitude}, {employee.longitude}</div>
                          <div className="text-xs text-blue-500">Radius: {employee.radius}m</div>
                        </>
                      ) : (
                        <span className="text-red-400 italic">Belum diatur</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(currentUserRole === "owner" || (currentUserRole === "admin" && employee.role === "employee")) && (
                          <button onClick={() => openEditModal(employee)} className="rounded-lg bg-blue-50 px-3 py-1.5 font-bold text-blue-600 hover:bg-blue-100">
                            Edit Lokasi
                          </button>
                        )}
                        {((currentUserRole === "owner" && employee.role !== "owner") || (currentUserRole === "admin" && employee.role === "employee")) && (
                          <button onClick={() => handleDelete(employee.id, employee.full_name)} className="rounded-lg bg-red-50 px-3 py-1.5 font-bold text-red-600 hover:bg-red-100">
                            Delete
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

        <div className="mt-6">
          <Link href="/dashboard" className="text-sm font-medium text-gray-500 hover:text-blue-600">← Back to Dashboard</Link>
        </div>
      </div>
    </main>
  );
}