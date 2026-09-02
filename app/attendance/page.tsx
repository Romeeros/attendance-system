"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Attendance {
  id: string;
  profile_id: string;
  status: string | null;
  reason: string | null;
  check_in: string | null;
  check_out: string | null;
  created_at: string;
  approval_status: string | null;
  photo_check_in: string | null;
  photo_check_out: string | null;
  latitude: number | null;
  longitude: number | null;
  latitude_out: number | null;
  longitude_out: number | null;
  profiles: {
    full_name: string;
    division: string;
  };
}

type GroupedData = Record<string, Record<string, Attendance[]>>;

/* =========================
   HELPER
========================= */

const getDashboardPath = (role: string) => {
  if (role === "owner") return "/owner/dashboard";
  if (role === "admin") return "/admin/dashboard";
  return "/dashboard";
};

const statusText = (status: string | null): string => {
  if (!status) return "-";

  const labels: Record<string, string> = {
    present: "Hadir",
    late: "Telat",
    sakit: "Sakit",
    izin: "Izin",
    absent: "Alpa",
  };

  return (
    labels[status.toLowerCase()] ||
    status.charAt(0).toUpperCase() + status.slice(1)
  );
};

const formatTime = (value: string | null): string => {
  if (!value) return "--:--";

  return new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const initial = (name: string | null | undefined): string =>
  name?.trim()?.charAt(0)?.toUpperCase() || "?";

/* =========================
   PAGE
========================= */

export default function AttendancePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userId, setUserId] = useState("");
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [printDate, setPrintDate] = useState<string | null>(null);

  /* =========================
     LOAD DATA
  ========================= */

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

        setUserEmail(user.email || "");
        setUserId(user.id);

        /* PROFILE */
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, role, company_id")
          .eq("id", user.id)
          .single();

        if (profileError || !profile) {
          console.error("Gagal mengambil profile:", profileError);
          return;
        }

        /* EMPLOYEE TIDAK BOLEH MASUK HALAMAN INI */
        if (profile.role === "employee") {
          router.replace("/dashboard");
          return;
        }

        setUserRole(profile.role);

        /* =========================
           GET EMPLOYEES
        ========================= */

        const { data: employees, error: employeeError } = await supabase
          .from("profiles")
          .select("id, full_name, division")
          .eq("company_id", profile.company_id);

        if (employeeError) {
          console.error(
            "Gagal mengambil karyawan:",
            employeeError.message
          );
          return;
        }

        const employeeIds = employees?.map((employee) => employee.id) || [];

        if (!employeeIds.length) {
          setAttendances([]);
          return;
        }

        /* =========================
           GET ATTENDANCE
        ========================= */

        const { data, error } = await supabase
          .from("attendance")
          .select(`
            id,
            profile_id,
            status,
            reason,
            check_in,
            check_out,
            created_at,
            approval_status,
            photo_check_in,
            photo_check_out,
            latitude,
            longitude,
            latitude_out,
            longitude_out
          `)
          .in("profile_id", employeeIds)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Gagal mengambil absensi:", error.message);
          return;
        }

        /* GABUNGKAN DENGAN DATA PROFILE */
        const merged: Attendance[] = (data || []).map((item) => {
          const employee = employees?.find(
            (employee) => employee.id === item.profile_id
          );

          return {
            ...item,
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

  /* =========================
     APPROVAL
  ========================= */

  const handleApproval = async (
    id: string,
    newStatus: "approved" | "rejected"
  ) => {
    const action =
      newStatus === "approved" ? "APPROVE" : "REJECT";

    if (!confirm(`Apakah Anda yakin ingin ${action} absensi ini?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("attendance")
        .update({
          approval_status: newStatus,
          approved_by: userId,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      setAttendances((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                approval_status: newStatus,
              }
            : item
        )
      );
    } catch (error) {
      console.error("Approval error:", error);
      alert("Terjadi kesalahan saat memproses data.");
    }
  };

  /* =========================
     PRINT
  ========================= */

  const handlePrintPDF = (date: string) => {
    setPrintDate(date);

    setTimeout(() => {
      window.print();

      setTimeout(() => {
        setPrintDate(null);
      }, 300);
    }, 150);
  };

  /* =========================
     GROUP DATA
  ========================= */

  const grouped = useMemo<GroupedData>(() => {
    const result: GroupedData = {};

    attendances.forEach((item) => {
      const date = new Date(item.created_at).toLocaleDateString(
        "id-ID",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      );

      const division =
        item.profiles?.division || "Tanpa Divisi";

      if (!result[date]) {
        result[date] = {};
      }

      if (!result[date][division]) {
        result[date][division] = [];
      }

      result[date][division].push(item);
    });

    return result;
  }, [attendances]);

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="text-sm font-bold text-slate-700">
            Memuat data absensi...
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Mohon tunggu sebentar
          </p>
        </div>
      </main>
    );
  }

  const dates = Object.entries(grouped);
  const dashboardPath = getDashboardPath(userRole);

  /* =========================
     UI
  ========================= */

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900 print:bg-white">

      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 sm:px-8">

          {/* LOGO */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-black text-white shadow-lg shadow-blue-100">
              A
            </div>

            <div>
              <h1 className="text-base font-black tracking-tight">
                Company Attendance
              </h1>

              <p className="text-[11px] font-medium text-slate-400">
                Attendance Management
              </p>
            </div>
          </div>

          {/* USER */}
          <div className="flex items-center gap-4">

            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-slate-700">
                {userEmail}
              </p>

              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-blue-600">
                {userRole}
              </p>
            </div>

            {/* ROLE BASED DASHBOARD */}
            <Link
              href={dashboardPath}
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            >
              ←
              <span className="hidden sm:inline">
                Dashboard
              </span>
            </Link>

          </div>
        </div>
      </header>

      {/* ================= CONTENT ================= */}
      <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-8 sm:py-9 print:p-0">

        {/* TITLE */}
        <section className="mb-7 print:hidden">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-600">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                Attendance Logs
              </div>

              <h2 className="text-3xl font-black tracking-tight text-slate-950">
                Riwayat Absensi
              </h2>

              <p className="mt-1.5 text-sm font-medium text-slate-400">
                Pantau absensi karyawan berdasarkan tanggal dan divisi.
              </p>
            </div>

            {/* TOTAL */}
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Total Data
              </p>

              <p className="mt-0.5 text-xl font-black text-slate-900">
                {attendances.length}

                <span className="ml-1 text-xs font-bold text-slate-400">
                  absensi
                </span>
              </p>
            </div>

          </div>
        </section>

        {/* ================= EMPTY ================= */}
        {!dates.length ? (
          <section className="flex min-h-[450px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white">

            <div className="text-center">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-50 text-4xl">
                📭
              </div>

              <h3 className="text-xl font-black text-slate-700">
                Belum Ada Data Absensi
              </h3>

              <p className="mt-2 text-sm font-medium text-slate-400">
                Data absensi karyawan akan muncul di sini.
              </p>
            </div>

          </section>
        ) : (

          /* ================= DATE LIST ================= */
          <div className="space-y-10">

            {dates.map(([date, divisions]) => {

              const hidden =
                printDate && printDate !== date
                  ? "print:hidden"
                  : "";

              const divisionEntries =
                Object.entries(divisions);

              return (
                <section
                  key={date}
                  className={hidden}
                >

                  {/* DATE HEADER */}
                  <div className="mb-4 flex items-center justify-between">

                    <div className="flex items-center gap-3">

                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-lg shadow-lg shadow-blue-100">
                        📅
                      </div>

                      <div>
                        <h3 className="text-lg font-black capitalize text-slate-900 sm:text-xl">
                          {date}
                        </h3>

                        <p className="text-xs font-medium text-slate-400">
                          {divisionEntries.length} divisi
                        </p>
                      </div>

                    </div>

                    {/* PRINT */}
                    <button
                      onClick={() => handlePrintPDF(date)}
                      className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-red-100 transition hover:-translate-y-0.5 hover:bg-red-600 active:scale-95 print:hidden"
                    >
                      📄

                      <span className="hidden sm:inline">
                        Download PDF
                      </span>
                    </button>

                  </div>

                  {/* ================= DIVISIONS ================= */}
                  <div className="space-y-5">

                    {divisionEntries.map(
                      ([division, items]) => {

                        const present = items.filter(
                          (item) =>
                            item.status === "present" ||
                            item.status === "late"
                        ).length;

                        const pending = items.filter(
                          (item) =>
                            item.approval_status === "pending"
                        ).length;

                        return (
                          <div
                            key={division}
                            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                          >

                            {/* DIVISION HEADER */}
                            <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

                              <div className="flex items-center gap-3">

                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-black text-white">
                                  {initial(division)}
                                </div>

                                <div>
                                  <h4 className="text-sm font-black text-slate-900">
                                    {division}
                                  </h4>

                                  <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                                    {items.length} karyawan
                                  </p>
                                </div>

                              </div>

                              <div className="flex items-center gap-2">

                                <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-black text-emerald-600">
                                  ✓ {present} HADIR
                                </span>

                                {pending > 0 && (
                                  <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10px] font-black text-amber-600">
                                    ⏳ {pending} PENDING
                                  </span>
                                )}

                              </div>

                            </div>

                            {/* ================= TABLE ================= */}
                            <div className="overflow-x-auto">

                              <table className="w-full min-w-[1050px] text-left">

                                <thead className="border-b border-slate-100 bg-white">
                                  <tr>

                                    {[
                                      "Employee",
                                      "Photo",
                                      "Time",
                                      "Location",
                                      "Status",
                                      "Approval",
                                      "Action",
                                    ].map((title) => (
                                      <th
                                        key={title}
                                        className={`px-5 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 ${
                                          title === "Status" ||
                                          title === "Approval"
                                            ? "text-center"
                                            : title === "Action"
                                            ? "text-right print:hidden"
                                            : ""
                                        }`}
                                      >
                                        {title}
                                      </th>
                                    ))}

                                  </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">

                                  {items.map((item) => {

                                    const noPhoto =
                                      item.status === "sakit" ||
                                      item.status === "izin";

                                    const status =
                                      statusText(item.status);

                                    const statusClass =
                                      item.status === "present"
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                                        : item.status === "late"
                                        ? "border-amber-200 bg-amber-50 text-amber-600"
                                        : item.status === "sakit"
                                        ? "border-orange-200 bg-orange-50 text-orange-600"
                                        : item.status === "izin"
                                        ? "border-violet-200 bg-violet-50 text-violet-600"
                                        : "border-rose-200 bg-rose-50 text-rose-600";

                                    const approvalClass =
                                      item.approval_status === "approved"
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                        : item.approval_status === "rejected"
                                        ? "border-rose-200 bg-rose-50 text-rose-600"
                                        : "border-amber-200 bg-amber-50 text-amber-600";

                                    return (
                                      <tr
                                        key={item.id}
                                        className="group transition hover:bg-slate-50/70 print:break-inside-avoid"
                                      >

                                        {/* EMPLOYEE */}
                                        <td className="px-5 py-4">
                                          <div className="flex items-center gap-3">

                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-black text-blue-600">
                                              {initial(
                                                item.profiles?.full_name
                                              )}
                                            </div>

                                            <div>
                                              <p className="text-sm font-black text-slate-800">
                                                {item.profiles?.full_name}
                                              </p>

                                              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                                {division}
                                              </p>
                                            </div>

                                          </div>
                                        </td>

                                        {/* PHOTO */}
                                        <td className="px-5 py-4 print:hidden">

                                          {noPhoto ? (
                                            <span className="text-[10px] italic font-medium text-slate-400">
                                              Tanpa Foto
                                            </span>
                                          ) : (
                                            <div className="flex items-center gap-2">

                                              {/* CHECK IN PHOTO */}
                                              {item.photo_check_in ? (
                                                <a
                                                  href={item.photo_check_in}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="group/photo relative block"
                                                >
                                                  <img
                                                    src={item.photo_check_in}
                                                    alt="Check In"
                                                    className="h-11 w-11 rounded-xl border-2 border-white object-cover shadow-sm transition group-hover/photo:scale-110"
                                                  />

                                                  <span className="absolute -bottom-1 -right-1 rounded-full bg-blue-600 px-1.5 py-0.5 text-[7px] font-black text-white ring-2 ring-white">
                                                    IN
                                                  </span>
                                                </a>
                                              ) : (
                                                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-[8px] font-bold text-slate-400">
                                                  No In
                                                </div>
                                              )}

                                              {/* CHECK OUT PHOTO */}
                                              {item.photo_check_out ? (
                                                <a
                                                  href={item.photo_check_out}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="group/photo relative block"
                                                >
                                                  <img
                                                    src={item.photo_check_out}
                                                    alt="Check Out"
                                                    className="h-11 w-11 rounded-xl border-2 border-white object-cover shadow-sm transition group-hover/photo:scale-110"
                                                  />

                                                  <span className="absolute -bottom-1 -right-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-[7px] font-black text-white ring-2 ring-white">
                                                    OUT
                                                  </span>
                                                </a>
                                              ) : (
                                                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-[8px] font-bold text-slate-400">
                                                  No Out
                                                </div>
                                              )}

                                            </div>
                                          )}

                                        </td>

                                        {/* TIME */}
                                        <td className="px-5 py-4">

                                          <div className="space-y-1.5">

                                            <div className="flex items-center gap-2">
                                              <span className="w-8 text-[9px] font-black text-slate-400">
                                                {noPhoto ? "JAM" : "IN"}
                                              </span>

                                              <span className="text-sm font-black text-blue-600">
                                                {formatTime(
                                                  item.check_in
                                                )}
                                              </span>
                                            </div>

                                            {!noPhoto && (
                                              <div className="flex items-center gap-2">

                                                <span className="w-8 text-[9px] font-black text-slate-400">
                                                  OUT
                                                </span>

                                                <span className="text-sm font-black text-orange-500">
                                                  {formatTime(
                                                    item.check_out
                                                  )}
                                                </span>

                                              </div>
                                            )}

                                          </div>

                                        </td>

                                        {/* LOCATION */}
                                        <td className="px-5 py-4">

                                          {noPhoto ? (
                                            <div className="max-w-[200px]">

                                              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                                Alasan {status}
                                              </p>

                                              <p className="mt-1 text-xs font-medium italic text-slate-600">
                                                {item.reason ||
                                                  "Tidak ada keterangan."}
                                              </p>

                                            </div>
                                          ) : (
                                            <div className="flex flex-col gap-1.5">

                                              {/* GPS IN */}
                                              {item.latitude != null &&
                                              item.longitude != null ? (
                                                <a
                                                  href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-600 transition hover:bg-blue-600 hover:text-white print:bg-transparent print:text-black"
                                                >
                                                  📍 Masuk
                                                </a>
                                              ) : (
                                                <span className="text-[9px] italic text-slate-400">
                                                  No GPS In
                                                </span>
                                              )}

                                              {/* GPS OUT */}
                                              {item.latitude_out != null &&
                                              item.longitude_out != null ? (
                                                <a
                                                  href={`https://www.google.com/maps?q=${item.latitude_out},${item.longitude_out}`}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-orange-50 px-2.5 py-1 text-[10px] font-black text-orange-600 transition hover:bg-orange-500 hover:text-white print:bg-transparent print:text-black"
                                                >
                                                  📍 Pulang
                                                </a>
                                              ) : (
                                                <span className="text-[9px] italic text-slate-400">
                                                  No GPS Out
                                                </span>
                                              )}

                                            </div>
                                          )}

                                        </td>

                                        {/* STATUS */}
                                        <td className="px-5 py-4 text-center">

                                          <span
                                            className={`inline-flex rounded-lg border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider ${statusClass}`}
                                          >
                                            {status}
                                          </span>

                                        </td>

                                        {/* APPROVAL */}
                                        <td className="px-5 py-4 text-center">

                                          <span
                                            className={`inline-flex rounded-lg border px-2.5 py-1.5 text-[9px] font-black ${approvalClass}`}
                                          >
                                            {item.approval_status ===
                                            "approved"
                                              ? "✓ Approved"
                                              : item.approval_status ===
                                                "rejected"
                                              ? "✕ Rejected"
                                              : "◷ Pending"}
                                          </span>

                                        </td>

                                        {/* ACTION */}
                                        <td className="px-5 py-4 text-right print:hidden">

                                          {item.approval_status ===
                                          "pending" ? (
                                            <div className="flex justify-end gap-1.5">

                                              <button
                                                onClick={() =>
                                                  handleApproval(
                                                    item.id,
                                                    "approved"
                                                  )
                                                }
                                                className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[10px] font-black text-emerald-600 transition hover:bg-emerald-50"
                                              >
                                                Approve
                                              </button>

                                              <button
                                                onClick={() =>
                                                  handleApproval(
                                                    item.id,
                                                    "rejected"
                                                  )
                                                }
                                                className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-[10px] font-black text-rose-600 transition hover:bg-rose-50"
                                              >
                                                Reject
                                              </button>

                                            </div>
                                          ) : (
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-300">
                                              Done
                                            </span>
                                          )}

                                        </td>

                                      </tr>
                                    );
                                  })}

                                </tbody>
                              </table>

                            </div>
                          </div>
                        );
                      }
                    )}

                  </div>
                </section>
              );
            })}

          </div>
        )}
      </div>

      {/* ================= PRINT STYLE ================= */}
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 10mm;
          }

          body {
            background: white !important;
          }

          header,
          button,
          input,
          .print\\:hidden {
            display: none !important;
          }

          main {
            background: white !important;
          }

          table {
            width: 100% !important;
          }

          tr {
            page-break-inside: avoid;
          }
        }
      `}</style>

    </main>
  );
}