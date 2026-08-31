import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(req: NextRequest) {
  const s = await supabaseServer();
  const {
    data: { user },
  } = await s.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data: admin } = await db
    .from("admins")
    .select("id")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();

  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, status } = await req.json();

  if (!["verified", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Fetch the payment first so both booking_id and amount are available to TypeScript.
  const { data: payment, error: fetchError } = await db
    .from("payments")
    .select("id, booking_id, amount")
    .eq("id", id)
    .single();

  if (fetchError || !payment) {
    return NextResponse.json(
      { error: fetchError?.message || "Payment not found" },
      { status: 404 }
    );
  }

  const { error: updateError } = await db
    .from("payments")
    .update({
      status,
      verified_at: status === "verified" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (status === "verified") {
    const { error: bookingError } = await db
      .from("bookings")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        down_payment: payment.amount ?? 0,
      })
      .eq("id", payment.booking_id);

    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
