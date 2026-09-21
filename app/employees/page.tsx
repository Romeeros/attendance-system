"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const DIVISIONS = [
  "BOD",
  "Support",
  "Kurasi",
  "IT",
  "Marketing",
  "Finance",
  "HRD",
  "Tecno",
];

type Role = "owner" | "admin" | "employee";

type Employee = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  phone?: string | null;
  division?: string | null;
};

const dashboardPath = (role: string) =>
  role === "owner"
    ? "/owner/dashboard"
    : role === "admin"
    ? "/admin/dashboard"
    : "/dashboard";

export default function EmployeesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [companyId, setCompanyId] = useState("");

  // CREATE
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "employee">("employee");
  const [division, setDivision] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // EDIT
  const [editing, setEditing] = useState<Employee | null>(null);
  const [editRole, setEditRole] = useState<"admin" | "employee">("employee");
  const [editDivision, setEditDivision] = useState("");
  const [editPassword, setEditPassword] = useState("");

  // =========================================================
  // UI FILTER
  // =========================================================
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | Role>("all");
  const [filterDivision, setFilterDivision] = useState("all");

  const filteredEmployees = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch =
        !keyword ||
        employee.full_name.toLowerCase().includes(keyword) ||
        employee.email.toLowerCase().includes(keyword);

      const matchesRole =
        filterRole === "all" || employee.role === filterRole;

      const matchesDivision =
        filterDivision === "all" ||
        (employee.division ?? "") === filterDivision;

      return matchesSearch && matchesRole && matchesDivision;
    });
  }, [employees, search, filterRole, filterDivision]);

  const totalAdmins = employees.filter((e) => e.role === "admin").length;
  const totalEmployees = employees.filter((e) => e.role === "employee").length;


  // =========================================================
  // LOAD
  // =========================================================

  useEffect(() => {
    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login");
          return;
        }

        setUserEmail(user.email ?? "");

        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id, role")
          .eq("id", user.id)
          .single();

        if (!profile) return;

        if (!["owner", "admin"].includes(profile.role)) {
          router.replace("/dashboard");
          return;
        }

        setCurrentRole(profile.role);
        setCompanyId(profile.company_id);

        if (!profile.company_id) return;

        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, email, role, phone, division")
          .eq("company_id", profile.company_id)
          .order("role", { ascending: false });

        setEmployees(data ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  // =========================================================
  // PERMISSION
  // =========================================================

  const canEdit = (employee: Employee) =>
    currentRole === "owner" ||
    (currentRole === "admin" && employee.role === "employee");

  const canDelete = (employee: Employee) =>
    (currentRole === "owner" && employee.role !== "owner") ||
    (currentRole === "admin" && employee.role === "employee");

  // =========================================================
  // CREATE
  // =========================================================

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password || !division) {
      setError("Mohon lengkapi semua data terlebih dahulu.");
      return;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          company_id: companyId,
          division,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result?.error || "Gagal membuat user.");
        return;
      }

      const newUser: Employee = {
        id: result.user?.id ?? crypto.randomUUID(),
        full_name: name.trim(),
        email: email.trim(),
        role,
        division,
      };

      setEmployees((prev) => [...prev, newUser]);

      setName("");
      setEmail("");
      setPassword("");
      setDivision("");
      setRole("employee");
      setShowForm(false);
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan saat membuat user.");
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // DELETE
  // =========================================================

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus ${name} secara permanen?`)) return;

    try {
      const res = await fetch("/api/users/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(`❌ ${result?.error || "Gagal menghapus user."}`);
        return;
      }

      setEmployees((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error(err);
      alert("❌ Terjadi kesalahan sistem.");
    }
  };

  // =========================================================
  // EDIT
  // =========================================================

  const openEdit = (employee: Employee) => {
    setEditing(employee);
    setEditRole(employee.role === "owner" ? "admin" : employee.role);
    setEditDivision(employee.division ?? "");
    setEditPassword("");
  };

  const closeEdit = () => {
    if (saving) return;

    setEditing(null);
    setEditRole("employee");
    setEditDivision("");
    setEditPassword("");
  };

  const passwordValid =
    !editPassword.trim() || editPassword.trim().length >= 6;

  const hasChanges = () => {
    if (!editing) return false;

    const roleChanged =
      currentRole === "owner" &&
      editing.role !== "owner" &&
      editRole !== editing.role;

    const divisionChanged =
      editDivision !== (editing.division ?? "");

    const passwordChanged =
      editPassword.trim().length > 0;

    return roleChanged || divisionChanged || passwordChanged;
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editing || !hasChanges() || !passwordValid) return;

    setSaving(true);

    try {
      const res = await fetch("/api/users/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          role: editing.role === "owner" ? "owner" : editRole,
          division: editDivision,
          password: editPassword.trim(),
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result?.error || "Gagal update data.");
      }

      setEmployees((prev) =>
        prev.map((e) =>
          e.id === editing.id
            ? {
                ...e,
                role: editing.role === "owner" ? "owner" : editRole,
                division: editDivision,
              }
            : e
        )
      );

      closeEdit();
      alert("✅ Data berhasil diupdate!");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Gagal menyimpan perubahan.");
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
          <p className="mt-4 text-sm font-bold text-slate-500">
            Memuat data...
          </p>
        </div>
      </main>
    );
  }

  // =========================================================
  // MAIN
  // =========================================================

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f6f8fc] text-slate-900">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-indigo-300/20 blur-3xl" />
        <div className="absolute right-0 top-20 h-96 w-96 rounded-full bg-blue-300/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-violet-300/10 blur-3xl" />
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={dashboardPath(currentRole)}
              className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-indigo-600"
              aria-label="Kembali ke dashboard"
            >
              <span className="text-lg transition group-hover:-translate-x-0.5">←</span>
            </Link>

            <div className="flex min-w-0 items-center gap-3">
              <div className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-violet-600 text-lg shadow-lg shadow-indigo-500/20 sm:flex">
                👥
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-base font-black tracking-tight text-slate-900 sm:text-lg">
                    Manajemen Karyawan
                  </h1>
                  <span className="hidden rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-600 sm:inline-flex">
                    {currentRole}
                  </span>
                </div>
                <p className="hidden truncate text-xs font-medium text-slate-400 sm:block">
                  Kelola akun, role, dan divisi dalam satu tempat.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden max-w-[220px] text-right lg:block">
              <p className="truncate text-xs font-extrabold text-slate-700">{userEmail}</p>
              <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-indigo-500">
                Administrator
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-black text-white shadow-md">
              {userEmail.charAt(0).toUpperCase() || "U"}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-5 sm:px-6 sm:pt-7 lg:px-8">
        {/* HERO */}
        <section className="relative mb-6 overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-700 p-5 text-white shadow-[0_25px_70px_-30px_rgba(49,46,129,0.55)] sm:p-7 lg:p-8">
          <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
          <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-violet-400/15 blur-3xl" />

          <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-indigo-100 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.9)]" />
                Employee Management
              </div>
              <h2 className="max-w-2xl text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
                Kelola tim dengan lebih{" "}
                <span className="text-indigo-300">rapi & cepat.</span>
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-indigo-100/75">
                Tambahkan akun baru, atur hak akses, kelola divisi, dan pantau seluruh anggota perusahaan dari satu halaman.
              </p>

              <button
                onClick={() => {
                  setShowForm(!showForm);
                  setError("");
                }}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-indigo-700 shadow-xl shadow-black/10 transition hover:-translate-y-0.5 hover:bg-indigo-50 sm:w-auto"
              >
                <span className="text-lg">{showForm ? "×" : "+"}</span>
                {showForm ? "Tutup Form" : "Tambah Karyawan"}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:min-w-[330px]">
              <MiniStat value={employees.length} label="Total" icon="👥" />
              <MiniStat value={totalAdmins} label="Admin" icon="🛡️" />
              <MiniStat value={totalEmployees} label="Employee" icon="💼" />
            </div>
          </div>
        </section>

        {/* CREATE FORM */}
        {showForm && (
          <section className="mb-7 overflow-hidden rounded-[28px] border border-indigo-100 bg-white shadow-[0_20px_60px_-35px_rgba(79,70,229,.35)]">
            <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 via-white to-blue-50/70 px-5 py-5 sm:px-7">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-lg text-white shadow-lg shadow-indigo-500/20">
                  ✨
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-indigo-500">
                    Create account
                  </p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">
                    Tambah Karyawan Baru
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Buat akun dan tentukan hak akses serta divisinya.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-7">
              {error && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white">!</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Nama Lengkap"
                  value={name}
                  onChange={setName}
                  placeholder="Contoh: Johan Pratama"
                  icon="👤"
                />

                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="nama@perusahaan.com"
                  icon="✉️"
                />

                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Minimal 6 karakter"
                  icon="🔐"
                />

                <Select
                  label="Hak Akses"
                  value={role}
                  onChange={(v) => setRole(v as "admin" | "employee")}
                  icon="🛡️"
                >
                  <option value="employee">Employee — akses karyawan</option>
                  {currentRole === "owner" && (
                    <option value="admin">Admin — kelola operasional</option>
                  )}
                </Select>

                <Select
                  label="Divisi"
                  value={division}
                  onChange={setDivision}
                  icon="🏢"
                >
                  <option value="">Pilih Divisi</option>
                  {DIVISIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </Select>

                <div className="flex flex-col justify-end gap-2 md:col-span-2 md:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setError("");
                    }}
                    className="rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    disabled={saving}
                    className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Membuat akun..." : "✓ Simpan Karyawan"}
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* DATA HEADER */}
        <section className="mb-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">
                Team Directory
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                Daftar Karyawan
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Cari dan kelola anggota berdasarkan role atau divisi.
              </p>
            </div>
            <span className="w-fit rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-black text-slate-600 shadow-sm">
              {filteredEmployees.length} dari {employees.length} orang
            </span>
          </div>

          {/* FILTER */}
          <div className="rounded-[24px] border border-slate-200/80 bg-white p-3 shadow-[0_12px_35px_-28px_rgba(15,23,42,.35)] sm:p-4">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">⌕</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama atau email..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                />
              </div>

              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as "all" | Role)}
                className="h-11 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-bold text-slate-600 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
              >
                <option value="all">Semua Role</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="employee">Employee</option>
              </select>

              <select
                value={filterDivision}
                onChange={(e) => setFilterDivision(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-bold text-slate-600 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
              >
                <option value="all">Semua Divisi</option>
                {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* MOBILE */}
        <div className="space-y-3 md:hidden">
          {filteredEmployees.length === 0 ? (
            <Empty hasFilter={Boolean(search || filterRole !== "all" || filterDivision !== "all")} />
          ) : (
            filteredEmployees.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                canEdit={canEdit(employee)}
                canDelete={canDelete(employee)}
                onEdit={() => openEdit(employee)}
                onDelete={() => handleDelete(employee.id, employee.full_name)}
              />
            ))
          )}
        </div>

        {/* DESKTOP */}
        <div className="hidden overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_18px_55px_-35px_rgba(15,23,42,.35)] md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Profil Karyawan
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Kontak & Akses
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Divisi
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <Empty hasFilter={Boolean(search || filterRole !== "all" || filterDivision !== "all")} />
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="group transition hover:bg-indigo-50/30">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <Avatar name={employee.full_name} />
                          <div className="min-w-0">
                            <p className="truncate font-extrabold text-slate-800">{employee.full_name}</p>
                            <p className="mt-0.5 text-[11px] text-slate-400">ID • {employee.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <p className="max-w-[260px] truncate text-sm font-semibold text-slate-600">{employee.email}</p>
                        <div className="mt-2">
                          <RoleBadge role={employee.role} />
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <DivisionBadge division={employee.division} />
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2 opacity-90 transition group-hover:opacity-100">
                          {canEdit(employee) && (
                            <button
                              onClick={() => openEdit(employee)}
                              className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-xs font-black text-indigo-700 transition hover:-translate-y-0.5 hover:bg-indigo-100"
                            >
                              ✎ Edit
                            </button>
                          )}
                          {canDelete(employee) && (
                            <button
                              onClick={() => handleDelete(employee.id, employee.full_name)}
                              className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-2.5 text-xs font-black text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-5 text-center text-[10px] font-semibold text-slate-400">
          Data karyawan dikelola berdasarkan perusahaan yang sedang aktif.
        </p>
      </div>

      {/* EDIT MODAL */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-md sm:items-center sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
        >
          <form
            onSubmit={saveEdit}
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-[30px] bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-[30px] sm:p-7"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={editing.full_name} size="large" />
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-indigo-500">Edit Karyawan</p>
                  <h3 className="mt-1 truncate text-lg font-black text-slate-900">{editing.full_name}</h3>
                  <p className="truncate text-xs text-slate-400">{editing.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xl font-bold text-slate-500 transition hover:bg-slate-200"
              >
                ×
              </button>
            </div>

            <div className="space-y-5">
              {editing.role !== "owner" && (
                <Select
                  label="Role"
                  value={editRole}
                  onChange={(v) => setEditRole(v as "admin" | "employee")}
                  disabled={currentRole === "admin"}
                  icon="🛡️"
                >
                  <option value="employee">Employee — akses karyawan</option>
                  {currentRole === "owner" && <option value="admin">Admin — kelola operasional</option>}
                </Select>
              )}

              <Select
                label="Divisi"
                value={editDivision}
                onChange={setEditDivision}
                icon="🏢"
              >
                <option value="">Pilih Divisi</option>
                {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Password Baru
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm">🔐</span>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Kosongkan jika tidak diubah"
                    className={`h-12 w-full rounded-2xl border bg-white pl-11 pr-4 text-sm outline-none transition focus:ring-4 ${
                      editPassword && editPassword.length < 6
                        ? "border-rose-400 focus:ring-rose-50"
                        : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-50"
                    }`}
                  />
                </div>
                {editPassword && editPassword.length < 6 && (
                  <p className="mt-2 text-xs font-bold text-rose-600">⚠️ Password minimal 6 karakter.</p>
                )}
              </div>

              <div className={`rounded-2xl border p-4 text-xs font-bold ${
                hasChanges()
                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : "border-slate-100 bg-slate-50 text-slate-400"
              }`}>
                {hasChanges() ? "✓ Ada perubahan yang siap disimpan." : "Belum ada perubahan."}
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={saving}
                  className="rounded-2xl border border-slate-200 px-5 py-3.5 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  disabled={saving || !hasChanges() || !passwordValid}
                  className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:bg-none disabled:text-slate-400 disabled:shadow-none"
                >
                  {saving ? "Menyimpan..." : "✓ Simpan Perubahan"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

/* =========================================================
   COMPONENT KECIL
========================================================= */

function MiniStat({
  value,
  label,
  icon,
}: {
  value: number;
  label: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-xl sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm">{icon}</span>
        <span className="text-xl font-black sm:text-2xl">{value}</span>
      </div>
      <p className="mt-2 text-[9px] font-black uppercase tracking-wider text-indigo-100/60">
        {label}
      </p>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  icon?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm">
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          className={`h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 ${
            icon ? "pl-11 pr-4" : "px-4"
          }`}
        />
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
  disabled = false,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
  icon?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-sm">
            {icon}
          </span>
        )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-bold text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 disabled:bg-slate-100 ${
            icon ? "pl-11 pr-10" : "px-4 pr-10"
          }`}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
          ▾
        </span>
      </div>
    </div>
  );
}

