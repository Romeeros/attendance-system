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
  const [showPassword, setShowPassword] = useState(false);
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

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <>
      {/* 
        Menambahkan custom style langsung di sini agar animasinya 
        langsung jalan tanpa perlu setting tailwind.config.ts 
      */}
      <style jsx global>{`
        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>

      <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-blue-100 p-4 sm:p-8 flex items-center justify-center">
        <div className="animate-fade-in-up w-full max-w-5xl overflow-hidden rounded-[2.5rem] bg-white/80 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] backdrop-blur-xl ring-1 ring-gray-100 lg:flex">
          
          {/* Left Side - Hidden on Mobile, Flex on Desktop */}
          <div className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 p-12 text-white lg:flex">
            {/* Dekorasi Background */}
            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-blue-500/30 blur-3xl"></div>
            <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl"></div>

            <div className="animate-float relative z-10 drop-shadow-2xl">
              <Image
                src="/login.png"
                alt="Login Illustration"
                width={400}
                height={400}
                priority
                className="object-contain"
              />
            </div>

            <div className="relative z-10 mt-10 text-center">
              <h2 className="text-3xl font-extrabold tracking-tight">
                Company Attendance
              </h2>
              <p className="mt-4 text-blue-100/80 max-w-sm text-lg">
                Kelola absensi karyawan dengan mudah, cepat, dan aman dari mana saja.
              </p>
            </div>
          </div>

          {/* Right Side - Form Login */}
          <div className="flex w-full flex-col justify-center p-8 sm:p-12 lg:w-1/2 lg:p-16">
            <div className="mx-auto w-full max-w-md">
              
              {/* Header Mobile (Muncul hanya di HP) */}
              <div className="mb-8 text-center lg:hidden">
                <h2 className="text-2xl font-extrabold text-blue-600">Company Attendance</h2>
              </div>

              <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                Welcome Back 👋
              </h1>
              <p className="mt-3 text-base text-gray-500">
                Silakan masuk ke akun Anda untuk melanjutkan.
              </p>

              {errorMessage && (
                <div className="mt-6 flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600 ring-1 ring-red-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleLogin} className="mt-8 space-y-5">
                {/* Email Input */}
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-semibold text-gray-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                    </div>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@company.com"
                      required
                      className="block w-full rounded-2xl border-0 bg-gray-50 py-3.5 pl-11 pr-4 text-gray-900 ring-1 ring-inset ring-gray-200 transition-all placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-semibold text-gray-700">
                    Password
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="block w-full rounded-2xl border-0 bg-gray-50 py-3.5 pl-11 pr-12 text-gray-900 ring-1 ring-inset ring-gray-200 transition-all placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    />
                    {/* Toggle Show/Hide Password */}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-blue-600"
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4.5 w-4.5 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                    />
                    Remember me
                  </label>
                  <Link href="#" className="text-sm font-semibold text-blue-600 hover:text-blue-500 hover:underline">
                    Forgot Password?
                  </Link>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative flex w-full justify-center rounded-2xl bg-blue-600 py-3.5 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-500 hover:shadow-blue-500/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </form>

              <div className="mt-10 text-center">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-blue-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Homepage
                </Link>
              </div>

            </div>
          </div>

        </div>
      </main>
    </>
  );
}