"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { supabase } from "@/lib/supabase";

// =========================================================
// FONT & TOKEN DESAIN (sama dengan halaman lainnya)
// =========================================================

const fontDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});

const fontBody = Figtree({
  subsets: ["latin"],
  variable: "--font-body",
});

const FONT_VARS = `${fontDisplay.variable} ${fontBody.variable}`;
const D = "font-[family-name:var(--font-display)]";
const BASE = `${FONT_VARS} font-[family-name:var(--font-body)]`;

const card = "rounded-2xl border border-slate-200/70 bg-white";

const inputCls =
  "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-800 placeholder:text-slate-400 focus:border-[#0E1A3A] focus:outline-none focus:ring-2 focus:ring-[#0E1A3A]/15 disabled:bg-slate-50 disabled:text-slate-400 sm:h-11 sm:text-sm";

const btnPrimary =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0E1A3A] px-5 text-sm font-semibold text-white transition hover:bg-[#1a2a5a] disabled:cursor-not-allowed disabled:opacity-50";

const btnGhost =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50";

const btnDanger =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50";

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

const NONE = "__none";

type Role = "owner" | "admin" | "employee";
type EditableRole = "admin" | "employee";

const ROLES: Record<Role, { label: string; color: string; badge: string }> = {
  owner: {
    label: "Owner",
    color: "#8B5CF6",
    badge: "bg-violet-50 text-violet-700 ring-violet-200",
  },
  admin: {
    label: "Admin",
    color: "#0EA5E9",
    badge: "bg-sky-50 text-sky-700 ring-sky-200",
  },
  employee: {
    label: "Employee",
    color: "#0E1A3A",
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
  },
};

const ROLE_ORDER: Record<Role, number> = { owner: 0, admin: 1, employee: 2 };

const ICONS = {
  back: "M19 12H5m7-7-7 7 7 7",
  plus: "M12 5v14M5 12h14",
  search: "m21 21-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z",
  close: "M18 6 6 18M6 6l12 12",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z",
  trash: "M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v6M14 11v6",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  eyeOff:
    "M3 3l18 18M10.6 6.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2",
  chevDown: "m6 9 6 6 6-6",
};

// =========================================================
// TIPE & HELPER
// =========================================================

type Employee = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  division?: string | null;
};

type CreateForm = {
  name: string;
  email: string;
  password: string;
  role: EditableRole;
  division: string;
};

const EMPTY_FORM: CreateForm = {
  name: "",
  email: "",
  password: "",
  role: "employee",
  division: "",
};

const dashboardPath = (role: string) =>
  role === "owner"
    ? "/owner/dashboard"
    : role === "admin"
    ? "/admin/dashboard"
    : "/dashboard";

const initial = (name: string | null | undefined): string =>
  name?.trim()?.charAt(0)?.toUpperCase() || "?";

async function fetchEmployees(companyId: string): Promise<Employee[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, division")
    .eq("company_id", companyId);

  if (error) throw error;

  return ((data ?? []) as Employee[]).sort(
    (a, b) =>
      ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
      a.full_name.localeCompare(b.full_name)
  );
}

function Icon({
  d,
  className = "h-4 w-4",
}: {
  d: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

// =========================================================
// KOMPONEN KECIL
// =========================================================

function Avatar({
  name,
  large = false,
}: {
  name: string;
  large?: boolean;
}) {
  return (
    <div
      className={`${D} flex shrink-0 items-center justify-center rounded-xl bg-slate-100 font-semibold text-slate-600 ${
        large ? "h-12 w-12 text-lg" : "h-10 w-10 text-sm"
      }`}
    >
      {initial(name)}
    </div>
  );
}

function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${ROLES[role].badge}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {ROLES[role].label}
    </span>
  );
}

