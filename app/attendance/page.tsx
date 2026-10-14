"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { supabase } from "@/lib/supabase";

// =========================================================
// FONT & TOKEN DESAIN (sama dengan Owner Dashboard)
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

const badgeBase =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset";

const btnBase =
  "inline-flex h-10 items-center justify-center rounded-xl border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 lg:h-9";

const STATUS = {
  present: {
    label: "Tepat waktu",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  late: {
    label: "Terlambat",
    badge: "bg-yellow-50 text-yellow-700 ring-yellow-200",
  },
  sakit: {
    label: "Sakit",
    badge: "bg-orange-50 text-orange-700 ring-orange-200",
  },
  izin: {
    label: "Izin",
    badge: "bg-violet-50 text-violet-700 ring-violet-200",
  },
  absent: {
    label: "Alpa",
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
  },
} as const;

type StatusKey = keyof typeof STATUS;

const APPROVAL = {
  pending: {
    label: "Menunggu",
    color: "#EAB308",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  approved: {
    label: "Disetujui",
    color: "#10B981",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  rejected: {
    label: "Ditolak",
    color: "#F43F5E",
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
  },
} as const;

type Approval = keyof typeof APPROVAL;
type Filter = "all" | Approval;

const TILES: { key: Filter; label: string; color: string }[] = [
  { key: "all", label: "Semua", color: "#0E1A3A" },
  { key: "pending", label: "Menunggu", color: APPROVAL.pending.color },
  { key: "approved", label: "Disetujui", color: APPROVAL.approved.color },
  { key: "rejected", label: "Ditolak", color: APPROVAL.rejected.color },
];

// Kolom tabel di layar lebar (lg ke atas). Di bawah itu tampil sebagai kartu.
const LG_COLS =
  "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1.5fr)]";

const ICONS = {
  back: "M19 12H5m7-7-7 7 7 7",
  search: "m21 21-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z",
  print:
    "M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M6 14h12v7H6z",
  close: "M18 6 6 18M6 6l12 12",
  pin: "M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12ZM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
};

// =========================================================
// TIPE
// =========================================================

interface Attendance {
  id: string;
  profile_id: string;
  status: string | null;
  reason: string | null;
  check_in: string | null;
  check_out: string | null;
  created_at: string;

  approval_status: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason: string | null;

  photo_check_in: string | null;
  photo_check_out: string | null;

  latitude: number | null;
  longitude: number | null;
  latitude_out: number | null;
  longitude_out: number | null;

  task_list: string[] | null;
  task_count: number | null;

  profiles: {
    full_name: string;
    division: string;
  };
}

type GroupedData = Record<string, Record<string, Attendance[]>>;

// =========================================================
// HELPER
// =========================================================

const getDashboardPath = (role: string) => {
  if (role === "owner") return "/owner/dashboard";
  if (role === "admin") return "/admin/dashboard";
  return "/dashboard";
};

const normalizeApproval = (value: string | null): Approval =>
  value === "approved" || value === "rejected" ? value : "pending";

const statusText = (status: string | null): string => {
  if (!status) return "-";

  return (
    STATUS[status.toLowerCase() as StatusKey]?.label ||
    status.charAt(0).toUpperCase() + status.slice(1)
  );
};

const formatTime = (value: string | null): string => {
  if (!value) return "--:--";

  return new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const initial = (name: string | null | undefined): string =>
  name?.trim()?.charAt(0)?.toUpperCase() || "?";

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

function PhotoThumb({
  src,
  label,
}: {
  src: string | null;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      {src ? (
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          aria-label={`Buka foto ${label}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={`Foto ${label}`}
            loading="lazy"
            className="h-12 w-12 rounded-xl border border-slate-200 object-cover transition hover:scale-105"
          />
        </a>
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-300">
          –
        </div>
      )}

      <span className="text-[11px] text-slate-400">{label}</span>
    </div>
  );
}

function MapChip({
  lat,
  lng,
  label,
  tone,
}: {
  lat: number | null;
  lng: number | null;
  label: string;
  tone: "in" | "out";
}) {
  if (lat == null || lng == null) {
    return (
      <span className="text-xs italic text-slate-400">
        Tanpa GPS {label.toLowerCase()}
      </span>
    );
  }

  return (
    <a
      href={`https://www.google.com/maps?q=${lat},${lng}`}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
        tone === "in"
          ? "bg-sky-50 text-sky-700 hover:bg-sky-100"
          : "bg-orange-50 text-orange-700 hover:bg-orange-100"
      }`}
    >
      <Icon d={ICONS.pin} className="h-3 w-3" />
      {label}
    </a>
  );
}

// =========================================================
// BARIS ABSENSI
// Kartu di HP & tablet, baris tabel di layar lebar.
// =========================================================

function AttendanceRow({
  item,
  busy,
  onReport,
  onApprove,
  onReject,
}: {
  item: Attendance;
  busy: boolean;
  onReport: (item: Attendance) => void;
  onApprove: (item: Attendance) => void;
  onReject: (item: Attendance) => void;
}) {
  const noPhoto = item.status === "sakit" || item.status === "izin";
  const st = STATUS[(item.status ?? "") as StatusKey];
  const approval = normalizeApproval(item.approval_status);
  const ap = APPROVAL[approval];
  const name = item.profiles?.full_name || "Unknown";

  const taskCount = (item.task_list || []).filter(
    (task) => typeof task === "string" && task.trim().length > 0
  ).length;

  const hasActions = taskCount > 0 || approval === "pending";

  return (
    <div
      className={`att-grid att-row grid grid-cols-2 gap-x-4 gap-y-4 p-4 transition-colors hover:bg-slate-50/60 md:grid-cols-6 ${LG_COLS} lg:items-center lg:px-5 lg:py-3.5`}
    >
      {/* KARYAWAN */}

      <div className="order-1 col-span-2 flex min-w-0 items-center gap-3 md:col-span-3 lg:col-span-1">
        <div
          className={`${D} flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-600`}
        >
          {initial(name)}
        </div>

        <p className="min-w-0 break-words text-sm font-semibold text-slate-900">
          {name}
        </p>
      </div>

      {/* STATUS */}

      <div className="order-2 col-span-2 flex flex-wrap items-center gap-2 md:col-span-3 md:justify-end lg:order-5 lg:col-span-1 lg:flex-col lg:items-start lg:justify-center">
        <span
          className={`${badgeBase} ${
            st?.badge ?? "bg-slate-50 text-slate-600 ring-slate-200"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {statusText(item.status)}
        </span>

        <span className={`${badgeBase} ${ap.badge}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {ap.label}
        </span>
      </div>

      {/* WAKTU */}

      <div className="order-3 col-span-1 md:col-span-2 lg:col-span-1">
        <p className="mb-1.5 text-xs text-slate-400 lg:hidden">Waktu</p>

        <div className="space-y-1 text-sm">
          <p className="flex items-baseline gap-2">
            <span className="w-12 shrink-0 text-xs text-slate-400">
              {noPhoto ? "Laporan" : "Masuk"}
            </span>
            <span className="font-semibold tabular-nums text-slate-900">
              {formatTime(item.check_in)}
            </span>
          </p>

          {!noPhoto && (
            <p className="flex items-baseline gap-2">
              <span className="w-12 shrink-0 text-xs text-slate-400">
                Pulang
              </span>
              <span className="font-semibold tabular-nums text-slate-900">
                {formatTime(item.check_out)}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* FOTO */}

      <div className="order-4 col-span-1 md:col-span-2 lg:order-2 lg:col-span-1 print:hidden">
        <p className="mb-1.5 text-xs text-slate-400 lg:hidden">Foto</p>

        {noPhoto ? (
          <span className="text-xs italic text-slate-400">Tanpa foto</span>
        ) : (
          <div className="flex gap-3">
            <PhotoThumb src={item.photo_check_in} label="Masuk" />
            <PhotoThumb src={item.photo_check_out} label="Pulang" />
          </div>
        )}
      </div>

      {/* LOKASI / ALASAN */}

      <div className="order-5 col-span-2 min-w-0 md:col-span-2 lg:order-4 lg:col-span-1">
        <p className="mb-1.5 text-xs text-slate-400 lg:hidden">
          {noPhoto
            ? `Alasan ${statusText(item.status).toLowerCase()}`
            : "Lokasi"}
        </p>

        {noPhoto ? (
          <p className="line-clamp-3 break-words text-sm italic text-slate-600">
            {item.reason || "Tidak ada keterangan."}
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <MapChip
              lat={item.latitude}
              lng={item.longitude}
              label="Masuk"
              tone="in"
            />
            <MapChip
              lat={item.latitude_out}
              lng={item.longitude_out}
              label="Pulang"
              tone="out"
            />
          </div>
        )}
      </div>

      {/* AKSI */}

      <div
        className={`order-6 col-span-2 md:col-span-6 md:max-w-md lg:col-span-1 lg:max-w-none print:hidden ${
          hasActions ? "" : "hidden lg:block"
        }`}
      >
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-2">
          {taskCount > 0 && (
            <button
              onClick={() => onReport(item)}
              className={`${btnBase} col-span-2 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 md:col-span-1 lg:col-span-2`}
            >
              Laporan ({taskCount})
            </button>
          )}

          {approval === "pending" ? (
            <>
              <button
                onClick={() => onApprove(item)}
                disabled={busy}
                className={`${btnBase} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
              >
                Setujui
              </button>

              <button
                onClick={() => onReject(item)}
                disabled={busy}
                className={`${btnBase} border-rose-200 bg-white text-rose-600 hover:bg-rose-50`}
              >
                Tolak
              </button>
            </>
          ) : (
            taskCount === 0 && (
              <span className="col-span-2 text-xs text-slate-400">
                Sudah diproses
              </span>
            )
          )}
        </div>
      </div>

      {/* ALASAN PENOLAKAN */}

      {approval === "rejected" && item.rejection_reason && (
        <div className="order-7 col-span-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs leading-relaxed text-rose-700 md:col-span-6 lg:col-span-full">
          <span className="font-semibold">Alasan penolakan: </span>
          {item.rejection_reason}
        </div>
      )}
    </div>
  );
}

// =========================================================
// HALAMAN
// =========================================================

export default function AttendancePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userId, setUserId] = useState("");
  const [companyName, setCompanyName] = useState("Company Attendance");

  const [attendances, setAttendances] = useState<Attendance[]>([]);

  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const [printDate, setPrintDate] = useState<string | null>(null);

  const [selectedReport, setSelectedReport] = useState<Attendance | null>(null);
  const [approveTarget, setApproveTarget] = useState<Attendance | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Attendance | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [approvalLoading, setApprovalLoading] = useState(false);

  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // =========================================================
  // LOAD DATA
  // =========================================================

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login");
          return;
        }

        setUserId(user.id);

        // ---- profile user yang login (+ nama perusahaan)
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, role, company_id, full_name, companies(name)")
          .eq("id", user.id)
          .single();

        if (profileError || !profile) {
          console.error("Gagal mengambil profile:", profileError);
          return;
        }

        // ---- employee tidak boleh masuk
        if (profile.role === "employee") {
          router.replace("/dashboard");
          return;
        }

        setUserRole(profile.role);

        // Hanya username, email tidak ditampilkan.
        setUserName(
          profile.full_name || user.email?.split("@")[0] || "User"
        );

        const company: any = (profile as any).companies;
        const name = Array.isArray(company) ? company[0]?.name : company?.name;

        if (name) setCompanyName(name);

        // ---- karyawan dalam company
        const { data: employees, error: employeeError } = await supabase
          .from("profiles")
          .select("id, full_name, division")
          .eq("company_id", profile.company_id);

        if (employeeError) {
          console.error("Gagal mengambil karyawan:", employeeError.message);
          return;
        }

        const employeeIds = employees?.map((employee) => employee.id) || [];

        if (!employeeIds.length) {
          setAttendances([]);
          return;
        }

        // ---- absensi
        const { data, error } = await supabase
          .from("attendance")
          .select(
            `
            id,
            profile_id,
            status,
            reason,
            check_in,
            check_out,
            created_at,
            approval_status,
            approved_by,
            approved_at,
            rejection_reason,
            photo_check_in,
            photo_check_out,
            latitude,
            longitude,
            latitude_out,
            longitude_out,
            task_list,
            task_count
          `
          )
          .in("profile_id", employeeIds)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Gagal mengambil absensi:", error.message);
          return;
        }

        // ---- gabung data profile
        const merged: Attendance[] = (data || []).map((item: any) => {
          const employee = employees?.find(
            (emp) => emp.id === item.profile_id
          );

          return {
            ...item,
            rejection_reason: item.rejection_reason || null,
            profiles: {
              full_name: employee?.full_name || "Unknown",
              division: employee?.division?.trim() || "Tanpa Divisi",
            },
          };
        });

        setAttendances(merged);
      } catch (error) {
        console.error("Terjadi kesalahan:", error);
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
  // MODAL: KUNCI SCROLL BODY & TUTUP DENGAN ESC
  // =========================================================

  const modalOpen = !!selectedReport || !!approveTarget || !!rejectTarget;

  useEffect(() => {
    if (!modalOpen) return;

    const previous = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !approvalLoading) {
        setSelectedReport(null);
        setApproveTarget(null);
        setRejectTarget(null);
      }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [modalOpen, approvalLoading]);

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // =========================================================
  // APPROVE
  // =========================================================

  const handleApprove = async () => {
    if (!approveTarget || approvalLoading) return;

    const target = approveTarget;

    try {
      setApprovalLoading(true);

      const approvedAt = new Date().toISOString();

      const { error } = await supabase
        .from("attendance")
        .update({
          approval_status: "approved",
          approved_by: userId,
          approved_at: approvedAt,
          rejection_reason: null,
        })
        .eq("id", target.id);

      if (error) throw error;

      setAttendances((prev) =>
        prev.map((item) =>
          item.id === target.id
            ? {
                ...item,
                approval_status: "approved",
                approved_by: userId,
                approved_at: approvedAt,
                rejection_reason: null,
              }
            : item
        )
      );

      setApproveTarget(null);

      setNotice({
        type: "success",
        text: `Absensi ${target.profiles?.full_name} disetujui.`,
      });
    } catch (error: any) {
      console.error("Approve error:", error);

      setNotice({
        type: "error",
        text: error?.message || "Terjadi kesalahan saat menyetujui absensi.",
      });
    } finally {
      setApprovalLoading(false);
    }
  };

  // =========================================================
  // REJECT
  // =========================================================

  const openRejectModal = (attendance: Attendance) => {
    if (approvalLoading) return;

    setRejectTarget(attendance);
    setRejectionReason("");
  };

  const closeRejectModal = () => {
    if (approvalLoading) return;

    setRejectTarget(null);
    setRejectionReason("");
  };

  const handleReject = async () => {
    if (!rejectTarget) return;

    const reason = rejectionReason.trim();

    if (!reason) {
      setNotice({ type: "error", text: "Alasan penolakan wajib diisi." });
      return;
    }

    const target = rejectTarget;

    try {
      setApprovalLoading(true);

      const approvedAt = new Date().toISOString();

      const { error } = await supabase
        .from("attendance")
        .update({
          approval_status: "rejected",
          approved_by: userId,
          approved_at: approvedAt,
          rejection_reason: reason,
        })
        .eq("id", target.id);

      if (error) throw error;

      setAttendances((prev) =>
        prev.map((item) =>
          item.id === target.id
            ? {
                ...item,
                approval_status: "rejected",
                approved_by: userId,
                approved_at: approvedAt,
                rejection_reason: reason,
              }
            : item
        )
      );

      setRejectTarget(null);
      setRejectionReason("");

      setNotice({
        type: "success",
        text: "Absensi ditolak dan alasan sudah disimpan.",
      });
    } catch (error: any) {
      console.error("Reject error:", error);

      setNotice({
        type: "error",
        text: error?.message || "Terjadi kesalahan saat menolak absensi.",
      });
    } finally {
      setApprovalLoading(false);
    }
  };

  // =========================================================
  // UNDUH LAPORAN PEKERJAAN (.TXT)
  // =========================================================

  const handleDownloadReport = (item: Attendance) => {
    const tasks = (item.task_list || []).filter((task) => task?.trim());

    const content = [
      "============================================================",
      "                 LAPORAN PEKERJAAN HARIAN",
      "============================================================",
      "",
      `Nama        : ${item.profiles?.full_name || "-"}`,
      `Divisi      : ${item.profiles?.division || "-"}`,
      `Tanggal     : ${formatDate(item.created_at)}`,
      `Jam Masuk   : ${formatTime(item.check_in)}`,
      `Jam Pulang  : ${formatTime(item.check_out)}`,
      `Status      : ${statusText(item.status)}`,
      `Approval    : ${APPROVAL[normalizeApproval(item.approval_status)].label}`,
      "",
      "------------------------------------------------------------",
      "PEKERJAAN YANG DISELESAIKAN",
      "------------------------------------------------------------",
      "",
      ...(tasks.length
        ? tasks.map(
            (task, index) => `[${String(index + 1).padStart(2, "0")}] ${task}`
          )
        : ["Belum ada laporan pekerjaan."]),
      "",
      "------------------------------------------------------------",
      "RINGKASAN",
      "------------------------------------------------------------",
      "",
      `Total pekerjaan : ${tasks.length} pekerjaan`,
      "",
      "============================================================",
      "          Company Attendance Management System",
      "============================================================",
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const safeName = (item.profiles?.full_name || "karyawan")
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .replace(/_+/g, "_");

    link.href = url;

    link.download = `Laporan_Pekerjaan_${safeName}_${new Date(item.created_at)
      .toISOString()
      .slice(0, 10)}.txt`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // =========================================================
  // CETAK / PDF
  // =========================================================

  const handlePrintPDF = (date: string) => {
    setPrintDate(date);

    setTimeout(() => {
      window.print();

      setTimeout(() => {
        setPrintDate(null);
      }, 300);
    }, 150);
  };

  // =========================================================
  // DATA TURUNAN
  // =========================================================

  const counts = useMemo(() => {
    const result = { all: attendances.length, pending: 0, approved: 0, rejected: 0 };

    attendances.forEach((item) => {
      result[normalizeApproval(item.approval_status)]++;
    });

    return result;
  }, [attendances]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return attendances.filter((item) => {
      if (filter !== "all" && normalizeApproval(item.approval_status) !== filter) {
        return false;
      }

      if (
        q &&
        !`${item.profiles?.full_name} ${item.profiles?.division}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }

      return true;
    });
  }, [attendances, filter, query]);

  const grouped = useMemo<GroupedData>(() => {
    const result: GroupedData = {};

    filtered.forEach((item) => {
      const date = formatDate(item.created_at);
      const division = item.profiles?.division || "Tanpa Divisi";

      if (!result[date]) result[date] = {};
      if (!result[date][division]) result[date][division] = [];

      result[date][division].push(item);
    });

    return result;
  }, [filtered]);

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
            Memuat data absensi...
          </p>
        </div>
      </main>
    );
  }

  const dates = Object.entries(grouped);
  const dashboardPath = getDashboardPath(userRole);
  const roleLabel =
    userRole === "owner" ? "Owner" : userRole === "admin" ? "Admin" : userRole;
  const barTotal = Math.max(counts.all, 1);

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main
      className={`${BASE} min-h-screen bg-[#F2F4F9] pb-16 text-slate-800 print:bg-white print:pb-0`}
    >
      {/* ================= TOAST ================= */}

      {notice && (
        <div
          role="status"
          className={`fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 z-[120] max-w-[90vw] -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg print:hidden ${
            notice.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* ================= HEADER ================= */}

      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur print:hidden">
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
              <p className="text-xs text-slate-500">Log absensi</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2.5 md:flex">
              <span className="max-w-[10rem] truncate text-sm font-semibold capitalize text-slate-700">
                {userName}
              </span>

              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                  userRole === "owner"
                    ? "bg-violet-50 text-violet-700 ring-violet-200"
                    : "bg-sky-50 text-sky-700 ring-sky-200"
                }`}
              >
                {roleLabel}
              </span>
            </div>

            <Link
              href={dashboardPath}
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

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-8 sm:pt-8 print:p-0">
        {/* ================= JUDUL CETAK ================= */}

        <div className="mb-5 hidden print:block">
          <h1 className="text-xl font-bold text-slate-900">{companyName}</h1>
          <p className="text-sm text-slate-600">
            Laporan absensi{printDate ? ` — ${printDate}` : ""}
          </p>
        </div>

        {/* ================= JUDUL & PENCARIAN ================= */}

        <section className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between print:hidden">
          <div>
            <h2
              className={`${D} text-3xl font-semibold text-slate-900 sm:text-4xl`}
            >
              Log absensi
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500">
              Pantau dan setujui absensi karyawan berdasarkan tanggal dan
              divisi.
            </p>
          </div>

          <label className="relative block w-full md:w-80">
            <span className="sr-only">Cari karyawan atau divisi</span>

            <Icon
              d={ICONS.search}
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama atau divisi"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-base text-slate-800 placeholder:text-slate-400 focus:border-[#0E1A3A] focus:outline-none focus:ring-2 focus:ring-[#0E1A3A]/15 sm:text-sm"
            />
          </label>
        </section>

        {/* ================= RINGKASAN & FILTER ================= */}

        <section className={`${card} mb-8 p-5 sm:p-6 print:hidden`}>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            {(["approved", "pending", "rejected"] as Approval[]).map(
              (key) =>
                counts[key] > 0 && (
                  <div
                    key={key}
                    title={`${APPROVAL[key].label}: ${counts[key]}`}
                    style={{
                      width: `${(counts[key] / barTotal) * 100}%`,
                      backgroundColor: APPROVAL[key].color,
                    }}
                  />
                )
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TILES.map((tile) => {
              const active = filter === tile.key;

              return (
                <button
                  key={tile.key}
                  onClick={() => setFilter(tile.key)}
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
                    {counts[tile.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ================= DAFTAR ================= */}

        {!dates.length ? (
          <section
            className={`${card} flex min-h-[320px] items-center justify-center border-dashed p-8 text-center`}
          >
            {counts.all === 0 ? (
              <div>
                <h3 className={`${D} text-xl font-semibold text-slate-800`}>
                  Belum ada data absensi
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Absensi karyawan akan muncul di sini setelah ada yang absen.
                </p>
              </div>
            ) : (
              <div>
                <h3 className={`${D} text-xl font-semibold text-slate-800`}>
                  Tidak ada hasil
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Coba ubah kata kunci atau pilih filter lain.
                </p>
                <button
                  onClick={() => {
                    setFilter("all");
                    setQuery("");
                  }}
                  className="mt-5 rounded-xl bg-[#0E1A3A] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a2a5a]"
                >
                  Reset filter
                </button>
              </div>
            )}
          </section>
        ) : (
          <div className="space-y-10">
            {dates.map(([date, divisions]) => {
              const hidden =
                printDate && printDate !== date ? "print:hidden" : "";

              const divisionEntries = Object.entries(divisions);

              const total = divisionEntries.reduce(
                (sum, [, items]) => sum + items.length,
                0
              );

              return (
                <section key={date} className={hidden}>
                  {/* HEADER TANGGAL */}

                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3
                        className={`${D} text-lg font-semibold capitalize text-slate-900 sm:text-xl`}
                      >
                        {date}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {total} absensi di {divisionEntries.length} divisi
                      </p>
                    </div>

                    <button
                      onClick={() => handlePrintPDF(date)}
                      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 print:hidden"
                    >
                      <Icon d={ICONS.print} />
                      Unduh PDF
                    </button>
                  </div>

                  {/* DIVISI */}

                  <div className="space-y-4">
                    {divisionEntries.map(([division, items]) => {
                      const present = items.filter(
                        (item) =>
                          item.status === "present" || item.status === "late"
                      ).length;

                      const pending = items.filter(
                        (item) =>
                          normalizeApproval(item.approval_status) === "pending"
                      ).length;

                      const rejected = items.filter(
                        (item) =>
                          normalizeApproval(item.approval_status) ===
                          "rejected"
                      ).length;

                      return (
                        <div
                          key={division}
                          className={`${card} overflow-hidden print:break-inside-avoid-page`}
                        >
                          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                            <div className="flex min-w-0 items-center gap-3">
                              <div
                                className={`${D} flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0E1A3A] text-sm font-semibold text-white`}
                              >
                                {initial(division)}
                              </div>

                              <div className="min-w-0">
                                <h4 className="truncate text-sm font-semibold text-slate-900">
                                  {division}
                                </h4>
                                <p className="text-xs text-slate-500">
                                  {items.length} absensi
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                {present} hadir
                              </span>

                              {pending > 0 && (
                                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                  {pending} menunggu
                                </span>
                              )}

                              {rejected > 0 && (
                                <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                                  {rejected} ditolak
                                </span>
                              )}
                            </div>
                          </div>

                          {/* JUDUL KOLOM (layar lebar saja) */}

                          <div
                            className={`att-grid hidden gap-x-4 border-b border-slate-100 bg-white px-5 py-2.5 text-xs font-semibold text-slate-400 lg:grid ${LG_COLS}`}
                          >
                            <span>Karyawan</span>
                            <span className="print:hidden">Foto</span>
                            <span>Waktu</span>
                            <span>Lokasi</span>
                            <span>Status</span>
                            <span className="print:hidden">Aksi</span>
                          </div>

                          <div className="divide-y divide-slate-100">
                            {items.map((item) => (
                              <AttendanceRow
                                key={item.id}
                                item={item}
                                busy={approvalLoading}
                                onReport={setSelectedReport}
                                onApprove={setApproveTarget}
                                onReject={openRejectModal}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= MODAL LAPORAN ================= */}

      {selectedReport && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4 print:hidden"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedReport(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
            className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-4 bg-[#0E1A3A] px-5 py-4 text-white sm:px-6 sm:py-5">
              <div className="min-w-0">
                <p className="text-xs text-slate-300">Laporan pekerjaan harian</p>

                <h3
                  id="report-title"
                  className={`${D} mt-0.5 break-words text-xl font-semibold`}
                >
                  {selectedReport.profiles?.full_name || "Karyawan"}
                </h3>

                <p className="text-sm text-slate-300">
                  {selectedReport.profiles?.division || "Tanpa Divisi"}
                </p>
              </div>

              <button
                onClick={() => setSelectedReport(null)}
                aria-label="Tutup"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/20"
              >
                <Icon d={ICONS.close} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">Tanggal</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {new Date(selectedReport.created_at).toLocaleDateString(
                      "id-ID",
                      { day: "numeric", month: "short", year: "numeric" }
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">Jam kerja</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-slate-800">
                    {formatTime(selectedReport.check_in)} –{" "}
                    {formatTime(selectedReport.check_out)}
                  </p>
                </div>

                <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:col-span-1">
                  <p className="text-xs text-slate-400">Total pekerjaan</p>
                  <p
                    className={`${D} mt-1 text-2xl font-semibold text-slate-900`}
                  >
                    {(selectedReport.task_list || []).length}
                    <span className="ml-1 text-sm font-medium text-slate-400">
                      tugas
                    </span>
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5">
                  <h4 className="text-sm font-semibold text-slate-800">
                    Pekerjaan yang diselesaikan
                  </h4>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Dilaporkan karyawan saat absen pulang.
                  </p>
                </div>

                <ol className="divide-y divide-slate-100">
                  {(selectedReport.task_list || []).length > 0 ? (
                    selectedReport.task_list!.map((task, index) => (
                      <li
                        key={`${selectedReport.id}-${index}`}
                        className="flex gap-3.5 px-5 py-3.5"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                          {index + 1}
                        </span>

                        <p className="min-w-0 break-words text-sm leading-relaxed text-slate-700">
                          {task}
                        </p>
                      </li>
                    ))
                  ) : (
                    <li className="px-5 py-10 text-center text-sm text-slate-400">
                      Belum ada pekerjaan yang dilaporkan.
                    </li>
                  )}
                </ol>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
              <button
                onClick={() => setSelectedReport(null)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Tutup
              </button>

              <button
                onClick={() => handleDownloadReport(selectedReport)}
                className="h-11 rounded-xl bg-[#0E1A3A] px-5 text-sm font-semibold text-white transition hover:bg-[#1a2a5a]"
              >
                Simpan sebagai .txt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL SETUJUI ================= */}

      {approveTarget && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4 print:hidden"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !approvalLoading) {
              setApproveTarget(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="approve-title"
            className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl"
          >
            <div className="p-5 sm:p-6">
              <h3
                id="approve-title"
                className={`${D} text-xl font-semibold text-slate-900`}
              >
                Setujui absensi?
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Absensi{" "}
                <span className="font-semibold text-slate-800">
                  {approveTarget.profiles?.full_name}
                </span>{" "}
                pada {formatDate(approveTarget.created_at)} akan ditandai
                disetujui.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
              <button
                onClick={() => setApproveTarget(null)}
                disabled={approvalLoading}
                className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Batal
              </button>

              <button
                onClick={handleApprove}
                disabled={approvalLoading}
                className="h-11 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {approvalLoading ? "Menyimpan..." : "Setujui"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL TOLAK ================= */}

      {rejectTarget && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4 print:hidden"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeRejectModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-title"
            className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h3
                  id="reject-title"
                  className={`${D} text-xl font-semibold text-slate-900`}
                >
                  Tolak absensi
                </h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  Alasan akan dilihat oleh karyawan.
                </p>
              </div>

              <button
                onClick={closeRejectModal}
                disabled={approvalLoading}
                aria-label="Tutup"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <Icon d={ICONS.close} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div
                  className={`${D} flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-semibold text-slate-600 ring-1 ring-slate-200`}
                >
                  {initial(rejectTarget.profiles?.full_name)}
                </div>

                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-slate-800">
                    {rejectTarget.profiles?.full_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(rejectTarget.created_at)}
                  </p>
                </div>
              </div>

              <label
                htmlFor="rejectionReason"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Alasan penolakan <span className="text-rose-500">*</span>
              </label>

              <textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                disabled={approvalLoading}
                rows={5}
                maxLength={500}
                placeholder="Contoh: Foto absensi kurang jelas. Silakan absen ulang."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-700 placeholder:text-slate-300 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100 disabled:bg-slate-50 sm:text-sm"
              />

              <p className="mt-1 text-right text-xs text-slate-400">
                {rejectionReason.length} / 500
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
              <button
                onClick={closeRejectModal}
                disabled={approvalLoading}
                className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Batal
              </button>

              <button
                onClick={handleReject}
                disabled={approvalLoading || !rejectionReason.trim()}
                className="h-11 rounded-xl bg-rose-600 px-5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {approvalLoading ? "Menyimpan..." : "Tolak dan simpan alasan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= STYLE CETAK ================= */}

      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 10mm;
          }

          body,
          main {
            background: white !important;
          }

          /* Foto & Aksi disembunyikan, sisakan 4 kolom */
          .att-grid {
            grid-template-columns:
              minmax(0, 1.6fr) minmax(0, 0.9fr) minmax(0, 1.1fr)
              minmax(0, 1.2fr) !important;
          }

          .att-row {
            break-inside: avoid;
          }
        }
      `}</style>
    </main>
  );
}