function Avatar({
  name,
  size = "normal",
}: {
  name: string;
  size?: "normal" | "large";
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 font-black text-white shadow-md shadow-indigo-500/15 ${
        size === "large" ? "h-12 w-12 text-base" : "h-11 w-11 text-sm"
      }`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const styles: Record<Role, string> = {
    owner: "border-amber-100 bg-amber-50 text-amber-700",
    admin: "border-indigo-100 bg-indigo-50 text-indigo-700",
    employee: "border-emerald-100 bg-emerald-50 text-emerald-700",
  };

  const icons: Record<Role, string> = {
    owner: "👑",
    admin: "🛡️",
    employee: "●",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${styles[role]}`}
    >
      <span>{icons[role]}</span>
      {role}
    </span>
  );
}

function DivisionBadge({ division }: { division?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-violet-700">
      <span>◆</span>
      {division || "Belum ada divisi"}
    </span>
  );
}

function EmployeeCard({
  employee,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  employee: Employee;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_15px_45px_-32px_rgba(15,23,42,.35)]">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Avatar name={employee.full_name} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-black text-slate-800">
                  {employee.full_name}
                </p>
                <p className="mt-1 truncate text-[11px] font-medium text-slate-400">
                  {employee.email}
                </p>
              </div>
              <RoleBadge role={employee.role} />
            </div>

            <div className="mt-3">
              <DivisionBadge division={employee.division} />
            </div>
          </div>
        </div>
      </div>

      {(canEdit || canDelete) && (
        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50/60 p-3">
          {canEdit && (
            <button
              onClick={onEdit}
              className={`rounded-xl bg-indigo-50 py-2.5 text-xs font-black text-indigo-700 transition hover:bg-indigo-100 ${
                !canDelete ? "col-span-2" : ""
              }`}
            >
              ✎ Edit Data
            </button>
          )}

          {canDelete && (
            <button
              onClick={onDelete}
              className={`rounded-xl bg-rose-50 py-2.5 text-xs font-black text-rose-700 transition hover:bg-rose-100 ${
                !canEdit ? "col-span-2" : ""
              }`}
            >
              Hapus
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Empty({ hasFilter = false }: { hasFilter?: boolean }) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-slate-100 text-2xl shadow-inner">
        {hasFilter ? "⌕" : "👥"}
      </div>
      <p className="mt-4 font-black text-slate-700">
        {hasFilter ? "Data tidak ditemukan" : "Belum ada karyawan"}
      </p>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-400">
        {hasFilter
          ? "Coba ubah kata kunci atau filter yang digunakan."
          : "Tambahkan karyawan menggunakan tombol Tambah Karyawan."}
      </p>
    </div>
  );
}
