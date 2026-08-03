import Link from "next/link";

export default function DashboardPage() {
  const stats = [
    {
      title: "Employees",
      value: "120",
      color: "text-blue-600",
    },
    {
      title: "Present",
      value: "98",
      color: "text-green-600",
    },
    {
      title: "Late",
      value: "15",
      color: "text-yellow-500",
    },
    {
      title: "Absent",
      value: "7",
      color: "text-red-500",
    },
  ];

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

  return (
    <main className="min-h-screen bg-gray-100">

      {/* Header */}

      <header className="border-b bg-white shadow-sm">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">

          <div>

            <h1 className="text-2xl font-bold text-blue-600">
              Company Attendance
            </h1>

            <p className="text-sm text-gray-500">
              Dashboard
            </p>

          </div>

          <div className="flex items-center gap-4">

            <div className="text-right">

              <p className="font-semibold">
                Romeero
              </p>

              <p className="text-sm text-gray-500">
                Administrator
              </p>

            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
              R
            </div>

          </div>

        </div>

      </header>

      <div className="mx-auto max-w-7xl px-8 py-10">

        <h2 className="text-3xl font-bold">
          Welcome Back 👋
        </h2>

        <p className="mt-2 text-gray-500">
          Here is today's attendance summary.
        </p>

        {/* Cards */}

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">

          {stats.map((item) => (

            <div
              key={item.title}
              className="rounded-2xl bg-white p-6 shadow transition hover:shadow-lg"
            >

              <p className="text-gray-500">
                {item.title}
              </p>

              <h2 className={`mt-2 text-4xl font-bold ${item.color}`}>
                {item.value}
              </h2>

            </div>

          ))}

        </div>

        {/* Attendance */}

        <div className="mt-10 grid gap-8 lg:grid-cols-3">

          <div className="rounded-2xl bg-white p-6 shadow lg:col-span-2">

            <h2 className="mb-6 text-xl font-bold">
              Recent Attendance
            </h2>

            <div className="space-y-4">

              {attendance.map((user) => (

                <div
                  key={user.name}
                  className="flex items-center justify-between rounded-xl border p-4"
                >

                  <div>

                    <h3 className="font-semibold">
                      {user.name}
                    </h3>

                    <p className="text-sm text-gray-500">
                      {user.time}
                    </p>

                  </div>

                  <span
                    className={`rounded-full px-4 py-1 text-sm font-semibold
                    ${
                      user.status === "Present"
                        ? "bg-green-100 text-green-700"
                        : user.status === "Late"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {user.status}
                  </span>

                </div>

              ))}

            </div>

          </div>

          {/* Quick Menu */}

          <div className="rounded-2xl bg-white p-6 shadow">

            <h2 className="mb-6 text-xl font-bold">
              Quick Menu
            </h2>

            <div className="space-y-4">

              <Link
                href="/attendance"
                className="block rounded-xl bg-blue-600 py-3 text-center font-semibold text-white transition hover:bg-blue-700"
              >
                Take Attendance
              </Link>

              <button className="w-full rounded-xl border py-3 font-semibold hover:bg-gray-50">
                Employees
              </button>

              <button className="w-full rounded-xl border py-3 font-semibold hover:bg-gray-50">
                Reports
              </button>

              <button className="w-full rounded-xl border py-3 font-semibold hover:bg-gray-50">
                Settings
              </button>

            </div>

          </div>

        </div>

      </div>

    </main>
  );
}