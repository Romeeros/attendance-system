import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <>
      <Navbar />

      <main className="flex min-h-[calc(100vh-64px)] items-center justify-center">
        <h2 className="text-4xl font-bold">
          Welcome to Attendance System
        </h2>
      </main>
    </>
  );
}