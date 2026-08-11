import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "User ID wajib diisi." }, { status: 400 });
    }

    // Gunakan Service Role Key untuk mendapatkan izin "Dewa" (Admin) menghapus user
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Hapus dari Supabase Auth (Otentikasi Utama)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 2. Hapus dari tabel profiles
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", id);

    if (profileError) {
      console.error("Gagal hapus profile:", profileError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}