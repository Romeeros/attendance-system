"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [employeeCount, setEmployeeCount] = useState(0);

  const attendance = [
    {
      name: "John Doe",
      status: "Present",
      time: "08:01",
    },
    {
      name: "Sarah",
      status: "Present",
      time: "08:05",
    },
    {
      name: "Michael",
      status: "Absent",
      time: "--:--",
    },
    {
      name: "Emma",
      status: "Late",
      time: "08:31",
    },
  ];

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) {
        await supabase.from("profiles").insert({
          id: user.id,
          full_name: user.email?.split("@")[0] ?? "Owner",
          email: user.email ?? "",
          role: "owner",
        });
      }

      const { count } = await supabase
        .from("profiles")
        .select("*", {
          count: "exact",
          head: true,
        });

      setEmployeeCount(count ?? 0);
      setLoading(false);
    };

    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-xl font-semibold text-blue-600">
        <div className="flex items-center gap-3">
          <svg className="h-6 w-6 animate-spin text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading Dashboard...
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <main className="min-h-screen bg-gray-50/50 pb-12">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-blue-600 sm:text-2xl">
                Company Attendance
              </h1>
              <p className="text-xs font-medium text-gray-400 sm:text-sm">Management Dashboard</p>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold text-gray-800">{userEmail}</p>
                <span className="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600">
                  Owner
                </span>
              </div>

              <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-md shadow-blue-500/20">
                {userEmail.charAt(0).toUpperCase()}
              </div>

              <button
                onClick={handleLogout}
                className="rounded-2xl bg-red-50 px-3.5 py-2 text-xs font-bold text-red-600 transition-all hover:bg-red-100 sm:text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Container */}
        <div className="animate-fade-in mx-auto max-w-7xl px-4 pt-8 sm:px-8">
          
          {/* Welcome Banner */}
          <div className="mb-8 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 sm:p-8 text-white shadow-xl shadow-blue-500/10">
            <h2 className="text-2xl font-extrabold sm:text-3xl">Welcome Back 👋</h2>
            <p className="mt-2 text-sm text-blue-100 sm:text-base">
              Berikut adalah ringkasan absensi harian perusahaan Anda untuk hari ini.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            
            {/* Card Employees */}
            <div className="group rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">Total Employees</p>
                <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="mt-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">
                {employeeCount}
              </h3>
            </div>

            {/* Card Present */}
            <div className="group rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">Present</p>
                <div className="rounded-xl bg-green-50 p-2.5 text-green-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="mt-4 text-3xl font-extrabold text-green-600 sm:text-4xl">
                0
              </h3>
            </div>

            {/* Card Late */}
            <div className="group rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">Late</p>
                <div className="rounded-xl bg-yellow-50 p-2.5 text-yellow-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="mt-4 text-3xl font-extrabold text-yellow-500 sm:text-4xl">
                0
              </h3>
            </div>

            {/* Card Absent */}
            <div className="group rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">Absent</p>
                <div className="rounded-xl bg-red-50 p-2.5 text-red-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="mt-4 text-3xl font-extrabold text-red-500 sm:text-4xl">
                0
              </h3>
            </div>

          </div>

          {/* Content Sections Grid */}
          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            
            {/* Recent Attendance Table/List */}
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2 sm:p-8">
              <h3 className="text-lg font-bold text-gray-900">
                Recent Attendance
              </h3>
              <p className="mt-1 text-xs text-gray-400 sm:text-sm">Aktivitas presensi karyawan hari ini.</p>

              <div className="mt-6 space-y-4">
                {attendance.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/50 p-4 transition-all hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-600">
                        {item.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">{item.name}</h4>
                        <p className="text-xs text-gray-400">Time: {item.time}</p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        item.status === "Present"
                          ? "bg-green-100 text-green-700"
                          : item.status === "Late"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Menu */}
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
              <h3 className="text-lg font-bold text-gray-900">
                Quick Menu
              </h3>
              <p className="mt-1 text-xs text-gray-400 sm:text-sm">Akses cepat fitur utama.</p>

              <div className="mt-6 space-y-3">
                <Link
                  href="/attendance"
                  className="flex w-full items-center justify-center rounded-2xl bg-blue-600 py-3.5 text-center text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-500"
                >
                  Take Attendance
                </Link>

                <button className="w-full rounded-2xl border border-gray-200 py-3.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50">
                  Employees List
                </button>

                <button className="w-full rounded-2xl border border-gray-200 py-3.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50">
                  Reports & Logs
                </button>

                <button className="w-full rounded-2xl border border-gray-200 py-3.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50">
                  Settings
                </button>
              </div>
            </div>

          </div>

        </div>
      </main>
    </>
  );
}