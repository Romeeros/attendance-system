"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const DIVISIONS_LIST = [
  "BOD",
  "Support",
  "Kurasi",
  "IT",
  "Marketing",
  "Finance",
  "HRD",
  "Tecno",
];

type Employee = {
  id: string;
  full_name: string;
  email: string;
  role: "owner" | "admin" | "employee";
  phone?: string | null;
  division?: string | null;
};

export default function EmployeesPage() {
  const router = useRouter();

  // =========================================================
  // STATE
  // =========================================================

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [userEmail, setUserEmail] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("");

  // =========================================================
  // CREATE USER
  // =========================================================

  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [role, setRole] =
    useState<"admin" | "employee">("employee");

  const [division, setDivision] = useState("");
  const [companyId, setCompanyId] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // =========================================================
  // EDIT USER
  // =========================================================

  const [editingEmployee, setEditingEmployee] =
    useState<Employee | null>(null);

  const [editRole, setEditRole] =
    useState<"admin" | "employee">("employee");

  const [editDivision, setEditDivision] = useState("");
  const [editPassword, setEditPassword] = useState("");

  // =========================================================
  // LOAD DATA
  // =========================================================

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        setUserEmail(user.email ?? "");

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("id, company_id, role")
            .eq("id", user.id)
            .single();

        if (profileError || !profile) {
          setLoading(false);
          return;
        }

        // Hanya owner dan admin
        if (
          profile.role !== "owner" &&
          profile.role !== "admin"
        ) {
          router.push("/dashboard");
          return;
        }

        setCurrentUserRole(profile.role);
        setCompanyId(profile.company_id);

        if (!profile.company_id) {
          setLoading(false);
          return;
        }

        const { data: employeeData, error } =
          await supabase
            .from("profiles")
            .select(
              "id, full_name, email, role, phone, division"
            )
            .eq("company_id", profile.company_id)
            .order("role", { ascending: false });

        if (error) {
          console.error(
            "Gagal mengambil data karyawan:",
            error
          );
        }

        setEmployees(employeeData ?? []);
      } catch (error) {
        console.error(
          "Gagal memuat data karyawan:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, [router]);

  // =========================================================
  // CREATE USER
  // =========================================================

  const handleCreateUser = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setErrorMessage("");

    if (
      !name.trim() ||
      !email.trim() ||
      !password.trim() ||
      !division
    ) {
      setErrorMessage(
        "Mohon lengkapi semua data terlebih dahulu."
      );
      return;
    }

    if (password.trim().length < 6) {
      setErrorMessage(
        "Password harus memiliki minimal 6 karakter."
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/users/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password: password.trim(),
            role,
            company_id: companyId,
            division,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setErrorMessage(
          result?.error || "Gagal membuat user."
        );

        setSaving(false);
        return;
      }

      window.location.reload();
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Terjadi kesalahan saat membuat user."
      );

      setSaving(false);
    }
  };

  // =========================================================
  // DELETE USER
  // =========================================================

  const handleDelete = async (
    employeeId: string,
    employeeName: string
  ) => {
    const confirmed = confirm(
      `Yakin ingin menghapus ${employeeName} secara permanen?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        "/api/users/delete",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: employeeId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        alert(
          `❌ Gagal: ${
            result?.error || "Kesalahan Server"
          }`
        );

        return;
      }

      setEmployees((prev) =>
        prev.filter(
          (employee) => employee.id !== employeeId
        )
      );
    } catch (error: any) {
      console.error(error);

      alert(
        `❌ Terjadi kesalahan sistem: ${
          error?.message || "Unknown error"
        }`
      );
    }
  };

  // =========================================================
  // OPEN EDIT MODAL
  // =========================================================

  const openEditModal = (
    employee: Employee
  ) => {
    setEditingEmployee(employee);

    setEditRole(
      employee.role === "owner"
        ? "admin"
        : employee.role
    );

    setEditDivision(
      employee.division || ""
    );

    // Password selalu kosong ketika modal dibuka
    setEditPassword("");

    setSaving(false);
  };

  // =========================================================
  // CLOSE EDIT MODAL
  // =========================================================

  const closeEditModal = () => {
    if (saving) return;

    setEditingEmployee(null);

    setEditPassword("");
    setEditDivision("");
    setEditRole("employee");
  };

  // =========================================================
  // PASSWORD VALIDATION
  // =========================================================

  /*
   * Password:
   *
   * ""       = valid karena artinya tidak mengganti password
   * 1 - 5    = tidak valid
   * >= 6     = valid
   */

  const isPasswordValid =
    editPassword.trim() === "" ||
    editPassword.trim().length >= 6;

  // =========================================================
  // CEK PERUBAHAN DATA
  // =========================================================

  const hasEditChanges = () => {
    if (!editingEmployee) return false;

    const originalRole =
      editingEmployee.role === "owner"
        ? "admin"
        : editingEmployee.role;

    const originalDivision =
      editingEmployee.division || "";

    // Owner boleh mengubah role
    const roleChanged =
      currentUserRole === "owner" &&
      editingEmployee.role !== "owner" &&
      editRole !== originalRole;

    // Owner maupun admin boleh mengubah division
    const divisionChanged =
      editDivision !== originalDivision;

    // Password dianggap berubah kalau ada isinya
    const passwordChanged =
      editPassword.trim().length > 0;

    return (
      roleChanged ||
      divisionChanged ||
      passwordChanged
    );
  };

  // =========================================================
  // BOLEH SIMPAN?
  // =========================================================

  const canSaveEdit =
    hasEditChanges() &&
    isPasswordValid &&
    !saving;

  // =========================================================
  // UPDATE USER
  // =========================================================

  const handleUpdateUser = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!editingEmployee) return;

    // Tidak ada perubahan
    if (!hasEditChanges()) {
      return;
    }

    // Password tidak valid
    if (!isPasswordValid) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/users/update",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: editingEmployee.id,

            role:
              editingEmployee.role === "owner"
                ? "owner"
                : editRole,

            division: editDivision,

            password: editPassword.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Gagal update data"
        );
      }

      // Update data di UI tanpa reload
      setEmployees((prev) =>
        prev.map((employee) =>
          employee.id === editingEmployee.id
            ? {
                ...employee,

                role:
                  editingEmployee.role ===
                  "owner"
                    ? "owner"
                    : editRole,

                division: editDivision,
              }
            : employee
        )
      );

      setEditingEmployee(null);

      setEditPassword("");
      setEditDivision("");
      setEditRole("employee");

      alert("✅ Data berhasil diupdate!");
    } catch (error: any) {
      console.error(error);

      alert(
        error?.message ||
          "Terjadi kesalahan saat menyimpan data."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // LOADING SCREEN
  // =========================================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="h-11 w-11 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />

          <div className="text-center">
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-indigo-500">
              Memuat Data
            </p>

            <p className="mt-1 text-xs font-medium text-slate-400">
              Mohon tunggu sebentar...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // =========================================================
  // MAIN PAGE
  // =========================================================

  return (
    <main className="min-h-screen bg-[#f8fafc] pb-10 font-sans text-slate-900">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">

        <div className="mx-auto max-w-7xl px-4 py-3.5 sm:px-6 sm:py-4 lg:px-8">

          <div className="flex items-center justify-between gap-3">

            {/* BRAND */}
            <div className="flex min-w-0 items-center gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle
                    cx="9"
                    cy="7"
                    r="4"
                  />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>

              </div>

              <div className="min-w-0">

                <h1 className="truncate text-lg font-black tracking-tight text-slate-900 sm:text-2xl">
                  Manajemen Karyawan
                </h1>

                <p className="hidden text-sm font-medium text-slate-500 sm:block">
                  Kelola data dan divisi absensi karyawan.
                </p>

              </div>

            </div>

            {/* USER */}
            <div className="hidden items-center gap-3 sm:flex">

              <div className="text-right">

                <p className="max-w-[220px] truncate text-sm font-bold text-slate-800">
                  {userEmail}
                </p>

                <span className="mt-1 inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-600">
                  {currentUserRole}
                </span>

              </div>

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-black text-white shadow-md shadow-indigo-200">
                {userEmail
                  ?.charAt(0)
                  ?.toUpperCase() || "U"}
              </div>

            </div>

          </div>

        </div>

      </header>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">

        {/* =====================================================
            TOP ACTION
        ===================================================== */}

        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">

          <Link
            href="/dashboard"
            className="group inline-flex w-fit items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-indigo-600"
          >
            <span className="text-lg transition-transform group-hover:-translate-x-1">
              ←
            </span>

            Kembali ke Dashboard
          </Link>

          <button
            type="button"
            onClick={() =>
              setShowForm((prev) => !prev)
            }
            className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:bg-indigo-700 active:translate-y-0 sm:w-auto"
          >
            <span className="text-lg leading-none">
              {showForm ? "×" : "+"}
            </span>

            {showForm
              ? "Tutup Form"
              : "Tambah Karyawan Baru"}
          </button>

        </div>

        {/* =====================================================
            CREATE FORM
        ===================================================== */}

        {showForm && (
          <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            {/* FORM HEADER */}
            <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-white px-5 py-5 sm:px-7">

              <div className="flex items-start gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-5 w-5"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle
                      cx="9"
                      cy="7"
                      r="4"
                    />
                    <line
                      x1="19"
                      y1="8"
                      x2="19"
                      y2="14"
                    />
                    <line
                      x1="22"
                      y1="11"
                      x2="16"
                      y2="11"
                    />
                  </svg>
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-900 sm:text-xl">
                    Form Pendaftaran Karyawan
                  </h2>

                  <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500 sm:text-sm">
                    Masukkan data karyawan dengan lengkap.
                  </p>
                </div>

              </div>

            </div>

            {/* FORM BODY */}
            <div className="p-5 sm:p-7">

              {errorMessage && (
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-600">
                  <span>⚠️</span>

                  <p>{errorMessage}</p>
                </div>
              )}

              <form
                onSubmit={handleCreateUser}
                className="grid gap-5 md:grid-cols-2"
              >

                {/* NAME */}
                <div>
                  <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-slate-600">
                    Nama Lengkap
                  </label>

                  <input
                    type="text"
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                    placeholder="Misal: Romeero Nayotama"
                    autoComplete="name"
                    required
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                  />
                </div>

                {/* EMAIL */}
                <div>
                  <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-slate-600">
                    Alamat Email
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder="karyawan@perusahaan.com"
                    autoComplete="email"
                    required
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                  />
                </div>

                {/* PASSWORD */}
                <div>
                  <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-slate-600">
                    Password
                  </label>

                  <input
                    type="password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="Minimal 6 karakter"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                  />
                </div>

                {/* ROLE */}
                <div>
                  <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-slate-600">
                    Hak Akses
                  </label>

                  <select
                    value={role}
                    onChange={(e) =>
                      setRole(
                        e.target.value as
                          | "admin"
                          | "employee"
                      )
                    }
                    disabled={
                      currentUserRole === "admin"
                    }
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="employee">
                      Employee
                    </option>

                    {currentUserRole === "owner" && (
                      <option value="admin">
                        Admin
                      </option>
                    )}
                  </select>
                </div>

                {/* DIVISION */}
                <div>
                  <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-slate-600">
                    Divisi
                  </label>

                  <select
                    value={division}
                    onChange={(e) =>
                      setDivision(e.target.value)
                    }
                    required
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                  >
                    <option value="" disabled>
                      Pilih Divisi
                    </option>

                    {DIVISIONS_LIST.map(
                      (div) => (
                        <option
                          key={div}
                          value={div}
                        >
                          {div}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* SUBMIT */}
                <div className="mt-1 border-t border-slate-100 pt-5 md:col-span-2 md:flex md:justify-end">

                  <button
                    type="submit"
                    disabled={saving}
                    className="min-h-[48px] w-full rounded-xl bg-indigo-600 px-7 py-3 text-sm font-extrabold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {saving
                      ? "Menyimpan..."
                      : "Simpan Karyawan Baru"}
                  </button>

                </div>

              </form>
            </div>
          </section>
        )}

        {/* =====================================================
            SECTION TITLE
        ===================================================== */}

        <div className="mb-4 flex items-end justify-between">

          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-indigo-500">
              Data Karyawan
            </p>

            <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
              Daftar Karyawan
            </h2>
          </div>

          <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">
            {employees.length} Orang
          </div>

        </div>

        {/* =====================================================
            MOBILE CARDS
        ===================================================== */}

        <div className="space-y-3 md:hidden">

          {employees.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">
                👥
              </div>

              <p className="mt-3 font-bold text-slate-700">
                Belum ada karyawan
              </p>

              <p className="mt-1 text-xs font-medium text-slate-400">
                Tambahkan karyawan menggunakan tombol di atas.
              </p>

            </div>
          ) : (
            employees.map((employee) => {

              const canEdit =
                currentUserRole === "owner" ||
                (
                  currentUserRole === "admin" &&
                  employee.role === "employee"
                );

              const canDelete =
                (
                  currentUserRole === "owner" &&
                  employee.role !== "owner"
                ) ||
                (
                  currentUserRole === "admin" &&
                  employee.role === "employee"
                );

              return (
                <div
                  key={employee.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >

                  {/* USER INFO */}
                  <div className="flex items-start gap-3">

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 text-sm font-black text-indigo-700 ring-1 ring-indigo-200">
                      {employee.full_name
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">

                      <p className="truncate font-extrabold text-slate-900">
                        {employee.full_name}
                      </p>

                      <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                        {employee.email}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-1.5">

                        <span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-blue-700">
                          {employee.role}
                        </span>

                        {employee.division ? (
                          <span className="rounded-full bg-purple-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-purple-700">
                            {employee.division}
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500">
                            BELUM ADA DIVISI
                          </span>
                        )}

                      </div>

                    </div>

                  </div>

                  {/* ACTIONS */}
                  {(canEdit || canDelete) && (
                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() =>
                            openEditModal(employee)
                          }
                          className={`min-h-[43px] rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-extrabold text-indigo-700 transition-colors hover:bg-indigo-100 ${
                            !canDelete
                              ? "col-span-2"
                              : ""
                          }`}
                        >
                          Edit Data
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(
                              employee.id,
                              employee.full_name
                            )
                          }
                          className={`min-h-[43px] rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-extrabold text-rose-700 transition-colors hover:bg-rose-100 ${
                            !canEdit
                              ? "col-span-2"
                              : ""
                          }`}
                        >
                          Hapus
                        </button>
                      )}

                    </div>
                  )}

                </div>
              );
            })
          )}

        </div>

        {/* =====================================================
            TABLE - TABLET / DESKTOP
        ===================================================== */}

        <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">

          <div className="overflow-x-auto">

            <table className="w-full min-w-[700px] text-left">

              <thead className="border-b border-slate-200 bg-slate-50">

                <tr>

                  <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    Profil Karyawan
                  </th>

                  <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    Kontak & Akses
                  </th>

                  <th className="px-6 py-4 text-right text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    Aksi
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {employees.length === 0 ? (
                  <tr>

                    <td
                      colSpan={3}
                      className="px-6 py-16 text-center"
                    >

                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-xl">
                        👥
                      </div>

                      <p className="mt-4 font-bold text-slate-700">
                        Belum ada karyawan
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        Tambahkan karyawan menggunakan tombol di atas.
                      </p>

                    </td>

                  </tr>
                ) : (
                  employees.map((employee) => {

                    const canEdit =
                      currentUserRole ===
                        "owner" ||
                      (
                        currentUserRole ===
                          "admin" &&
                        employee.role ===
                          "employee"
                      );

                    const canDelete =
                      (
                        currentUserRole ===
                          "owner" &&
                        employee.role !==
                          "owner"
                      ) ||
                      (
                        currentUserRole ===
                          "admin" &&
                        employee.role ===
                          "employee"
                      );

                    return (
                      <tr
                        key={employee.id}
                        className="group transition-colors hover:bg-slate-50/70"
                      >

                        {/* PROFILE */}
                        <td className="px-6 py-5">

                          <div className="flex items-center gap-4">

                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 text-sm font-black text-indigo-700 ring-1 ring-indigo-200">
                              {employee.full_name
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0">

                              <p className="font-extrabold text-slate-900">
                                {employee.full_name}
                              </p>

                              {employee.division ? (
                                <span className="mt-1 inline-flex rounded-full bg-purple-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-purple-700">
                                  DIVISI{" "}
                                  {employee.division}
                                </span>
                              ) : (
                                <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold text-slate-500">
                                  BELUM ADA DIVISI
                                </span>
                              )}

                            </div>

                          </div>

                        </td>

                        {/* CONTACT */}
                        <td className="px-6 py-5">

                          <p className="max-w-[320px] truncate text-sm font-semibold text-slate-600">
                            {employee.email}
                          </p>

                          <span className="mt-1.5 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-blue-700">
                            {employee.role}
                          </span>

                        </td>

                        {/* ACTION */}
                        <td className="px-6 py-5">

                          <div className="flex items-center justify-end gap-2">

                            {canEdit && (
                              <button
                                type="button"
                                onClick={() =>
                                  openEditModal(
                                    employee
                                  )
                                }
                                className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2 text-xs font-extrabold text-indigo-700 transition-all hover:-translate-y-0.5 hover:bg-indigo-100"
                              >
                                Edit
                              </button>
                            )}

                            {canDelete && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(
                                    employee.id,
                                    employee.full_name
                                  )
                                }
                                className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-2 text-xs font-extrabold text-rose-700 transition-all hover:-translate-y-0.5 hover:bg-rose-100 md:opacity-70 md:group-hover:opacity-100"
                              >
                                Hapus
                              </button>
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

      </div>

      {/* =====================================================
          EDIT MODAL
      ===================================================== */}

      {editingEmployee && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 px-3 py-4 backdrop-blur-sm sm:px-5 sm:py-8"
          onMouseDown={(e) => {
            if (
              e.target === e.currentTarget &&
              !saving
            ) {
              closeEditModal();
            }
          }}
        >

          <div className="flex min-h-full items-center justify-center">

            <div className="w-full max-w-2xl overflow-hidden rounded-[24px] border border-white/60 bg-white shadow-2xl shadow-slate-950/20">

              {/* =================================================
                  MODAL HEADER
              ================================================= */}

              <div className="border-b border-slate-100 bg-gradient-to-br from-white to-slate-50 px-5 py-5 sm:px-7 sm:py-6">

                <div className="flex items-start gap-3 sm:gap-4">

                  {/* ICON */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">

                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-5 w-5"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>

                  </div>

                  {/* TITLE */}
                  <div className="min-w-0 flex-1">

                    <h3 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                      Edit Data
                    </h3>

                    <p className="mt-0.5 truncate text-sm font-extrabold text-indigo-600">
                      {editingEmployee.full_name}
                    </p>

                    <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500 sm:text-sm">
                      Ubah role, divisi, atau password akun.
                    </p>

                  </div>

                  {/* CLOSE */}
                  <button
                    type="button"
                    onClick={closeEditModal}
                    disabled={saving}
                    aria-label="Tutup modal"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl font-bold leading-none text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ×
                  </button>

                </div>

              </div>

              {/* =================================================
                  MODAL BODY
              ================================================= */}

              <form
                onSubmit={handleUpdateUser}
                className="px-5 py-5 sm:px-7 sm:py-7"
              >

                {/* ACCOUNT INFO */}

                <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 font-black text-indigo-700">
                      {editingEmployee.full_name
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0">

                      <p className="truncate text-sm font-extrabold text-slate-800">
                        {editingEmployee.full_name}
                      </p>

                      <p className="truncate text-xs font-medium text-slate-500">
                        {editingEmployee.email}
                      </p>

                    </div>

                  </div>

                </div>

                {/* =================================================
                    ROLE + DIVISION
                ================================================= */}

                <div className="grid gap-4 sm:grid-cols-2">

                  {/* ROLE */}

                  {editingEmployee.role !==
                    "owner" && (
                    <div>

                      <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">
                        Role
                      </label>

                      <select
                        value={editRole}
                        onChange={(e) =>
                          setEditRole(
                            e.target.value as
                              | "admin"
                              | "employee"
                          )
                        }
                        disabled={
                          currentUserRole ===
                          "admin"
                        }
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      >

                        <option value="employee">
                          Employee
                        </option>

                        {currentUserRole ===
                          "owner" && (
                          <option value="admin">
                            Admin
                          </option>
                        )}

                      </select>

                      {currentUserRole ===
                        "admin" && (
                        <p className="mt-1.5 text-[10px] font-medium text-slate-400">
                          Admin tidak dapat mengubah role.
                        </p>
                      )}

                    </div>
                  )}

                  {/* DIVISION */}

                  <div
                    className={
                      editingEmployee.role ===
                      "owner"
                        ? "sm:col-span-2"
                        : ""
                    }
                  >

                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">
                      Divisi
                    </label>

                    <select
                      value={editDivision}
                      onChange={(e) =>
                        setEditDivision(
                          e.target.value
                        )
                      }
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                    >

                      <option value="">
                        Pilih Divisi
                      </option>

                      {DIVISIONS_LIST.map(
                        (div) => (
                          <option
                            key={div}
                            value={div}
                          >
                            {div}
                          </option>
                        )
                      )}

                    </select>

                  </div>

                </div>

                {/* =================================================
                    PASSWORD
                ================================================= */}

                <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50/60 p-4 sm:p-5">

                  <div className="mb-3 flex items-start gap-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">

                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-4 w-4"
                      >
                        <rect
                          x="3"
                          y="11"
                          width="18"
                          height="10"
                          rx="2"
                        />

                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>

                    </div>

                    <div>

                      <label className="block text-xs font-black uppercase tracking-wider text-rose-600">
                        Ganti Password
                      </label>

                      <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                        Isi hanya jika ingin mengganti password.
                      </p>

                    </div>

                  </div>

                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) =>
                      setEditPassword(
                        e.target.value
                      )
                    }
                    placeholder="Minimal 6 karakter"
                    autoComplete="new-password"
                    className={`
                      h-12 w-full rounded-xl border
                      bg-white px-4 text-sm font-medium
                      text-slate-800 shadow-sm outline-none
                      transition-all
                      placeholder:text-slate-400

                      ${
                        editPassword.trim()
                          .length > 0 &&
                        editPassword.trim()
                          .length < 6
                          ? "border-rose-400 ring-4 ring-rose-50"
                          : "border-white focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                      }
                    `}
                  />

                  {/* PASSWORD ERROR */}

                  {editPassword.trim()
                    .length > 0 &&
                    editPassword.trim()
                      .length < 6 && (
                      <div className="mt-2 flex items-center gap-2 text-[11px] font-bold text-rose-600">

                        <span>⚠️</span>

                        <span>
                          Password harus minimal 6 karakter.
                        </span>

                      </div>
                    )}

                  {/* PASSWORD VALID */}

                  {editPassword.trim()
                    .length >= 6 && (
                    <div className="mt-2 flex items-center gap-2 text-[11px] font-bold text-emerald-600">

                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                        ✓
                      </span>

                      <span>
                        Password sudah memenuhi minimal 6 karakter.
                      </span>

                    </div>
                  )}

                  <p className="mt-2 text-[10px] font-medium leading-relaxed text-slate-400">
                    * Kosongkan jika tidak ingin mengubah password akun ini.
                  </p>

                </div>

                {/* =================================================
                    STATUS PERUBAHAN
                ================================================= */}

                <div className="mt-5">

                  {editPassword.trim()
                    .length > 0 &&
                    editPassword.trim()
                      .length < 6 ? (

                    <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs font-bold text-rose-600">

                      <span>⚠️</span>

                      <span>
                        Password belum valid. Masukkan minimal 6 karakter.
                      </span>

                    </div>

                  ) : hasEditChanges() ? (

                    <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-3 text-xs font-bold text-emerald-700">

                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                        ✓
                      </span>

                      <span>
                        Ada perubahan yang siap disimpan.
                      </span>

                    </div>

                  ) : (

                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs font-semibold text-slate-500">

                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200">
                        i
                      </span>

                      <span>
                        Belum ada perubahan pada data.
                      </span>

                    </div>

                  )}

                </div>

                {/* =================================================
                    FOOTER BUTTON
                ================================================= */}

                <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">

                  {/* BATAL */}

                  <button
                    type="button"
                    onClick={closeEditModal}
                    disabled={saving}
                    className="min-h-[48px] w-full rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-extrabold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    Batal
                  </button>

                  {/* SIMPAN */}

                  <button
                    type="submit"
                    disabled={!canSaveEdit}
                    className={`
                      min-h-[48px]
                      w-full
                      rounded-xl
                      px-6
                      py-3
                      text-sm
                      font-extrabold
                      transition-all
                      sm:w-auto

                      ${
                        canSaveEdit
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:-translate-y-0.5 hover:bg-indigo-700 active:translate-y-0"
                          : "cursor-not-allowed bg-slate-100 text-slate-400"
                      }
                    `}
                  >

                    {saving ? (
                      <span className="inline-flex items-center justify-center gap-2">

                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />

                        Menyimpan...

                      </span>
                    ) : (
                      "Simpan Perubahan"
                    )}

                  </button>

                </div>

              </form>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}