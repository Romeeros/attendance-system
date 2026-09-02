"use client";

import { useEffect, useState } from "react";
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
    <main className="min-h-screen bg-slate-50 text-slate-900">

      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
              👥
            </div>

            <div>
              <h1 className="text-lg font-black sm:text-2xl">
                Manajemen Karyawan
              </h1>

              <p className="hidden text-sm text-slate-500 sm:block">
                Kelola data dan divisi karyawan.
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <div className="text-right">
              <p className="max-w-[220px] truncate text-sm font-bold">
                {userEmail}
              </p>

              <span className="text-[10px] font-black uppercase text-indigo-600">
                {currentRole}
              </span>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 font-black text-white">
              {userEmail.charAt(0).toUpperCase() || "U"}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* TOP BAR */}
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <Link
            href={dashboardPath(currentRole)}
            className="font-bold text-slate-500 transition hover:text-indigo-600"
          >
            ← Kembali ke Dashboard
          </Link>

          <button
            onClick={() => {
              setShowForm(!showForm);
              setError("");
            }}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
          >
            {showForm ? "× Tutup Form" : "+ Tambah Karyawan"}
          </button>
        </div>

        {/* CREATE FORM */}
        {showForm && (
          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">

            <div className="mb-6">
              <h2 className="text-xl font-black">
                Tambah Karyawan Baru
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Masukkan informasi akun karyawan.
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-600">
                ⚠️ {error}
              </div>
            )}

            <form
              onSubmit={handleCreate}
              className="grid gap-4 md:grid-cols-2"
            >
              <Input
                label="Nama Lengkap"
                value={name}
                onChange={setName}
                placeholder="Nama karyawan"
              />

              <Input
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="email@perusahaan.com"
              />

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Minimal 6 karakter"
              />

              <Select
                label="Hak Akses"
                value={role}
                onChange={(v) =>
                  setRole(v as "admin" | "employee")
                }
              >
                <option value="employee">Employee</option>
                {currentRole === "owner" && (
                  <option value="admin">Admin</option>
                )}
              </Select>

              <Select
                label="Divisi"
                value={division}
                onChange={setDivision}
              >
                <option value="">Pilih Divisi</option>
                {DIVISIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>

              <div className="md:col-span-2 md:flex md:justify-end">
                <button
                  disabled={saving}
                  className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-sm font-extrabold text-white transition hover:bg-indigo-700 disabled:opacity-50 md:w-auto"
                >
                  {saving ? "Menyimpan..." : "Simpan Karyawan"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* TITLE */}
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-indigo-500">
              Data Karyawan
            </p>

            <h2 className="text-2xl font-black">
              Daftar Karyawan
            </h2>
          </div>

          <span className="rounded-full bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600">
            {employees.length} Orang
          </span>
        </div>

        {/* MOBILE */}
        <div className="space-y-3 md:hidden">
          {employees.length === 0 ? (
            <Empty />
          ) : (
            employees.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                canEdit={canEdit(employee)}
                canDelete={canDelete(employee)}
                onEdit={() => openEdit(employee)}
                onDelete={() =>
                  handleDelete(employee.id, employee.full_name)
                }
              />
            ))
          )}
        </div>

        {/* DESKTOP */}
        <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4 text-left">
                    Profil Karyawan
                  </th>
                  <th className="px-6 py-4 text-left">
                    Kontak & Akses
                  </th>
                  <th className="px-6 py-4 text-right">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      <Empty />
                    </td>
                  </tr>
                ) : (
                  employees.map((employee) => (
                    <tr
                      key={employee.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <Avatar name={employee.full_name} />

                          <div>
                            <p className="font-extrabold">
                              {employee.full_name}
                            </p>

                            <Badge
                              text={
                                employee.division ||
                                "BELUM ADA DIVISI"
                              }
                              type="purple"
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <p className="text-sm font-semibold text-slate-600">
                          {employee.email}
                        </p>

                        <Badge
                          text={employee.role}
                          type="blue"
                        />
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          {canEdit(employee) && (
                            <button
                              onClick={() => openEdit(employee)}
                              className="rounded-lg bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                            >
                              Edit
                            </button>
                          )}

                          {canDelete(employee) && (
                            <button
                              onClick={() =>
                                handleDelete(
                                  employee.id,
                                  employee.full_name
                                )
                              }
                              className="rounded-lg bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
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
      </div>

      {/* EDIT MODAL */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
        >
          <form
            onSubmit={saveEdit}
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-indigo-500">
                  Edit Karyawan
                </p>

                <h3 className="mt-1 text-xl font-black">
                  {editing.full_name}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {editing.email}
                </p>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                className="h-9 w-9 rounded-full bg-slate-100 text-xl text-slate-500 hover:bg-slate-200"
              >
                ×
              </button>
            </div>

            <div className="space-y-5">

              {editing.role !== "owner" && (
                <Select
                  label="Role"
                  value={editRole}
                  onChange={(v) =>
                    setEditRole(v as "admin" | "employee")
                  }
                  disabled={currentRole === "admin"}
                >
                  <option value="employee">Employee</option>

                  {currentRole === "owner" && (
                    <option value="admin">Admin</option>
                  )}
                </Select>
              )}

              <Select
                label="Divisi"
                value={editDivision}
                onChange={setEditDivision}
              >
                <option value="">Pilih Divisi</option>

                {DIVISIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
                  Password Baru
                </label>

                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) =>
                    setEditPassword(e.target.value)
                  }
                  placeholder="Kosongkan jika tidak diubah"
                  className={`h-12 w-full rounded-xl border bg-white px-4 text-sm outline-none focus:ring-4 ${
                    editPassword &&
                    editPassword.length < 6
                      ? "border-rose-400 focus:ring-rose-50"
                      : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-50"
                  }`}
                />

                {editPassword &&
                  editPassword.length < 6 && (
                    <p className="mt-2 text-xs font-bold text-rose-600">
                      ⚠️ Password minimal 6 karakter.
                    </p>
                  )}
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-xs font-medium text-slate-500">
                {hasChanges()
                  ? "✓ Ada perubahan yang siap disimpan."
                  : "Belum ada perubahan."}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>

                <button
                  disabled={
                    saving ||
                    !hasChanges() ||
                    !passwordValid
                  }
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
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

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 disabled:bg-slate-100"
      >
        {children}
      </select>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-black text-indigo-700">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function Badge({
  text,
  type = "blue",
}: {
  text: string;
  type?: "blue" | "purple";
}) {
  return (
    <span
      className={`mt-1.5 inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
        type === "purple"
          ? "bg-purple-50 text-purple-700"
          : "bg-blue-50 text-blue-700"
      }`}
    >
      {text}
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar name={employee.full_name} />

        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold">
            {employee.full_name}
          </p>

          <p className="truncate text-xs text-slate-500">
            {employee.email}
          </p>

          <div className="mt-2 flex flex-wrap gap-1">
            <Badge text={employee.role} />

            <Badge
              text={employee.division || "BELUM ADA DIVISI"}
              type="purple"
            />
          </div>
        </div>
      </div>

      {(canEdit || canDelete) && (
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
          {canEdit && (
            <button
              onClick={onEdit}
              className={`rounded-xl bg-indigo-50 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 ${
                !canDelete ? "col-span-2" : ""
              }`}
            >
              Edit Data
            </button>
          )}

          {canDelete && (
            <button
              onClick={onDelete}
              className={`rounded-xl bg-rose-50 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 ${
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

function Empty() {
  return (
    <div className="p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">
        👥
      </div>

      <p className="mt-3 font-bold text-slate-700">
        Belum ada karyawan
      </p>

      <p className="mt-1 text-xs text-slate-400">
        Tambahkan karyawan menggunakan tombol di atas.
      </p>
    </div>
  );
}