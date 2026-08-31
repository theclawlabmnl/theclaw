import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const date = new URL(req.url).searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });
  const db = supabaseAdmin();
  const d = new Date(`${date}T00:00:00`);
  const dow = d.getDay();

  const [{ data: rule }, { data: overrides }, { data: bookings }] = await Promise.all([
    db.from("availability_rules").select("*").eq("day_of_week", dow).eq("active", true).maybeSingle(),
    db.from("availability_overrides").select("*").eq("override_date", date),
    db.from("bookings").select("preferred_time").eq("preferred_date", date)
      .in("status", ["pending", "approved", "payment_submitted", "confirmed"])
  ]);

  return NextResponse.json({
    rule,
    overrides: overrides || [],
    booked: bookings || []
  });
}
