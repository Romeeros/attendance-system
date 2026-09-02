"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { supabase } from "@/lib/supabase";

export default function OwnerDashboardPage() {
  const router = useRouter();

  // =========================================================
  // STATE UMUM
  // =========================================================

  const [loading, setLoading] = useState(true);

  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
  const [companyName, setCompanyName] = useState(
    "Company Attendance"
  );
  const [userId, setUserId] = useState("");

  const [companyId, setCompanyId] = useState("");

  // =========================================================
  // STATE STATISTIK OWNER
  // =========================================================

  const [employeeCount, setEmployeeCount] = useState(0);

  const [presentCount, setPresentCount] = useState(0);

  const [lateCount, setLateCount] = useState(0);

  const [sickCount, setSickCount] = useState(0);

  const [leaveCount, setLeaveCount] = useState(0);

  const [absentCount, setAbsentCount] = useState(0);

  // =========================================================
  // STATE RIWAYAT ABSENSI
  // =========================================================

  const [recentAttendance, setRecentAttendance] =
    useState<any[]>([]);

  // =========================================================
  // STATE KARYAWAN BELUM ABSEN
  // =========================================================

  const [missingEmployees, setMissingEmployees] =
    useState<any[]>([]);

  // =========================================================
  // STATE HARI LIBUR
  // =========================================================

  const [inputHolidayDate, setInputHolidayDate] =
    useState("");

  const [inputHolidayDesc, setInputHolidayDesc] =
    useState("");

  const [isSettingHoliday, setIsSettingHoliday] =
    useState(false);

  // =========================================================
  // LOAD DASHBOARD
  // =========================================================

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        // -----------------------------------------------------
        // CEK LOGIN
        // -----------------------------------------------------

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        setUserEmail(user.email ?? "");

        setUserId(user.id);

        // -----------------------------------------------------
        // AMBIL PROFILE OWNER
        // -----------------------------------------------------

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("*, companies(name)")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
          console.error(
            "Profile Error:",
            profileError
          );
        }

        // -----------------------------------------------------
        // PROFILE TIDAK ADA
        // -----------------------------------------------------

        if (!profile) {
          alert(
            "Profile pengguna tidak ditemukan."
          );

          router.push("/login");

          return;
        }

        // -----------------------------------------------------
        // SIMPAN DATA OWNER
        // -----------------------------------------------------

        setUserRole(profile.role);

        setUserName(
          profile.full_name ||
            user.email?.split("@")[0] ||
            "Owner"
        );

        setCompanyId(
          profile.company_id || ""
        );

        // -----------------------------------------------------
        // NAMA PERUSAHAAN
        // -----------------------------------------------------

        if (profile.companies) {
          const companyData =
            profile.companies as any;

          setCompanyName(
            companyData.name ||
              "Company Attendance"
          );
        }

        // =====================================================
        // CEK ROLE
        // =====================================================

        if (profile.role !== "owner") {
          if (profile.role === "admin") {
            router.push(
              "/admin/dashboard"
            );
          } else {
            router.push("/dashboard");
          }

          return;
        }

        // =====================================================
        // OWNER HARUS MEMILIKI COMPANY
        // =====================================================

        if (!profile.company_id) {
          setLoading(false);
          return;
        }

        // =====================================================
        // TANGGAL HARI INI
        // =====================================================

        const todayStr = new Date()
          .toISOString()
          .split("T")[0];

        // =====================================================
        // AMBIL SEMUA PROFILE DALAM COMPANY
        // OWNER TIDAK DIHITUNG SEBAGAI KARYAWAN
        // =====================================================

        const {
          data: companyProfiles,
          error: companyProfilesError,
        } = await supabase
          .from("profiles")
          .select(
            "id, full_name, role, email"
          )
          .eq(
            "company_id",
            profile.company_id
          )
          .neq("role", "owner");

        if (companyProfilesError) {
          console.error(
            "Company Profiles Error:",
            companyProfilesError
          );

          setLoading(false);

          return;
        }

        // =====================================================
        // HITUNG TOTAL KARYAWAN
        // =====================================================

        const profileIds =
          companyProfiles?.map(
            (item) => item.id
          ) || [];

        const totalEmployees =
          profileIds.length;

        setEmployeeCount(
          totalEmployees
        );

        // =====================================================
        // VARIABEL STATISTIK
        // =====================================================

        let pCount = 0;

        let lCount = 0;

        let sCount = 0;

        let iCount = 0;

        let aCount = 0;

        // =====================================================
        // DEFAULT SEMUA KARYAWAN BELUM ABSEN
        // =====================================================

        let missing =
          companyProfiles || [];

        // =====================================================
        // JIKA ADA KARYAWAN
        // =====================================================

        if (profileIds.length > 0) {
          // ---------------------------------------------------
          // ABSENSI HARI INI
          // ---------------------------------------------------

          const {
            data: todayAttendance,
            error: todayAttendanceError,
          } = await supabase
            .from("attendance")
            .select(
              "profile_id, status"
            )
            .in(
              "profile_id",
              profileIds
            )
            .gte(
              "created_at",
              `${todayStr}T00:00:00Z`
            )
            .lte(
              "created_at",
              `${todayStr}T23:59:59Z`
            );

          if (todayAttendanceError) {
            console.error(
              "Today Attendance Error:",
              todayAttendanceError
            );
          }

          // ---------------------------------------------------
          // HITUNG STATUS
          // ---------------------------------------------------

          todayAttendance?.forEach(
            (attendance) => {
              if (
                attendance.status ===
                "present"
              ) {
                pCount++;
              }

              if (
                attendance.status ===
                "late"
              ) {
                lCount++;
              }

              if (
                attendance.status ===
                "sakit"
              ) {
                sCount++;
              }

              if (
                attendance.status ===
                "izin"
              ) {
                iCount++;
              }

              if (
                attendance.status ===
                "absent"
              ) {
                aCount++;
              }
            }
          );

          // ---------------------------------------------------
          // CARI ID YANG SUDAH ABSEN
          // ---------------------------------------------------

          const attendedProfileIds =
            todayAttendance?.map(
              (attendance) =>
                attendance.profile_id
            ) || [];

          // ---------------------------------------------------
          // KARYAWAN YANG BELUM ABSEN
          // ---------------------------------------------------

          missing = (
            companyProfiles || []
          ).filter(
            (employee) =>
              !attendedProfileIds.includes(
                employee.id
              )
          );

          // ---------------------------------------------------
          // RIWAYAT ABSENSI TERBARU
          // ---------------------------------------------------

          const {
            data: attendanceData,
            error: attendanceDataError,
          } = await supabase
            .from("attendance")
            .select(
              `
                id,
                profile_id,
                status,
                check_in,
                photo_check_in,
                created_at,
                latitude,
                longitude,
                latitude_out,
                longitude_out
              `
            )
            .in(
              "profile_id",
              profileIds
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            )
            .limit(5);

          if (attendanceDataError) {
            console.error(
              "Attendance Data Error:",
              attendanceDataError
            );
          }

          // ---------------------------------------------------
          // GABUNGKAN DENGAN PROFILE
          // ---------------------------------------------------

          const mergedRecent =
            attendanceData?.map(
              (attendance) => ({
                ...attendance,

                profiles: {
                  full_name:
                    companyProfiles?.find(
                      (employee) =>
                        employee.id ===
                        attendance.profile_id
                    )?.full_name ||
                    "Unknown",
                },
              })
            ) || [];

          setRecentAttendance(
            mergedRecent
          );
        }

        // =====================================================
        // SET STATISTIK
        // =====================================================

        setPresentCount(pCount);

        setLateCount(lCount);

        setSickCount(sCount);

        setLeaveCount(iCount);

        setAbsentCount(aCount);

        setMissingEmployees(
          missing
        );
      } catch (error) {
        console.error(
          "Owner Dashboard Error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [router]);

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = async () => {
    await supabase.auth.signOut();

    router.push("/login");
  };

  // =========================================================
  // SET HARI LIBUR
  // =========================================================

  const handleSetHoliday = async () => {
    if (
      !inputHolidayDate ||
      !inputHolidayDesc
    ) {
      alert(
        "Tanggal dan Keterangan libur harus diisi!"
      );

      return;
    }

    setIsSettingHoliday(true);

    try {
      const { error } =
        await supabase
          .from("holidays")
          .insert({
            date: inputHolidayDate,
            description:
              inputHolidayDesc,
          });

      if (error) {
        throw error;
      }

      alert(
        "✅ Hari libur berhasil ditambahkan!"
      );

      setInputHolidayDate("");

      setInputHolidayDesc("");

      window.location.reload();
    } catch (error: any) {
      console.error(error);

      alert(
        `❌ Gagal: ${error.message}`
      );
    }

    setIsSettingHoliday(false);
  };

  // =========================================================
  // DATA DONUT CHART
  // =========================================================

  const donutData = [
    {
      name: "Tepat Waktu",
      value: presentCount,
      color: "#10b981",
    },
    {
      name: "Terlambat",
      value: lateCount,
      color: "#eab308",
    },
    {
      name: "Sakit",
      value: sickCount,
      color: "#f97316",
    },
    {
      name: "Izin",
      value: leaveCount,
      color: "#9333ea",
    },
    {
      name: "Belum Absen",
      value:
        missingEmployees.length,
      color: "#f87171",
    },
  ];

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-3 text-4xl">
            ⏳
          </div>

          <p className="font-semibold text-blue-600">
            Loading Owner Dashboard...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // JIKA OWNER BELUM TERHUBUNG KE COMPANY
  // =========================================================

  if (!companyId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div className="mb-4 text-5xl">
            ⚠️
          </div>

          <h2 className="text-xl font-bold text-gray-800">
            Perusahaan Belum Terhubung
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Akun owner kamu belum memiliki
            perusahaan yang terhubung.
          </p>

          <button
            onClick={handleLogout}
            className="mt-6 rounded-xl bg-red-50 px-6 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100"
          >
            Logout
          </button>
        </div>
      </main>
    );
  }

  // =========================================================
  // TOTAL DATA ABSENSI
  // =========================================================

  const totalAttendanceData =
    presentCount +
    lateCount +
    sickCount +
    leaveCount;

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className="min-h-screen bg-gray-50/50 pb-12 font-sans">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8">

          {/* BRAND */}

          <div>
            <h1 className="text-xl font-extrabold text-blue-600">
              {companyName}
            </h1>

            <p className="text-xs font-medium text-gray-400">
              Owner Dashboard
            </p>
          </div>

          {/* USER */}

          <div className="flex items-center gap-4">

            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold capitalize text-gray-800">
                {userName}
              </p>

              <span className="mt-0.5 inline-block rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-purple-700 shadow-sm">
                Owner
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-8">

        {/* ===================================================
            STATISTIK UTAMA
        =================================================== */}

        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">

          {/* TOTAL KARYAWAN */}

          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
            <h3 className="text-3xl font-black text-gray-800">
              {employeeCount}
            </h3>

            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-500">
              Total Karyawan
            </p>
          </div>

          {/* TEPAT WAKTU */}

          <div className="rounded-3xl border border-green-100 bg-white p-5 shadow-sm transition hover:shadow-md">
            <h3 className="text-3xl font-black text-green-500">
              {presentCount}
            </h3>

            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-green-600">
              Tepat Waktu
            </p>
          </div>

          {/* TERLAMBAT */}

          <div className="rounded-3xl border border-yellow-100 bg-white p-5 shadow-sm transition hover:shadow-md">
            <h3 className="text-3xl font-black text-yellow-500">
              {lateCount}
            </h3>

            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-yellow-600">
              Terlambat
            </p>
          </div>

          {/* SAKIT */}

          <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm transition hover:shadow-md">
            <h3 className="text-3xl font-black text-orange-500">
              {sickCount}
            </h3>

            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-orange-600">
              Sakit
            </p>
          </div>

          {/* IZIN */}

          <div className="rounded-3xl border border-purple-100 bg-white p-5 shadow-sm transition hover:shadow-md">
            <h3 className="text-3xl font-black text-purple-500">
              {leaveCount}
            </h3>

            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-purple-600">
              Izin
            </p>
          </div>

          {/* BELUM ABSEN */}

          <div className="rounded-3xl border border-red-100 bg-white p-5 shadow-sm transition hover:shadow-md">
            <h3 className="text-3xl font-black text-red-400">
              {missingEmployees.length}
            </h3>

            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-red-500">
              Belum Absen
            </p>
          </div>
        </div>

        {/* ===================================================
            MAIN GRID
        =================================================== */}

        <div className="grid gap-8 lg:grid-cols-3">

          {/* =================================================
              KOLOM KIRI
          ================================================= */}

          <div className="space-y-8 lg:col-span-2">

            {/* =================================================
                REKAP BULANAN
            ================================================= */}

            <Link
              href="/rekap"
              className="mt-3 flex w-full items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 py-3.5 text-sm font-bold text-indigo-600 transition-all hover:-translate-y-0.5 hover:bg-indigo-100"
            >
              📊 Laporan Rekap Bulanan
            </Link>

            {/* =================================================
                STATISTIK KEHADIRAN
            ================================================= */}

            <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">

              <h3 className="text-xl font-bold text-gray-800">
                Statistik Kehadiran Hari Ini
              </h3>

              <p className="mb-6 text-sm text-gray-500">
                Proporsi seluruh status absensi
                karyawan hari ini.
              </p>

              <div className="flex flex-col items-center justify-between gap-8 sm:flex-row">

                {/* DONUT */}

                <div className="relative h-48 w-48">

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <PieChart>

                      <Pie
                        data={donutData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {donutData.map(
                          (
                            entry,
                            index
                          ) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                entry.color
                              }
                            />
                          )
                        )}
                      </Pie>

                      <Tooltip
                        formatter={(
                          value
                        ) => [
                          `${value} Karyawan`,
                          "Jumlah",
                        ]}
                        contentStyle={{
                          borderRadius:
                            "12px",
                          border: "none",
                          boxShadow:
                            "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />

                    </PieChart>
                  </ResponsiveContainer>

                  {/* CENTER */}

                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">

                    <span className="text-2xl font-black text-gray-800">
                      {
                        totalAttendanceData
                      }
                    </span>

                    <span className="text-[10px] font-bold uppercase text-gray-400">
                      Data Masuk
                    </span>

                  </div>
                </div>

                {/* LEGEND */}

                <div className="grid w-full flex-1 grid-cols-1 gap-3 sm:grid-cols-2">

                  {donutData.map(
                    (item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-3"
                      >

                        <div className="flex items-center gap-3">

                          <div
                            className="h-3 w-3 rounded-full"
                            style={{
                              backgroundColor:
                                item.color,
                            }}
                          />

                          <span className="text-sm font-bold text-gray-700">
                            {item.name}
                          </span>
                        </div>

                        <span className="text-sm font-black text-gray-900">
                          {item.value}

                          <span className="ml-1 text-[10px] font-medium text-gray-400">
                            Orang
                          </span>
                        </span>

                      </div>
                    )
                  )}

                </div>
              </div>
            </div>

            {/* =================================================
                RIWAYAT ABSENSI TERBARU
            ================================================= */}

            <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">

              <div className="mb-6 flex items-center justify-between gap-4">

                <h3 className="text-xl font-bold text-gray-800">
                  Riwayat Masuk Terbaru
                </h3>

                <Link
                  href="/attendance"
                  className="rounded-full bg-blue-50 px-4 py-1.5 text-xs font-bold text-blue-600 transition hover:bg-blue-100"
                >
                  Lihat Log Lengkap →
                </Link>

              </div>

              <div className="space-y-4">

                {recentAttendance.length ===
                0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
                    Belum ada data absensi
                    hari ini.
                  </div>
                ) : (
                  recentAttendance.map(
                    (item) => {

                      const timeStr =
                        item.check_in
                          ? new Date(
                              item.check_in
                            ).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute:
                                  "2-digit",
                              }
                            )
                          : "--:--";

                      return (
                        <div
                          key={item.id}
                          className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                        >

                          {/* INFO */}

                          <div className="flex items-center gap-4">

                            {/* FOTO */}

                            {item.photo_check_in ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={
                                  item.photo_check_in
                                }
                                alt="photo"
                                className="h-14 w-14 rounded-xl border border-gray-200 object-cover shadow-sm"
                              />
                            ) : (
                              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed bg-gray-100 text-xs font-bold text-gray-400">
                                No Pic
                              </div>
                            )}

                            {/* NAMA */}

                            <div>

                              <div className="text-base font-bold text-gray-900">
                                {
                                  item
                                    .profiles
                                    ?.full_name
                                }
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-2">

                                {/* JAM */}

                                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
                                  {item.status ===
                                    "sakit" ||
                                  item.status ===
                                    "izin"
                                    ? `Laporan: ${timeStr}`
                                    : `Masuk: ${timeStr}`}
                                </span>

                                {/* LOKASI MASUK */}

                                {item.latitude &&
                                  item.longitude && (
                                    <a
                                      href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-1 rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-500 hover:text-blue-700"
                                    >
                                      📍
                                      Lokasi
                                      Masuk
                                    </a>
                                  )}

                                {/* LOKASI PULANG */}

                                {item.latitude_out &&
                                  item.longitude_out && (
                                    <a
                                      href={`https://www.google.com/maps?q=${item.latitude_out},${item.longitude_out}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-1 rounded-md border border-orange-100 bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-500 hover:text-orange-700"
                                    >
                                      📍
                                      Lokasi
                                      Pulang
                                    </a>
                                  )}

                              </div>
                            </div>
                          </div>

                          {/* STATUS */}

                          <div className="self-end sm:self-auto">

                            <span
                              className={`rounded-xl border px-3 py-1.5 text-xs font-black uppercase tracking-wider ${
                                item.status ===
                                "present"
                                  ? "border-green-200 bg-green-50 text-green-600"
                                  : item.status ===
                                    "late"
                                  ? "border-yellow-200 bg-yellow-50 text-yellow-600"
                                  : item.status ===
                                    "sakit"
                                  ? "border-orange-200 bg-orange-50 text-orange-600"
                                  : item.status ===
                                    "izin"
                                  ? "border-purple-200 bg-purple-50 text-purple-600"
                                  : "border-gray-200 bg-gray-50 text-gray-600"
                              }`}
                            >
                              {
                                item.status
                              }
                            </span>

                          </div>

                        </div>
                      );
                    }
                  )
                )}

              </div>
            </div>
          </div>

          {/* =================================================
              KOLOM KANAN
          ================================================= */}

          <div className="flex flex-col gap-8">

            {/* =================================================
                QUICK ACTION
            ================================================= */}

            <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">

              <h3 className="text-xl font-bold text-gray-800">
                Quick Actions
              </h3>

              <p className="mb-6 text-sm text-gray-500">
                Menu navigasi cepat owner.
              </p>

              <div className="space-y-3">

                {/* APPROVE */}

                <Link
                  href="/attendance"
                  className="flex w-full items-center justify-center rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-200 transition-all hover:-translate-y-0.5 hover:bg-blue-700"
                >
                  Approve Attendances
                </Link>

                {/* EMPLOYEES */}

                <Link
                  href="/employees"
                  className="flex w-full items-center justify-center rounded-2xl border-2 border-gray-100 py-3.5 text-sm font-bold text-gray-700 transition-all hover:-translate-y-0.5 hover:bg-gray-50"
                >
                  Employees Directory
                </Link>

              </div>
            </div>

            {/* =================================================
                ATUR HARI LIBUR
            ================================================= */}

            <div className="rounded-3xl border border-indigo-50 bg-white p-8 shadow-sm">

              <div className="mb-6 flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-xl">
                  🏖️
                </div>

                <div>

                  <h3 className="text-lg font-bold text-indigo-600">
                    Atur Hari Libur
                  </h3>

                  <p className="text-xs font-medium text-gray-400">
                    Kunci form absensi
                    karyawan.
                  </p>

                </div>

              </div>

              <div className="space-y-3">

                {/* TANGGAL */}

                <input
                  type="date"
                  value={
                    inputHolidayDate
                  }
                  onChange={(e) =>
                    setInputHolidayDate(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-indigo-500 focus:outline-none"
                />

                {/* KETERANGAN */}

                <input
                  type="text"
                  placeholder="Keterangan (Cth: Libur Idul Fitri)"
                  value={
                    inputHolidayDesc
                  }
                  onChange={(e) =>
                    setInputHolidayDesc(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-indigo-500 focus:outline-none"
                />

                {/* BUTTON */}

                <button
                  onClick={
                    handleSetHoliday
                  }
                  disabled={
                    isSettingHoliday
                  }
                  className="mt-2 w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSettingHoliday
                    ? "Menyimpan..."
                    : "Simpan Hari Libur"}
                </button>

              </div>
            </div>

            {/* =================================================
                BELUM ABSEN
            ================================================= */}

            <div className="rounded-3xl border border-red-50 bg-white p-8 shadow-sm">

              <div className="mb-6 flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-xl">
                  ⚠️
                </div>

                <div>

                  <h3 className="text-lg font-bold text-red-500">
                    Belum Absen
                  </h3>

                  <p className="text-xs font-medium text-gray-400">
                    Harus ditegur nih!
                  </p>

                </div>

              </div>

              {/* LINK REKAP */}

              <Link
                href="/rekap-tidak-hadir"
                className="mt-3 flex w-full items-center justify-center rounded-2xl border border-red-100 bg-red-50 py-3.5 text-sm font-bold text-red-600 transition-all hover:-translate-y-0.5 hover:bg-red-100"
              >
                ⚠️ Rekap Belum Absen
                (Alpa)
              </Link>

              {/* LIST */}

              <div className="custom-scrollbar mt-6 max-h-[400px] space-y-3 overflow-y-auto pr-2">

                {missingEmployees.length ===
                0 ? (
                  <div className="rounded-2xl border border-green-100 bg-green-50 p-6 text-center">

                    <p className="mb-2 text-2xl">
                      🎉
                    </p>

                    <p className="text-sm font-bold text-green-700">
                      Luar biasa!
                    </p>

                    <p className="mt-1 text-xs text-green-600">
                      Semua karyawan sudah
                      absen hari ini.
                    </p>

                  </div>
                ) : (
                  missingEmployees.map(
                    (employee) => (
                      <div
                        key={
                          employee.id
                        }
                        className="group flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-4 transition hover:border-red-200 hover:bg-red-50/50"
                      >

                        <div className="flex items-center gap-3">

                          {/* INITIAL */}

                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-500 transition group-hover:bg-red-100 group-hover:text-red-500">
                            {employee.full_name?.charAt(
                              0
                            ) || "?"}
                          </div>

                          {/* NAMA */}

                          <span className="text-sm font-bold text-gray-700 transition group-hover:text-red-700">
                            {
                              employee.full_name
                            }
                          </span>

                        </div>

                      </div>
                    )
                  )
                )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}