import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      name,
      email,
      password,
      role,
      company_id,
    } = body;

    if (!name || !email || !password || !role || !company_id) {
      return NextResponse.json(
        {
          error: "Semua data wajib diisi.",
        },
        { status: 400 }
      );
    }

    if (!["admin", "employee"].includes(role)) {
      return NextResponse.json(
        {
          error: "Role tidak valid.",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          error: "Password minimal 6 karakter.",
        },
        { status: 400 }
      );
    }

    // Buat akun di Supabase Auth
    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json(
        {
          error: authError.message,
        },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        {
          error: "Gagal membuat user.",
        },
        { status: 500 }
      );
    }

    // Simpan data ke profiles
    const {
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authData.user.id,
        company_id,
        full_name: name,
        email,
        role,
      });

    if (profileError) {
      // Jika profile gagal dibuat, hapus kembali user Auth
      await supabaseAdmin.auth.admin.deleteUser(
        authData.user.id
      );

      return NextResponse.json(
        {
          error: profileError.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User berhasil dibuat.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Terjadi kesalahan pada server.",
      },
      { status: 500 }
    );
  }
}