function DivisionTag({ division }: { division?: string | null }) {
  if (!division) {
    return (
      <span className="text-xs italic text-slate-400">Belum ada divisi</span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
      {division}
    </span>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function SelectField({
  id,
  value,
  onChange,
  disabled = false,
  className = "",
  children,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${inputCls} appearance-none pr-10 ${className}`}
      >
        {children}
      </select>

      <Icon
        d={ICONS.chevDown}
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      />
    </div>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  footer,
  children,
  maxW = "sm:max-w-lg",
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer: React.ReactNode;
  children: React.ReactNode;
  maxW?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl ${maxW}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h3 className={`${D} text-xl font-semibold text-slate-900`}>
              {title}
            </h3>

            {subtitle && (
              <p className="mt-0.5 break-words text-sm text-slate-500">
                {subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100"
          >
            <Icon d={ICONS.close} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
          {footer}
        </div>
      </div>
    </div>
  );
}

function RowActions({
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  variant,
}: {
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  variant: "card" | "table";
}) {
  const size =
    variant === "card" ? "h-10 flex-1" : "h-9 px-3.5";

  return (
    <div
      className={
        variant === "card"
          ? "flex gap-2 border-t border-slate-100 bg-slate-50/60 p-3"
          : "flex justify-end gap-2"
      }
    >
      {canEdit && (
        <button
          onClick={onEdit}
          className={`${size} inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 transition hover:bg-slate-50`}
        >
          <Icon d={ICONS.edit} className="h-3.5 w-3.5" />
          Edit
        </button>
      )}

      {canDelete && (
        <button
          onClick={onDelete}
          className={`${size} inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white text-xs font-semibold text-rose-600 transition hover:bg-rose-50`}
        >
          <Icon d={ICONS.trash} className="h-3.5 w-3.5" />
          Hapus
        </button>
      )}
    </div>
  );
}

function EmptyState({
  hasFilter,
  onReset,
}: {
  hasFilter: boolean;
  onReset: () => void;
}) {
  return (
    <div className="px-6 py-14 text-center">
      <h3 className={`${D} text-xl font-semibold text-slate-800`}>
        {hasFilter ? "Data tidak ditemukan" : "Belum ada karyawan"}
      </h3>

      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
        {hasFilter
          ? "Coba ubah kata kunci atau filter yang dipakai."
          : "Tambahkan karyawan lewat tombol Tambah karyawan."}
      </p>

      {hasFilter && (
        <button onClick={onReset} className={`${btnPrimary} mt-5`}>
          Reset filter
        </button>
      )}
    </div>
  );
}

// =========================================================
// HALAMAN
// =========================================================

export default function EmployeesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [userName, setUserName] = useState("");
  const [companyName, setCompanyName] = useState("Company Attendance");
  const [currentRole, setCurrentRole] = useState("");
  const [companyId, setCompanyId] = useState("");

  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // TAMBAH
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // EDIT
  const [editing, setEditing] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState({
    role: "employee" as EditableRole,
    division: "",
    password: "",
  });
  const [showEditPassword, setShowEditPassword] = useState(false);

  // HAPUS
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  // FILTER
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | Role>("all");
  const [filterDivision, setFilterDivision] = useState("all");

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

        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id, role, full_name, companies(name)")
          .eq("id", user.id)
          .single();

        if (!profile) {
          router.replace("/login");
          return;
        }

        if (!["owner", "admin"].includes(profile.role)) {
          router.replace("/dashboard");
          return;
        }

        setCurrentRole(profile.role);

        // Hanya username, email tidak ditampilkan di header.
        setUserName(
          profile.full_name || user.email?.split("@")[0] || "User"
        );

        const company: any = (profile as any).companies;
        const cName = Array.isArray(company) ? company[0]?.name : company?.name;

        if (cName) setCompanyName(cName);

        if (!profile.company_id) {
          setLoadError("Akun kamu belum terhubung ke perusahaan.");
          return;
        }

        setCompanyId(profile.company_id);
        setEmployees(await fetchEmployees(profile.company_id));
      } catch (err) {
        console.error(err);
        setLoadError("Gagal memuat data karyawan.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  // =========================================================
  // TOAST OTOMATIS HILANG
  // =========================================================

  useEffect(() => {
    if (!notice) return;

    const timer = setTimeout(() => setNotice(null), 4000);

    return () => clearTimeout(timer);
  }, [notice]);

  // =========================================================
  // MODAL: KUNCI SCROLL & ESC
  // =========================================================

  const modalOpen = showCreate || !!editing || !!deleteTarget;

  useEffect(() => {
    if (!modalOpen) return;

    const previous = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        setShowCreate(false);
        setEditing(null);
        setDeleteTarget(null);
      }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [modalOpen, busy]);

  // =========================================================
  // DATA TURUNAN
  // =========================================================

  const roleCounts = useMemo(() => {
    const result = { all: employees.length, owner: 0, admin: 0, employee: 0 };

    employees.forEach((e) => {
      result[e.role]++;
    });

    return result;
  }, [employees]);

  const divisionOptions = useMemo(() => {
    const set = new Set<string>(DIVISIONS);

    employees.forEach((e) => {
      if (e.division) set.add(e.division);
    });

    return Array.from(set);
  }, [employees]);

  const divisionBars = useMemo(() => {
    const rows = divisionOptions
      .map((name) => ({
        key: name,
        label: name,
        count: employees.filter((e) => e.division === name).length,
      }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count);

    const none = employees.filter((e) => !e.division).length;

    if (none > 0) {
      rows.push({ key: NONE, label: "Belum ada divisi", count: none });
    }

    return rows;
  }, [employees, divisionOptions]);

  const noDivisionCount = employees.filter((e) => !e.division).length;

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return employees.filter((employee) => {
      if (filterRole !== "all" && employee.role !== filterRole) return false;

      if (filterDivision === NONE) {
        if (employee.division) return false;
      } else if (
        filterDivision !== "all" &&
        employee.division !== filterDivision
      ) {
        return false;
      }

      if (
        keyword &&
        !employee.full_name.toLowerCase().includes(keyword) &&
        !employee.email.toLowerCase().includes(keyword)
      ) {
        return false;
      }

      return true;
    });
  }, [employees, search, filterRole, filterDivision]);

  const hasFilter =
    !!search.trim() || filterRole !== "all" || filterDivision !== "all";

  const resetFilter = () => {
    setSearch("");
    setFilterRole("all");
    setFilterDivision("all");
  };

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
  // TAMBAH
  // =========================================================

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setShowPassword(false);
    setShowCreate(true);
  };

  const closeCreate = () => {
    if (busy) return;
    setShowCreate(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (busy) return;

    setFormError("");

    const name = form.name.trim();
    const email = form.email.trim();

    if (!name || !email || !form.password || !form.division) {
      setFormError("Mohon lengkapi semua data terlebih dahulu.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setFormError("Format email tidak valid.");
      return;
    }

    if (form.password.length < 6) {
      setFormError("Password minimal 6 karakter.");
      return;
    }

    setBusy(true);

    try {
      const res = await fetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password: form.password,
          role: form.role,
          company_id: companyId,
          division: form.division,
        }),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFormError(result?.error || "Gagal membuat user.");
        return;
      }

      // Ambil ulang dari database supaya ID-nya pasti benar
      setEmployees(await fetchEmployees(companyId));

      setShowCreate(false);
      setForm(EMPTY_FORM);

      setNotice({ type: "success", text: `${name} berhasil ditambahkan.` });
    } catch (err) {
      console.error(err);
      setFormError("Terjadi kesalahan saat membuat user.");
    } finally {
      setBusy(false);
    }
  };

  // =========================================================
  // EDIT
  // =========================================================

  const openEdit = (employee: Employee) => {
    setEditing(employee);
    setEditForm({
      role: employee.role === "owner" ? "admin" : employee.role,
      division: employee.division ?? "",
      password: "",
    });
    setShowEditPassword(false);
  };

  const closeEdit = () => {
    if (busy) return;
    setEditing(null);
  };

  const editPassword = editForm.password.trim();
  const passwordValid = !editPassword || editPassword.length >= 6;

  const hasChanges =
    !!editing &&
    ((currentRole === "owner" &&
      editing.role !== "owner" &&
      editForm.role !== editing.role) ||
      editForm.division !== (editing.division ?? "") ||
      editPassword.length > 0);

  const editDivisionOptions =
    editing?.division && !divisionOptions.includes(editing.division)
      ? [...divisionOptions, editing.division]
      : divisionOptions;

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editing || busy || !hasChanges || !passwordValid) return;

    const target = editing;
    const nextRole: Role = target.role === "owner" ? "owner" : editForm.role;

    setBusy(true);

    try {
      const res = await fetch("/api/users/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: target.id,
          role: nextRole,
          division: editForm.division,
          password: editPassword,
        }),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(result?.error || "Gagal update data.");
      }

      setEmployees((prev) =>
        prev.map((item) =>
          item.id === target.id
            ? { ...item, role: nextRole, division: editForm.division }
            : item
        )
      );

      setEditing(null);

      setNotice({ type: "success", text: "Data berhasil diperbarui." });
    } catch (err: any) {
      console.error(err);

      setNotice({
        type: "error",
        text: err?.message || "Gagal menyimpan perubahan.",
      });
    } finally {
      setBusy(false);
    }
  };

  // =========================================================
  // HAPUS
  // =========================================================

  const confirmDelete = async () => {
    if (!deleteTarget || busy) return;

    const target = deleteTarget;

    setBusy(true);

    try {
      const res = await fetch("/api/users/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: target.id }),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(result?.error || "Gagal menghapus user.");
      }

      setEmployees((prev) => prev.filter((item) => item.id !== target.id));
      setDeleteTarget(null);

      setNotice({ type: "success", text: `${target.full_name} dihapus.` });
    } catch (err: any) {
      console.error(err);

      setNotice({
        type: "error",
        text: err?.message || "Terjadi kesalahan sistem.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main
        className={`${BASE} flex min-h-screen items-center justify-center bg-[#F2F4F9]`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-slate-200 border-t-[#0E1A3A]" />
          <p className="text-sm font-medium text-slate-500">
            Memuat data karyawan...
          </p>
        </div>
      </main>
    );
  }

  const roleLabel =
    currentRole === "owner"
      ? "Owner"
      : currentRole === "admin"
      ? "Admin"
      : currentRole;

  const roleTiles: { key: "all" | Role; label: string; color: string }[] = [
    { key: "all", label: "Semua", color: "#94A3B8" },
    { key: "owner", label: "Owner", color: ROLES.owner.color },
    { key: "admin", label: "Admin", color: ROLES.admin.color },
    { key: "employee", label: "Employee", color: ROLES.employee.color },
  ];

  const maxBar = Math.max(1, ...divisionBars.map((row) => row.count));

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className={`${BASE} min-h-screen bg-[#F2F4F9] pb-16 text-slate-800`}>
      {/* ================= TOAST ================= */}

      {notice && (
        <div
          role="status"
          className={`fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 z-[120] max-w-[90vw] -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg ${
            notice.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* ================= HEADER ================= */}

      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`${D} flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0E1A3A] text-lg font-bold text-white`}
            >
              {companyName.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <h1
                className={`${D} truncate text-lg font-semibold leading-tight text-slate-900`}
              >
                {companyName}
              </h1>
              <p className="text-xs text-slate-500">Direktori karyawan</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2.5 md:flex">
              <span className="max-w-[10rem] truncate text-sm font-semibold capitalize text-slate-700">
                {userName}
              </span>

              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                  currentRole === "owner"
                    ? "bg-violet-50 text-violet-700 ring-violet-200"
                    : "bg-sky-50 text-sky-700 ring-sky-200"
                }`}
              >
                {roleLabel}
              </span>
            </div>

            <Link
              href={dashboardPath(currentRole)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <Icon d={ICONS.back} />
              <span className="hidden sm:inline">Dasbor</span>
            </Link>

            <button
              onClick={handleLogout}
              className="h-10 rounded-xl border border-slate-200 px-3.5 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-8 sm:pt-8">
        {/* ================= JUDUL ================= */}

        <section className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              className={`${D} text-3xl font-semibold text-slate-900 sm:text-4xl`}
            >
              Karyawan
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500">
              Kelola akun, hak akses, dan divisi seluruh anggota perusahaan.
            </p>
          </div>

          <button
            onClick={openCreate}
            disabled={!companyId}
            className={`${btnPrimary} w-full sm:w-auto`}
          >
            <Icon d={ICONS.plus} />
            Tambah karyawan
          </button>
        </section>

        {loadError && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700"
          >
            {loadError}
          </div>
        )}

        {/* ================= RINGKASAN ================= */}

        <section className="grid gap-6 lg:grid-cols-5">
          {/* ROLE */}

          <div className={`${card} p-5 sm:p-6 lg:col-span-2`}>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              {(["owner", "admin", "employee"] as Role[]).map(
                (role) =>
                  roleCounts[role] > 0 && (
                    <div
                      key={role}
                      title={`${ROLES[role].label}: ${roleCounts[role]}`}
                      style={{
                        width: `${(roleCounts[role] / roleCounts.all) * 100}%`,
                        backgroundColor: ROLES[role].color,
                      }}
                    />
                  )
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {roleTiles.map((tile) => {
                const active = filterRole === tile.key;

                return (
                  <button
                    key={tile.key}
                    onClick={() => setFilterRole(tile.key)}
                    aria-pressed={active}
                    className={`rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E1A3A]/30 ${
                      active
                        ? "border-[#0E1A3A] bg-slate-50"
                        : "border-slate-200/70 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm text-slate-500">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: tile.color }}
                      />
                      {tile.label}
                    </span>

                    <span
                      className={`${D} mt-1 block text-3xl font-semibold text-slate-900`}
                    >
                      {roleCounts[tile.key]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DIVISI (tablet ke atas) */}

          <div className={`${card} hidden p-5 sm:p-6 md:block lg:col-span-3`}>
            <h3 className={`${D} text-xl font-semibold text-slate-900`}>
              Anggota per divisi
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Klik salah satu divisi untuk memfilter daftar.
            </p>

            {divisionBars.length === 0 ? (
              <p className="mt-6 text-sm text-slate-400">Belum ada data.</p>
            ) : (
              <ul className="mt-4 space-y-1">
                {divisionBars.map((row) => {
                  const active = filterDivision === row.key;

                  return (
                    <li key={row.key}>
                      <button
                        onClick={() =>
                          setFilterDivision((prev) =>
                            prev === row.key ? "all" : row.key
                          )
                        }
                        aria-pressed={active}
                        className={`grid w-full grid-cols-[7.5rem_1fr_2rem] items-center gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-50 ${
                          active ? "bg-slate-50" : ""
                        }`}
                      >
                        <span className="truncate text-sm font-medium text-slate-700">
                          {row.label}
                        </span>

                        <span className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                          <span
                            className="block h-full rounded-full bg-[#0E1A3A] transition-all"
                            style={{
                              width: `${(row.count / maxBar) * 100}%`,
                              opacity:
                                filterDivision === "all" || active ? 1 : 0.35,
                            }}
                          />
                        </span>

                        <span className="text-right text-sm font-semibold tabular-nums text-slate-800">
                          {row.count}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* ================= DAFTAR ================= */}

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3
              className={`${D} text-xl font-semibold text-slate-900 sm:text-2xl`}
            >
              Daftar karyawan
            </h3>

            <span className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
              {filtered.length} dari {employees.length} orang
            </span>
          </div>

          {/* FILTER */}

          <div className={`${card} mb-4 p-3 sm:p-4`}>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <label className="relative block">
                <span className="sr-only">Cari nama atau email</span>

                <Icon
                  d={ICONS.search}
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama atau email"
                  className={`${inputCls} pl-10`}
                />
              </label>

              <div className="flex gap-2">
                <div className="relative flex-1 sm:w-52 sm:flex-none">
                  <label htmlFor="filter-division" className="sr-only">
                    Filter divisi
                  </label>

                  <select
                    id="filter-division"
                    value={filterDivision}
                    onChange={(e) => setFilterDivision(e.target.value)}
                    className={`${inputCls} appearance-none pr-10`}
                  >
                    <option value="all">Semua divisi</option>
                    {divisionOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                    {noDivisionCount > 0 && (
                      <option value={NONE}>Belum ada divisi</option>
                    )}
                  </select>

                  <Icon
                    d={ICONS.chevDown}
                    className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  />
                </div>

                {hasFilter && (
                  <button
                    onClick={resetFilter}
                    className="h-12 shrink-0 rounded-xl px-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 sm:h-11"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* KARTU: HP & tablet */}

          <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
            {filtered.length === 0 ? (
              <div className={`${card} sm:col-span-2`}>
                <EmptyState hasFilter={hasFilter} onReset={resetFilter} />
              </div>
            ) : (
              filtered.map((employee) => {
                const editable = canEdit(employee);
                const deletable = canDelete(employee);

                return (
                  <div key={employee.id} className={`${card} overflow-hidden`}>
                    <div className="flex items-start gap-3 p-4">
                      <Avatar name={employee.full_name} />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold text-slate-900">
                          {employee.full_name}
                        </p>

                        <p className="truncate text-sm text-slate-500">
                          {employee.email}
                        </p>

                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          <RoleBadge role={employee.role} />
                          <DivisionTag division={employee.division} />
                        </div>
                      </div>
                    </div>

                    {(editable || deletable) && (
                      <RowActions
                        variant="card"
                        canEdit={editable}
                        canDelete={deletable}
                        onEdit={() => openEdit(employee)}
                        onDelete={() => setDeleteTarget(employee)}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* TABEL: layar lebar */}

          <div className={`${card} hidden overflow-hidden lg:block`}>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold text-slate-400">
                  <th scope="col" className="px-6 py-3.5">
                    Karyawan
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Email
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Role
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Divisi
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState hasFilter={hasFilter} onReset={resetFilter} />
                    </td>
                  </tr>
                ) : (
                  filtered.map((employee) => (
                    <tr
                      key={employee.id}
                      className="transition-colors hover:bg-slate-50/60"
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={employee.full_name} />

                          <p className="max-w-[14rem] truncate text-sm font-semibold text-slate-900">
                            {employee.full_name}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="max-w-[16rem] truncate text-sm text-slate-600">
                          {employee.email}
                        </p>
                      </td>

                      <td className="px-4 py-3.5">
                        <RoleBadge role={employee.role} />
                      </td>

                      <td className="px-4 py-3.5">
                        <DivisionTag division={employee.division} />
                      </td>

                      <td className="px-6 py-3.5">
                        <RowActions
                          variant="table"
                          canEdit={canEdit(employee)}
                          canDelete={canDelete(employee)}
                          onEdit={() => openEdit(employee)}
                          onDelete={() => setDeleteTarget(employee)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ================= MODAL TAMBAH ================= */}

      {showCreate && (
        <Modal
          title="Tambah karyawan"
          subtitle="Buat akun baru dan tentukan hak akses serta divisinya."
          onClose={closeCreate}
          footer={
            <>
              <button
                type="button"
                onClick={closeCreate}
                disabled={busy}
                className={btnGhost}
              >
                Batal
              </button>

              <button
                type="submit"
                form="create-form"
                disabled={busy}
                className={btnPrimary}
              >
                {busy ? "Membuat akun..." : "Simpan karyawan"}
              </button>
            </>
          }
        >
          <form
            id="create-form"
            onSubmit={handleCreate}
            noValidate
            className="space-y-4"
          >
            {formError && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
              >
                {formError}
              </div>
            )}

            <Field label="Nama lengkap" htmlFor="c-name">
              <input
                id="c-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: Johan Pratama"
                autoComplete="off"
                className={inputCls}
              />
            </Field>

            <Field label="Email" htmlFor="c-email">
              <input
                id="c-email"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="nama@perusahaan.com"
                className={inputCls}
              />
            </Field>

            <Field
              label="Password"
              htmlFor="c-password"
              hint="Minimal 6 karakter."
            >
              <div className="relative">
                <input
                  id="c-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="Password akun baru"
                  className={`${inputCls} pr-12`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword ? "Sembunyikan password" : "Tampilkan password"
                  }
                  className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <Icon d={showPassword ? ICONS.eyeOff : ICONS.eye} />
                </button>
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Hak akses" htmlFor="c-role">
                <SelectField
                  id="c-role"
                  value={form.role}
                  onChange={(v) =>
                    setForm({ ...form, role: v as EditableRole })
                  }
                >
                  <option value="employee">Employee</option>
                  {currentRole === "owner" && (
                    <option value="admin">Admin</option>
                  )}
                </SelectField>
              </Field>

              <Field label="Divisi" htmlFor="c-division">
                <SelectField
                  id="c-division"
                  value={form.division}
                  onChange={(v) => setForm({ ...form, division: v })}
                >
                  <option value="">Pilih divisi</option>
                  {DIVISIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </SelectField>
              </Field>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= MODAL EDIT ================= */}

      {editing && (
        <Modal
          title="Edit karyawan"
          onClose={closeEdit}
          footer={
            <>
              <button
                type="button"
                onClick={closeEdit}
                disabled={busy}
                className={btnGhost}
              >
                Batal
              </button>

              <button
                type="submit"
                form="edit-form"
                disabled={busy || !hasChanges || !passwordValid}
                className={btnPrimary}
              >
                {busy ? "Menyimpan..." : "Simpan perubahan"}
              </button>
            </>
          }
        >
          <form id="edit-form" onSubmit={saveEdit} className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <Avatar name={editing.full_name} large />

              <div className="min-w-0">
                <p className="break-words text-[15px] font-semibold text-slate-900">
                  {editing.full_name}
                </p>
                <p className="break-all text-sm text-slate-500">
                  {editing.email}
                </p>
              </div>
            </div>

            {editing.role !== "owner" && (
              <Field
                label="Role"
                htmlFor="e-role"
                hint={
                  currentRole === "admin"
                    ? "Hanya owner yang dapat mengubah role."
                    : undefined
                }
              >
                <SelectField
                  id="e-role"
                  value={editForm.role}
                  onChange={(v) =>
                    setEditForm({ ...editForm, role: v as EditableRole })
                  }
                  disabled={currentRole === "admin"}
                >
                  <option value="employee">Employee</option>
                  {currentRole === "owner" && (
                    <option value="admin">Admin</option>
                  )}
                </SelectField>
              </Field>
            )}

            <Field label="Divisi" htmlFor="e-division">
              <SelectField
                id="e-division"
                value={editForm.division}
                onChange={(v) => setEditForm({ ...editForm, division: v })}
              >
                <option value="">Belum ada divisi</option>
                {editDivisionOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </SelectField>
            </Field>

            <Field
              label="Password baru"
              htmlFor="e-password"
              hint={
                editPassword && !passwordValid ? (
                  <span className="font-semibold text-rose-600">
                    Password minimal 6 karakter.
                  </span>
                ) : (
                  "Kosongkan jika tidak ingin mengubah."
                )
              }
            >
              <div className="relative">
                <input
                  id="e-password"
                  type={showEditPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={editForm.password}
                  onChange={(e) =>
                    setEditForm({ ...editForm, password: e.target.value })
                  }
                  placeholder="Password baru"
                  className={`${inputCls} pr-12 ${
                    editPassword && !passwordValid
                      ? "border-rose-400 focus:border-rose-400 focus:ring-rose-100"
                      : ""
                  }`}
                />

                <button
                  type="button"
                  onClick={() => setShowEditPassword((v) => !v)}
                  aria-label={
                    showEditPassword
                      ? "Sembunyikan password"
                      : "Tampilkan password"
                  }
                  className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <Icon d={showEditPassword ? ICONS.eyeOff : ICONS.eye} />
                </button>
              </div>
            </Field>

            <p
              className={`rounded-xl px-4 py-3 text-sm font-medium ${
                hasChanges
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-50 text-slate-400"
              }`}
            >
              {hasChanges
                ? "Ada perubahan yang siap disimpan."
                : "Belum ada perubahan."}
            </p>
          </form>
        </Modal>
      )}

      {/* ================= MODAL HAPUS ================= */}

      {deleteTarget && (
        <Modal
          title="Hapus karyawan?"
          maxW="sm:max-w-md"
          onClose={() => {
            if (!busy) setDeleteTarget(null);
          }}
          footer={
            <>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={busy}
                className={btnGhost}
              >
                Batal
              </button>

              <button
                onClick={confirmDelete}
                disabled={busy}
                className={btnDanger}
              >
                {busy ? "Menghapus..." : "Hapus permanen"}
              </button>
            </>
          }
        >
          <p className="text-sm leading-relaxed text-slate-600">
            Akun{" "}
            <span className="font-semibold text-slate-900">
              {deleteTarget.full_name}
            </span>{" "}
            <span className="break-all text-slate-500">
              ({deleteTarget.email})
            </span>{" "}
            akan dihapus permanen dan tidak bisa dikembalikan.
          </p>
        </Modal>
      )}
    </main>
  );
}
