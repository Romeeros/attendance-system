import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, role, latitude, longitude, radius } = body;

    if (!id) {
      return NextResponse.json({ error: "User ID wajib diisi." }, { status: 400 });
    }

    // Gunakan Service Role Key untuk bypass keamanan dan update data user lain
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Update tabel profiles
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        role,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        radius: radius ? parseInt(radius) : 100,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}