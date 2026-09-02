export const dynamic = "force-dynamic";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

import BookingForm from "@/components/BookingForm";

export default async function BookPage() {
  const db =
    supabaseAdmin();

  const {
    data: services,
  } =
    await db
      .from("services")
      .select(
        "id,name,description,price,duration_minutes,active,sort_order,service_variations(id,service_id,name,price_delta,duration_delta_minutes,active,sort_order)"
      )
      .eq(
        "active",
        true
      )
      .order(
        "sort_order",
        {
          ascending: true,
        }
      );

  const {
    data: promos,
  } =
    await db
      .from("promos")
      .select(
        "id,name,description,discount_type,discount_value,active"
      )
      .eq(
        "active",
        true
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

  const {
    data: settings,
  } =
    await db
      .from(
        "site_settings"
      )
      .select(
        "key,value"
      )
      .in(
        "key",
        [
          "terms",
          "removal_options",
          "promo_options",
        ]
      );

  const map =
    Object.fromEntries(
      (
        settings ||
        []
      ).map(
        (item) => [
          item.key,
          item.value,
        ]
      )
    );

  return (
    <BookingForm
      services={
        services || []
      }
      promos={
        promos || []
      }
      settings={map}
    />
  );
}