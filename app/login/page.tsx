
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";

const getDashboardPath = (role: string) =>
  role === "owner" ? "/owner/dashboard" :
  role === "admin" ? "/admin/dashboard" : "/dashboard";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!active) return;
      if (!session?.user) {
        setChecking(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (!active) return;
      if (data?.role) router.replace(getDashboardPath(data.role));
      else setChecking(false);
    }

    checkSession();
    return () => { active = false; };
  }, [router]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error || !data.user) {
        setError(error?.message || "Gagal login.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile?.role) {
        await supabase.auth.signOut();
        setError("Profil pengguna tidak ditemukan.");
        return;
      }

      router.replace(getDashboardPath(profile.role));
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Memeriksa sesi login...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl sm:p-10">

        <div className="mb-8 text-center">
          <Link href="/">
            <Image src="/svara.png" alt="SVARA" width={150} height={50}
              priority className="mx-auto h-10 w-auto" />
          </Link>
          <h1 className="mt-7 text-3xl font-extrabold text-slate-900">
            Welcome Back
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Silakan masuk ke akun SVARA Anda.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-16 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-4 top-3 text-sm font-semibold text-blue-600"
              >
                {show ? "Sembunyi" : "Lihat"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3.5 font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Sign In →"}
          </button>
        </form>

        <div className="mt-7 border-t border-slate-100 pt-6 text-center">
          <Link href="/" className="text-sm font-semibold text-blue-600 hover:underline">
            ← Kembali ke Homepage
          </Link>
          <p className="mt-5 text-xs text-slate-400">
            © {new Date().getFullYear()} SVARA INNOVATION
          </p>
        </div>
      </div>
    </main>
  );
}
