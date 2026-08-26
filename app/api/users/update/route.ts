import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    // ✨ MENANGKAP VARIABEL 'password' DAN 'division' DARI FRONTEND
    const { id, role, latitude, longitude, radius, password, division } = body;

    if (!id) {
      return NextResponse.json({ error: "User ID wajib diisi." }, { status: 400 });
    }

    // Gunakan Service Role Key untuk bypass keamanan dan update data user lain
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Update tabel profiles (Lokasi, Role, dan Divisi)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        role,
        division, // ✨ Menyimpan data divisi ke dalam database
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        radius: radius ? parseInt(radius) : 100,
      })
      .eq("id", id);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    // 2. JIKA PASSWORD DIISI, UPDATE KE SISTEM AUTHENTICATION SUPABASE
    if (password && password.trim() !== "") {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
        password: password,
      });

      if (authError) {
        return NextResponse.json({ error: `Gagal ganti password: ${authError.message}` }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}