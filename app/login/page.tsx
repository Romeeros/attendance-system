"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-10">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-2">

          {/* Left Side */}
          <div className="hidden flex-col items-center justify-center bg-blue-600 p-10 text-white lg:flex">
            <Image
              src="/login.png"
              alt="Login Illustration"
              width={450}
              height={450}
              priority
            />

            <h2 className="mt-8 text-3xl font-bold">
              Company Attendance
            </h2>

            <p className="mt-4 text-center text-blue-100">
              Kelola absensi karyawan dengan mudah,
              cepat, dan aman di mana saja.
            </p>
          </div>

          {/* Right Side */}
          <div className="flex items-center justify-center p-8 md:p-14">
            <div className="w-full max-w-md">

              <h1 className="text-4xl font-bold text-gray-800">
                Welcome Back 👋
              </h1>

              <p className="mt-2 text-gray-500">
                Sign in to continue to Company Attendance.
              </p>

              {errorMessage && (
                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {errorMessage}
                </div>
              )}

              <form
                onSubmit={handleLogin}
                className="mt-10 space-y-6"
              >
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block font-medium text-gray-700"
                  >
                    Email
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@company.com"
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block font-medium text-gray-700"
                  >
                    Password
                  </label>

                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-blue-600"
                    />
                    Remember me
                  </label>

                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Loading..." : "Login"}
                </button>
              </form>

              <div className="mt-8 text-center">
                <Link
                  href="/"
                  className="text-sm text-gray-600 transition hover:text-blue-600"
                >
                  ← Back to Home
                </Link>
              </div>

            </div>
          </div>

        </div>
      </div>
    </main>
  );
}