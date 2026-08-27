"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Profile {
  id: string;
  full_name: string | null;
  created_at: string;
}

interface Attendance {
  id: string;
  profile_id: string;
  created_at: string;
  check_in: string | null;
  check_out: string | null;
  status: string | null;
  reason: string | null;
}

interface MonthOption {
  key: string;
  month: number;
  year: number;
  label: string;
}

type FilterStatus = "all" | "present" | "late" | "izin" | "sakit";

export default function MyAttendancePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<Attendance[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [selectedMonth, setSelectedMonth] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");

  // ============================================================
  // FETCH DATA
  // ============================================================

  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        // Ambil profile
        const { data: profileData, error: profileError } =
          await supabase
            .from("profiles")
            .select("id, full_name, created_at")
            .eq("id", user.id)
            .single();

        if (profileError || !profileData) {
          console.error("Profile tidak ditemukan:", profileError);
          setLoading(false);
          return;
        }

        setProfile(profileData);

        // Ambil seluruh attendance user
        const { data: attendanceData, error: attendanceError } =
          await supabase
            .from("attendance")
            .select(
              "id, profile_id, created_at, check_in, check_out, status, reason"
            )
            .eq("profile_id", user.id)
            .order("created_at", { ascending: false });

        if (attendanceError) {
          console.error(
            "Gagal mengambil attendance:",
            attendanceError
          );
        } else {
          setHistory(attendanceData || []);
        }

        // Default bulan sekarang
        const now = new Date();

        setSelectedMonth(
          `${now.getFullYear()}-${String(
            now.getMonth() + 1
          ).padStart(2, "0")}`
        );
      } catch (error) {
        console.error("Terjadi error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // ============================================================
  // DAFTAR BULAN
  // ============================================================

  const monthOptions = useMemo<MonthOption[]>(() => {
    const now = new Date();

    const months: MonthOption[] = [];

    // Tampilkan 12 bulan pada tahun berjalan
    for (let month = 0; month < 12; month++) {
      const date = new Date(now.getFullYear(), month, 1);

      months.push({
        key: `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`,
        month: date.getMonth(),
        year: date.getFullYear(),
        label: date.toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        }),
      });
    }

    return months;
  }, []);

  // ============================================================
  // BULAN TERPILIH
  // ============================================================

  const selectedMonthInfo = useMemo(() => {
    return monthOptions.find(
      (month) => month.key === selectedMonth
    );
  }, [monthOptions, selectedMonth]);

  // ============================================================
  // TANGGAL PEMBUATAN AKUN
  // ============================================================

  const accountCreatedDate = useMemo(() => {
    if (!profile?.created_at) return null;

    return new Date(profile.created_at);
  }, [profile]);

  // ============================================================
  // CEK BULAN
  // ============================================================

  const monthState = useMemo(() => {
    if (!selectedMonthInfo || !accountCreatedDate) {
      return "normal";
    }

    const selectedYear = selectedMonthInfo.year;
    const selectedMonthNumber = selectedMonthInfo.month;

    const createdYear = accountCreatedDate.getFullYear();
    const createdMonth = accountCreatedDate.getMonth();

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const selectedValue =
      selectedYear * 12 + selectedMonthNumber;

    const createdValue =
      createdYear * 12 + createdMonth;

    const currentValue =
      currentYear * 12 + currentMonth;

    // Sebelum akun dibuat
    if (selectedValue < createdValue) {
      return "before-account";
    }

    // Bulan yang belum terjadi
    if (selectedValue > currentValue) {
      return "future";
    }

    return "normal";
  }, [selectedMonthInfo, accountCreatedDate]);

  // ============================================================
  // FILTER DATA BERDASARKAN BULAN
  // ============================================================

  const monthlyHistory = useMemo(() => {
    if (!selectedMonthInfo) return [];

    return history.filter((item) => {
      const date = new Date(item.created_at);

      return (
        date.getFullYear() === selectedMonthInfo.year &&
        date.getMonth() === selectedMonthInfo.month
      );
    });
  }, [history, selectedMonthInfo]);

  // ============================================================
  // SEARCH + STATUS FILTER
  // ============================================================

  const filteredHistory = useMemo(() => {
    return monthlyHistory.filter((item) => {
      const matchesStatus =
        filter === "all" || item.status === filter;

      const date = new Date(item.created_at);

      const dateText = date.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const reasonText = item.reason || "";

      const searchText = search.toLowerCase().trim();

      const matchesSearch =
        !searchText ||
        dateText.toLowerCase().includes(searchText) ||
        reasonText.toLowerCase().includes(searchText) ||
        (item.status || "")
          .toLowerCase()
          .includes(searchText);

      return matchesStatus && matchesSearch;
    });
  }, [monthlyHistory, filter, search]);

  // ============================================================
  // STATISTIK BULAN
  // ============================================================

  const statistics = useMemo(() => {
    return {
      total: monthlyHistory.length,

      present: monthlyHistory.filter(
        (item) => item.status === "present"
      ).length,

      late: monthlyHistory.filter(
        (item) => item.status === "late"
      ).length,

      izin: monthlyHistory.filter(
        (item) => item.status === "izin"
      ).length,

      sakit: monthlyHistory.filter(
        (item) => item.status === "sakit"
      ).length,
    };
  }, [monthlyHistory]);

  // ============================================================
  // FORMAT
  // ============================================================

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "--:--";

    return new Date(dateString).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatMonth = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
  };

  const formatAccountCreated = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // ============================================================
  // STATUS
  // ============================================================

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case "present":
        return "Hadir";

      case "late":
        return "Terlambat";

      case "izin":
        return "Izin";

      case "sakit":
        return "Sakit";

      default:
        return status || "Tidak diketahui";
    }
  };

  const getStatusStyle = (status: string | null) => {
    switch (status) {
      case "present":
        return {
          wrapper:
            "border-emerald-200 bg-emerald-50 text-emerald-700",
          dot: "bg-emerald-500",
          icon: "✓",
        };

      case "late":
        return {
          wrapper:
            "border-amber-200 bg-amber-50 text-amber-700",
          dot: "bg-amber-500",
          icon: "!",
        };

      case "izin":
        return {
          wrapper:
            "border-violet-200 bg-violet-50 text-violet-700",
          dot: "bg-violet-500",
          icon: "↗",
        };

      case "sakit":
        return {
          wrapper:
            "border-orange-200 bg-orange-50 text-orange-700",
          dot: "bg-orange-500",
          icon: "+",
        };

      default:
        return {
          wrapper:
            "border-gray-200 bg-gray-50 text-gray-600",
          dot: "bg-gray-400",
          icon: "?",
        };
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f8fc]">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-100/50 blur-3xl" />

        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-emerald-100/50 blur-3xl" />

        <div className="relative flex flex-col items-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[28px] border border-gray-100 bg-white shadow-xl shadow-blue-100/60">
            <img
              src="/hero.png"
              alt="SVARA Innovation"
              className="h-14 w-auto object-contain"
            />
          </div>

          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />

          <p className="mt-4 text-sm font-semibold text-gray-500">
            Memuat riwayat absensi...
          </p>
        </div>
      </main>
    );
  }

  // ============================================================
  // MAIN
  // ============================================================

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f8fc]">
      {/* ====================================================== */}
      {/* BACKGROUND */}
      {/* ====================================================== */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-100/40 blur-3xl" />

        <div className="absolute right-[-180px] top-[30%] h-[450px] w-[450px] rounded-full bg-emerald-100/30 blur-3xl" />

        <div className="absolute bottom-[-200px] left-[20%] h-[400px] w-[400px] rounded-full bg-purple-100/20 blur-3xl" />
      </div>

      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <header className="sticky top-0 z-50 border-b border-gray-100/80 bg-white/85 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm">
              <img
                src="/svara.png"
                alt="SVARA"
                className="h-8 w-auto object-contain"
              />
            </div>

            <div className="hidden sm:block">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
                SVARA INNOVATION
              </p>

              <p className="text-sm font-extrabold text-gray-900">
                Employee Attendance
              </p>
            </div>
          </div>

          {/* User */}
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Employee
              </p>

              <p className="max-w-[180px] truncate text-sm font-extrabold text-gray-800">
                {profile?.full_name || "Employee"}
              </p>
            </div>

            <Link
              href="/dashboard"
              className="group flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold text-gray-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 sm:px-4"
            >
              <svg
                className="h-4 w-4 transition-transform group-hover:-translate-x-1"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>

              <span className="hidden sm:inline">
                Dashboard
              </span>

              <span className="sm:hidden">Kembali</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ====================================================== */}
      {/* CONTENT */}
      {/* ====================================================== */}

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        {/* ==================================================== */}
        {/* HERO */}
        {/* ==================================================== */}

        <section className="relative mb-6 overflow-hidden rounded-[30px] bg-gradient-to-br from-[#075bd4] via-[#1475df] to-[#079b83] p-6 text-white shadow-2xl shadow-blue-200/50 sm:p-8 lg:p-10">
          {/* Decoration */}
          <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full border-[35px] border-white/5" />

          <div className="absolute -bottom-40 right-20 h-72 w-72 rounded-full border-[50px] border-white/5" />

          <div className="absolute right-[35%] top-10 h-20 w-20 rounded-full bg-white/5 blur-2xl" />

          <div className="relative z-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-md">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />

                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/90">
                  Attendance History
                </span>
              </div>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                Riwayat
                <br className="sm:hidden" /> Absensiku
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
                Lihat catatan kehadiran kamu berdasarkan bulan.
                Semua riwayat absensi tersusun rapi dalam satu
                halaman.
              </p>

              {profile?.created_at && (
                <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-medium text-white/70 backdrop-blur-sm">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path
                      strokeLinecap="round"
                      d="M12 7v5l3 2"
                    />
                  </svg>

                  Bergabung sejak{" "}
                  <span className="font-bold text-white">
                    {formatAccountCreated(profile.created_at)}
                  </span>
                </div>
              )}
            </div>

            {/* Month selector */}
            <div className="w-full lg:max-w-[300px]">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.15em] text-white/60">
                  Pilih Periode
                </p>

                <div className="relative">
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      setFilter("all");
                      setSearch("");
                    }}
                    className="w-full appearance-none rounded-xl border border-white/15 bg-white px-4 py-3 pr-10 text-sm font-black text-gray-800 outline-none transition-all focus:ring-4 focus:ring-white/20"
                  >
                    {monthOptions.map((month) => {
                      const isFuture =
                        monthState === "future";

                      return (
                        <option
                          key={month.key}
                          value={month.key}
                        >
                          {month.label}
                        </option>
                      );
                    })}
                  </select>

                  <svg
                    className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 9l6 6 6-6"
                    />
                  </svg>
                </div>

                <p className="mt-3 text-[10px] font-medium text-white/50">
                  Pilih bulan untuk melihat riwayat
                  absensi.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* BEFORE ACCOUNT / FUTURE NOTICE */}
        {/* ==================================================== */}

        {monthState === "before-account" && (
          <section className="mb-6 overflow-hidden rounded-3xl border border-amber-100 bg-white shadow-lg shadow-gray-100/50">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path
                    strokeLinecap="round"
                    d="M12 7v5l3 2"
                  />
                </svg>
              </div>

              <div>
                <h3 className="font-extrabold text-gray-900">
                  Belum ada data pada bulan ini
                </h3>

                <p className="mt-1 text-sm leading-6 text-gray-500">
                  Akun kamu baru terdaftar pada{" "}
                  <strong className="text-gray-700">
                    {profile?.created_at
                      ? formatMonth(profile.created_at)
                      : "-"}
                  </strong>
                  . Oleh karena itu, absensi sebelum
                  tanggal tersebut memang kosong.
                </p>
              </div>
            </div>
          </section>
        )}

        {monthState === "future" && (
          <section className="mb-6 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-lg shadow-gray-100/50">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <rect
                    width="18"
                    height="18"
                    x="3"
                    y="3"
                    rx="2"
                  />
                  <path
                    strokeLinecap="round"
                    d="M16 2v4M8 2v4M3 10h18"
                  />
                </svg>
              </div>

              <div>
                <h3 className="font-extrabold text-gray-900">
                  Bulan belum berlangsung
                </h3>

                <p className="mt-1 text-sm leading-6 text-gray-500">
                  Riwayat absensi untuk bulan ini belum
                  tersedia karena bulan tersebut belum
                  berlangsung.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ==================================================== */}
        {/* STATISTICS */}
        {/* ==================================================== */}

        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Hadir"
            value={statistics.present}
            icon="check"
            percentage={
              statistics.total > 0
                ? (statistics.present /
                    statistics.total) *
                  100
                : 0
            }
            progressClass="bg-emerald-500"
            iconClass="bg-emerald-50 text-emerald-600"
          />

          <StatCard
            label="Terlambat"
            value={statistics.late}
            icon="clock"
            percentage={
              statistics.total > 0
                ? (statistics.late /
                    statistics.total) *
                  100
                : 0
            }
            progressClass="bg-amber-500"
            iconClass="bg-amber-50 text-amber-600"
          />

          <StatCard
            label="Izin"
            value={statistics.izin}
            icon="permission"
            percentage={
              statistics.total > 0
                ? (statistics.izin /
                    statistics.total) *
                  100
                : 0
            }
            progressClass="bg-violet-500"
            iconClass="bg-violet-50 text-violet-600"
          />

          <StatCard
            label="Sakit"
            value={statistics.sakit}
            icon="medical"
            percentage={
              statistics.total > 0
                ? (statistics.sakit /
                    statistics.total) *
                  100
                : 0
            }
            progressClass="bg-orange-500"
            iconClass="bg-orange-50 text-orange-600"
          />
        </section>

        {/* ==================================================== */}
        {/* HISTORY */}
        {/* ==================================================== */}

        <section className="overflow-hidden rounded-[28px] border border-gray-100 bg-white shadow-xl shadow-gray-200/40">
          {/* Header */}
          <div className="border-b border-gray-100 p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <rect
                        width="18"
                        height="18"
                        x="3"
                        y="3"
                        rx="2"
                      />

                      <path
                        strokeLinecap="round"
                        d="M8 2v4M16 2v4M3 10h18"
                      />
                    </svg>
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-gray-900">
                      {selectedMonthInfo?.label ||
                        "Riwayat Absensi"}
                    </h2>

                    <p className="text-xs font-medium text-gray-400">
                      {monthlyHistory.length} catatan pada
                      bulan ini
                    </p>
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="relative w-full lg:max-w-xs">
                <svg
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path
                    strokeLinecap="round"
                    d="M20 20l-4-4"
                  />
                </svg>

                <input
                  type="text"
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Cari absensi..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm font-medium text-gray-700 outline-none transition-all placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>

            {/* Filter */}
            <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
              <FilterButton
                active={filter === "all"}
                label="Semua"
                count={statistics.total}
                onClick={() => setFilter("all")}
              />

              <FilterButton
                active={filter === "present"}
                label="Hadir"
                count={statistics.present}
                onClick={() => setFilter("present")}
              />

              <FilterButton
                active={filter === "late"}
                label="Terlambat"
                count={statistics.late}
                onClick={() => setFilter("late")}
              />

              <FilterButton
                active={filter === "izin"}
                label="Izin"
                count={statistics.izin}
                onClick={() => setFilter("izin")}
              />

              <FilterButton
                active={filter === "sakit"}
                label="Sakit"
                count={statistics.sakit}
                onClick={() => setFilter("sakit")}
              />
            </div>
          </div>

          {/* ================================================= */}
          {/* EMPTY STATE */}
          {/* ================================================= */}

          {filteredHistory.length === 0 ? (
            <EmptyAttendance
              beforeAccount={monthState === "before-account"}
              future={monthState === "future"}
              hasSearch={search.length > 0}
              monthLabel={
                selectedMonthInfo?.label || ""
              }
            />
          ) : (
            <>
              {/* ================================================= */}
              {/* DESKTOP TABLE */}
              {/* ================================================= */}

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70">
                      <th className="whitespace-nowrap px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
                        Tanggal
                      </th>

                      <th className="whitespace-nowrap px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
                        Jam Masuk
                      </th>

                      <th className="whitespace-nowrap px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
                        Jam Pulang
                      </th>

                      <th className="whitespace-nowrap px-6 py-4 text-center text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
                        Status
                      </th>

                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
                        Keterangan
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-50">
                    {filteredHistory.map((item) => {
                      const statusStyle =
                        getStatusStyle(item.status);

                      const isSpecial =
                        item.status === "izin" ||
                        item.status === "sakit";

                      const date = new Date(
                        item.created_at
                      );

                      return (
                        <tr
                          key={item.id}
                          className="group transition-colors hover:bg-blue-50/30"
                        >
                          {/* Date */}
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <span className="text-[8px] font-black uppercase">
                                  {date.toLocaleDateString(
                                    "id-ID",
                                    {
                                      month: "short",
                                    }
                                  )}
                                </span>

                                <span className="text-base font-black leading-none">
                                  {date.getDate()}
                                </span>
                              </div>

                              <div>
                                <p className="text-sm font-bold text-gray-800">
                                  {date.toLocaleDateString(
                                    "id-ID",
                                    {
                                      weekday: "long",
                                    }
                                  )}
                                </p>

                                <p className="mt-0.5 text-xs text-gray-400">
                                  {date.toLocaleDateString(
                                    "id-ID",
                                    {
                                      month: "long",
                                      year: "numeric",
                                    }
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Check in */}
                          <td className="px-6 py-5">
                            {isSpecial ? (
                              <span className="text-xs font-medium text-gray-300">
                                Tidak tersedia
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                  <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle
                                      cx="12"
                                      cy="12"
                                      r="9"
                                    />

                                    <path
                                      strokeLinecap="round"
                                      d="M12 7v5l3 2"
                                    />
                                  </svg>
                                </div>

                                <span className="text-sm font-black text-blue-600">
                                  {formatTime(
                                    item.check_in
                                  )}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Check out */}
                          <td className="px-6 py-5">
                            {isSpecial ? (
                              <span className="text-xs font-medium text-gray-300">
                                Tidak tersedia
                              </span>
                            ) : item.check_out ? (
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
                                  <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      d="M12 3v18M8 17l4 4 4-4"
                                    />
                                  </svg>
                                </div>

                                <span className="text-sm font-black text-orange-500">
                                  {formatTime(
                                    item.check_out
                                  )}
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
                                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                                Belum Pulang
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-6 py-5 text-center">
                            <span
                              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-wider ${statusStyle.wrapper}`}
                            >
                              <span
                                className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] text-white ${statusStyle.dot}`}
                              >
                                {statusStyle.icon}
                              </span>

                              {getStatusLabel(
                                item.status
                              )}
                            </span>
                          </td>

                          {/* Reason */}
                          <td className="max-w-[300px] px-6 py-5">
                            {item.reason ? (
                              <p className="truncate text-xs font-medium italic text-gray-500">
                                "{item.reason}"
                              </p>
                            ) : (
                              <span className="text-xs text-gray-300">
                                Tidak ada keterangan
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ================================================= */}
              {/* MOBILE CARDS */}
              {/* ================================================= */}

              <div className="space-y-3 p-4 md:hidden">
                {filteredHistory.map((item) => {
                  const statusStyle =
                    getStatusStyle(item.status);

                  const isSpecial =
                    item.status === "izin" ||
                    item.status === "sakit";

                  const date = new Date(
                    item.created_at
                  );

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md"
                    >
                      {/* Card top */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <span className="text-[9px] font-black uppercase">
                              {date.toLocaleDateString(
                                "id-ID",
                                {
                                  month: "short",
                                }
                              )}
                            </span>

                            <span className="text-base font-black leading-none">
                              {date.getDate()}
                            </span>
                          </div>

                          <div>
                            <p className="text-sm font-extrabold text-gray-900">
                              {date.toLocaleDateString(
                                "id-ID",
                                {
                                  weekday: "long",
                                }
                              )}
                            </p>

                            <p className="mt-0.5 text-xs text-gray-400">
                              {date.toLocaleDateString(
                                "id-ID",
                                {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                }
                              )}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wide ${statusStyle.wrapper}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`}
                          />

                          {getStatusLabel(
                            item.status
                          )}
                        </span>
                      </div>

                      {/* Times */}
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-blue-50/70 p-3">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-blue-400">
                            Jam Masuk
                          </p>

                          <p className="mt-1 text-lg font-black text-blue-600">
                            {isSpecial
                              ? "--:--"
                              : formatTime(
                                  item.check_in
                                )}
                          </p>
                        </div>

                        <div
                          className={`rounded-xl p-3 ${
                            item.check_out ||
                            isSpecial
                              ? "bg-orange-50/70"
                              : "bg-red-50"
                          }`}
                        >
                          <p
                            className={`text-[9px] font-bold uppercase tracking-wider ${
                              item.check_out ||
                              isSpecial
                                ? "text-orange-400"
                                : "text-red-400"
                            }`}
                          >
                            Jam Pulang
                          </p>

                          {isSpecial ? (
                            <p className="mt-1 text-lg font-black text-gray-300">
                              --:--
                            </p>
                          ) : item.check_out ? (
                            <p className="mt-1 text-lg font-black text-orange-500">
                              {formatTime(
                                item.check_out
                              )}
                            </p>
                          ) : (
                            <p className="mt-1 text-xs font-black text-red-600">
                              Belum pulang
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Reason */}
                      {item.reason && (
                        <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                          <div className="flex gap-2">
                            <svg
                              className="mt-0.5 h-4 w-4 shrink-0 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                d="M8 10h8M8 14h5"
                              />

                              <rect
                                width="18"
                                height="16"
                                x="3"
                                y="4"
                                rx="2"
                              />
                            </svg>

                            <p className="text-xs leading-5 text-gray-500">
                              {item.reason}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Footer */}
          {filteredHistory.length > 0 && (
            <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4">
              <div className="flex flex-col gap-2 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Menampilkan{" "}
                  <span className="font-bold text-gray-600">
                    {filteredHistory.length}
                  </span>{" "}
                  dari{" "}
                  <span className="font-bold text-gray-600">
                    {monthlyHistory.length}
                  </span>{" "}
                  absensi
                </p>

                <p className="font-medium">
                  {selectedMonthInfo?.label}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ==================================================== */}
        {/* FOOTER */}
        {/* ==================================================== */}

        <div className="mt-6 flex flex-col items-center justify-between gap-3 px-1 text-center sm:flex-row sm:text-left">
          <p className="text-[11px] font-medium text-gray-400">
            © {new Date().getFullYear()} SVARA Innovation ·
            Employee Attendance System
          </p>

          <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Sistem aktif
          </div>
        </div>
      </div>
    </main>
  );
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  label,
  value,
  icon,
  percentage,
  progressClass,
  iconClass,
}: {
  label: string;
  value: number;
  icon: string;
  percentage: number;
  progressClass: string;
  iconClass: string;
}) {
  return (
    <div className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-gray-400">
            {label}
          </p>

          <p className="mt-1 text-2xl font-black text-gray-900 sm:text-3xl">
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon === "check" && (
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 12l4 4L19 6"
              />
            </svg>
          )}

          {icon === "clock" && (
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="9" />

              <path
                strokeLinecap="round"
                d="M12 7v5l3 2"
              />
            </svg>
          )}

          {icon === "permission" && (
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                d="M8 12h8M12 8v8"
              />

              <circle cx="12" cy="12" r="9" />
            </svg>
          )}

          {icon === "medical" && (
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                d="M12 8v8M8 12h8"
              />

              <circle cx="12" cy="12" r="9" />
            </svg>
          )}
        </div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${progressClass}`}
          style={{
            width: `${Math.min(percentage, 100)}%`,
          }}
        />
      </div>

      <p className="mt-2 text-[9px] font-semibold text-gray-400">
        {percentage.toFixed(0)}% dari total
      </p>
    </div>
  );
}

// ============================================================
// FILTER BUTTON
// ============================================================

function FilterButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
        active
          ? "bg-gray-900 text-white shadow-lg shadow-gray-200"
          : "border border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800"
      }`}
    >
      {label}

      <span
        className={`rounded-md px-1.5 py-0.5 text-[10px] ${
          active
            ? "bg-white/15 text-white"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================

function EmptyAttendance({
  beforeAccount,
  future,
  hasSearch,
  monthLabel,
}: {
  beforeAccount: boolean;
  future: boolean;
  hasSearch: boolean;
  monthLabel: string;
}) {
  let title = "Belum ada riwayat absensi";

  let description =
    `Belum ada catatan absensi pada ${monthLabel}.`;

  if (beforeAccount) {
    title = "Belum ada data absensi";

    description =
      "Pada bulan ini akun kamu belum terdaftar, sehingga tidak ada data absensi yang ditampilkan.";
  }

  if (future) {
    title = "Bulan belum tersedia";

    description =
      "Belum ada data absensi karena bulan yang dipilih belum berlangsung.";
  }

  if (hasSearch) {
    title = "Data tidak ditemukan";

    description =
      "Tidak ada riwayat yang cocok dengan pencarian kamu.";
  }

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center sm:py-20">
      <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-[28px] bg-gray-50">
        <div className="absolute inset-0 rounded-[28px] bg-blue-50 blur-xl" />

        <svg
          className="relative h-10 w-10 text-gray-300"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 13h6m-6 4h6m2 4H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />

          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 3v6h6"
          />
        </svg>
      </div>

      <h3 className="text-lg font-black text-gray-800">
        {title}
      </h3>

      <p className="mt-2 max-w-md text-xs leading-6 text-gray-400">
        {description}
      </p>
    </div>
  );
}