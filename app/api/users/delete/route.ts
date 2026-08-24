import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// KITA PASANG CCTV DISINI:
console.log("URL Terbaca:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ ADA" : "❌ KOSONG");
console.log("KUNCI SERVICE ROLE Terbaca:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ ADA" : "❌ KOSONG");

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID Karyawan tidak ditemukan di request" }, { status: 400 });
    }

    // 1. Hapus absensi
    const { error: attendanceError } = await supabaseAdmin
      .from("attendance")
      .delete()
      .eq("profile_id", id);

    if (attendanceError) {
      console.error("Error Absensi:", attendanceError);
      return NextResponse.json({ error: `Tabel Absensi: ${attendanceError.message}` }, { status: 500 });
    }

    // 2. Hapus profil
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", id);

    if (profileError) {
      console.error("Error Profil:", profileError);
      return NextResponse.json({ error: `Tabel Profil: ${profileError.message}` }, { status: 500 });
    }

    // 3. Hapus auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authError) {
      console.error("Error Auth:", authError);
      return NextResponse.json({ error: `Sistem Auth: ${authError.message}` }, { status: 500 });
    }

    return NextResponse.json({ message: "User berhasil dihapus permanen" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}