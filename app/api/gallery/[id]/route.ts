import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const db = supabaseAdmin();

  const { data: photo, error } = await db
    .from("gallery")
    .select("image_path,active")
    .eq("id", id)
    .single();

  if (error || !photo || !photo.active) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.redirect(photo.image_path);
}