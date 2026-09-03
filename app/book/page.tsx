export const dynamic = "force-dynamic";

import { supabaseAdmin } from "@/lib/supabase-admin";
import BookingForm from "@/components/BookingForm";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{
    token?: string;
  }>;
}) {
  const { token } = await searchParams;

  const db = supabaseAdmin();

  const { data: services } = await db
    .from("services")
    .select(
      "id,name,description,price,duration_minutes,active,sort_order,service_variations(id,service_id,name,price_delta,duration_delta_minutes,active,sort_order)"
    )
    .eq("active", true)
    .order("sort_order", {
      ascending: true,
    });

  const { data: promos } = await db
    .from("promos")
    .select(
      "id,name,description,discount_type,discount_value,active"
    )
    .eq("active", true)
    .order("created_at", {
      ascending: false,
    });

  const { data: settings } = await db
    .from("site_settings")
    .select("key,value")
    .in("key", [
      "terms",
      "removal_options",
      "promo_options",
    ]);

  const map = Object.fromEntries(
    (settings || []).map((item) => [
      item.key,
      item.value,
    ])
  );

  let draft = null;

  if (token) {
    const { data: booking } = await db
      .from("bookings")
      .select(
        `
        id,
        reference_code,
        customer_name,
        email,
        mobile_number,
        social_handle,
        preferred_date,
        preferred_time,
        removal,
        promo_id,
        promo_name,
        discount_amount,
        discount_verified,
        discount_verified_at,
        discount_verified_by,
        estimated_total,
        down_payment,
        inspiration_count,
        notes,
        terms_accepted,
        status,
        access_token,
        cancellation_reason,
        cancellation_note,
        cancelled_at,
        booking_services(
          id,
          service_id,
          service_name,
          variation_name,
          price
        )
        `
      )
      .eq("access_token", token)
      .single();

    if (booking) {
      draft = booking;
    }
  }

  return (
    <BookingForm
      services={services || []}
      promos={promos || []}
      settings={map}
      draft={draft}
      draftToken={token || null}
    />
  );
}