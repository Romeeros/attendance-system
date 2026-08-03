import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-10">

        {/* Card Login */}
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

              {/* Form */}
              <form className="mt-10 space-y-6">

                {/* Email */}
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
                    placeholder="example@email.com"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                {/* Password */}
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
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                {/* Remember */}
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

                {/* Button */}
                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                  Login
                </button>

              </form>

              {/* Back */}
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